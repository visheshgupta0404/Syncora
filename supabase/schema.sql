-- Safe to rerun; upgrades milestone 1 without deleting existing rooms.
begin;
create table if not exists public.rooms (
 id uuid primary key default gen_random_uuid(),
 code text unique not null default replace(gen_random_uuid()::text, '-', ''),
 members uuid[] not null,
 state jsonb not null default '{"queue":[],"current":null,"playing":false,"position":0,"at":0,"messages":[]}',
 version bigint not null default 0,
 expires_at timestamptz not null default now() + interval '7 days'
);
alter table public.rooms add column if not exists recent_commands text[] not null default '{}';
create index if not exists rooms_expiry_idx on public.rooms(expires_at);
alter table public.rooms enable row level security;
revoke all on public.rooms from anon, authenticated;
grant select on public.rooms to authenticated;
drop policy if exists member_read on public.rooms;
create policy member_read on public.rooms for select to authenticated
 using (auth.uid() = any(members) and expires_at > now());
create table if not exists public.room_limits (
 actor uuid not null, bucket text not null, window_at timestamptz not null,
 hits integer not null, primary key(actor, bucket)
);
alter table public.room_limits enable row level security;
revoke all on public.room_limits from public, anon, authenticated;

create or replace function public.check_room_limit(bucket_name text, maximum integer)
returns void language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into room_limits as l values(auth.uid(), bucket_name, clock_timestamp(), 1)
 on conflict(actor, bucket) do update set
 hits = case when l.window_at < clock_timestamp() - interval '1 minute' then 1 else l.hits + 1 end,
 window_at = case when l.window_at < clock_timestamp() - interval '1 minute' then clock_timestamp() else l.window_at end
 returning hits into n;
 if n > maximum then raise exception 'Too many requests. Wait one minute and retry.'; end if;
end $$;
revoke all on function public.check_room_limit(text, integer) from public, anon, authenticated;

create or replace function public.open_room(invite text default null)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
 perform check_room_limit('open', 10);
 -- Opportunistic retention cleanup; admin Cron can also run cleanup_syncora.
 delete from rooms where expires_at <= now();
 delete from room_limits where window_at < now() - interval '1 day';
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 if invite is null then
 if (select count(*) from rooms where auth.uid() = any(members) and expires_at > now()) >= 5
 then raise exception 'You already have five active rooms. Leave one first.'; end if;
 insert into rooms(members) values(array[auth.uid()]) returning * into r;
 else
 if invite !~ '^[a-fA-F0-9]{32}$' then raise exception 'Invalid room code'; end if;
 select * into r from rooms where code = lower(invite) and expires_at > now() for update;
 if r.id is null then raise exception 'Room not found or expired'; end if;
 if not auth.uid() = any(r.members) then
 if cardinality(r.members) >= 6 then raise exception 'This room is full (maximum 6 people)'; end if;
 if (select count(*) from rooms where auth.uid() = any(members) and expires_at > now()) >= 5
 then raise exception 'You already have five active rooms. Leave one first.'; end if;
 update rooms set members = array_append(members, auth.uid()), version = version + 1
 where id = r.id returning * into r;
 end if;
 end if;
 return r;
end $$;

drop function if exists public.save_room(uuid, bigint, jsonb);
create or replace function public.room_action(room_id uuid, command_id uuid, action jsonb)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r public.rooms; s jsonb; q jsonb; p jsonb; item jsonb; kind text;
 idx integer; dest integer; stamp bigint; receipt text;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into r from rooms where id = room_id for update;
 if r.id is null or not auth.uid() = any(r.members) or r.expires_at <= now()
 then raise exception 'Room access denied or expired'; end if;
 if command_id is null then raise exception 'Missing command ID'; end if;
 receipt := auth.uid()::text || ':' || command_id::text;
 if receipt = any(r.recent_commands) then return r; end if;
 perform check_room_limit('action', 120);
 if action is null or jsonb_typeof(action) <> 'object' or pg_column_size(action) > 4096
 then raise exception 'Invalid command'; end if;
 kind := action->>'type'; p := action->'payload'; s := r.state; q := s->'queue';
 stamp := greatest(floor(extract(epoch from clock_timestamp()) * 1000)::bigint, coalesce((s->>'at')::bigint, 0) + 1);
 if kind = 'add' then
 if jsonb_typeof(p) is distinct from 'object' or (p->>'id') is null
 or (p->>'id') !~ '^[A-Za-z0-9_-]{11}$' or (p->>'key') is null
 or length(p->>'key') not between 1 and 64 or length(p->>'title') not between 1 and 120
 or (p->>'title') is null then raise exception 'Invalid video'; end if;
 if jsonb_array_length(q) >= 100 then raise exception 'Queue is full'; end if;
 if exists(select 1 from jsonb_array_elements(q) v where v->>'key' = p->>'key')
 or s->'current'->>'key' = p->>'key' then raise exception 'Duplicate queue item'; end if;
 q := q || jsonb_build_array(jsonb_build_object('key', p->>'key', 'id', p->>'id', 'title', p->>'title'));
 elsif kind in ('remove', 'move', 'play') then
 select ord::integer - 1, v into idx, item from jsonb_array_elements(q) with ordinality a(v, ord)
 where v->>'key' = p->>'key';
 if idx is null then return r; end if;
 if kind <> 'play' then q := q - idx; end if;
 if kind = 'remove' and s->'current'->>'key' = item->>'key' then
 s := s || jsonb_build_object('current', null, 'playing', false, 'position', 0, 'at', stamp);
 end if;
 if kind = 'move' then
 if jsonb_typeof(p->'to') is distinct from 'number' or (p->>'to') !~ '^\d{1,3}$'
 then raise exception 'Invalid queue position'; end if;
 dest := greatest(0, least((p->>'to')::integer, jsonb_array_length(q)));
 if dest = jsonb_array_length(q) then q := q || jsonb_build_array(item);
 else q := jsonb_insert(q, array[dest::text], item); end if;
 elsif kind = 'play' then
 s := s || jsonb_build_object('current', item, 'playing', true, 'position', 0, 'at', stamp);
 end if;
 elsif kind in ('skip', 'previous', 'restart') then
 if (p->>'key') is distinct from (s->'current'->>'key') then return r; end if;
 if p ? 'at' and (p->>'at') is distinct from (s->>'at') then return r; end if;
 select ord::integer - 1 into idx from jsonb_array_elements(q) with ordinality a(v, ord)
 where v->>'key' = s->'current'->>'key';
 dest := case when kind = 'restart' then 0 when kind = 'previous' then greatest(0, coalesce(idx, 0) - 1) else coalesce(idx, -1) + 1 end;
 item := q->dest;
 s := s || jsonb_build_object('current', coalesce(item, s->'current'), 'playing', item is not null, 'position', 0, 'at', stamp);
 elsif kind = 'transport' then
 if s->'current' = 'null'::jsonb or (p->>'key') is distinct from (s->'current'->>'key') then return r; end if;
 if jsonb_typeof(p->'playing') is distinct from 'boolean' or jsonb_typeof(p->'position') is distinct from 'number'
 or (p->>'position')::numeric not between 0 and 604800 then raise exception 'Invalid playback command'; end if;
 s := s || jsonb_build_object('playing', p->'playing', 'position', p->'position', 'at', stamp);
 elsif kind = 'chat' then
 perform check_room_limit('chat', 30);
 if jsonb_typeof(p) is distinct from 'object' or (p->>'text') is null
 or length(trim(p->>'text')) not between 1 and 500 or (p->>'name') is null
 or length(trim(p->>'name')) not between 1 and 30 then raise exception 'Invalid message'; end if;
 item := jsonb_build_object('id', command_id, 'sender', auth.uid(), 'name', trim(p->>'name'), 'text', trim(p->>'text'), 'at', stamp);
 s := jsonb_set(s, '{messages}', (s->'messages') || jsonb_build_array(item));
 if jsonb_array_length(s->'messages') > 100 then s := jsonb_set(s, '{messages}', (s->'messages') - 0); end if;
 else raise exception 'Unknown command'; end if;
 s := jsonb_set(s, '{queue}', q);
 update rooms set state = s, version = version + 1,
 recent_commands = (array_prepend(receipt, recent_commands))[1:2048]
 where id = room_id returning * into r;
 return r;
end $$;

create or replace function public.leave_room(room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 update rooms set members = array_remove(members, auth.uid()), version = version + 1
 where id = room_id and auth.uid() = any(members);
 delete from rooms where id = room_id and cardinality(members) = 0;
end $$;
create or replace function public.room_clock() returns double precision
language sql volatile set search_path = public as $$select extract(epoch from clock_timestamp()) * 1000$$;
create or replace function public.cleanup_syncora() returns void
language plpgsql security definer set search_path = public as $$
begin
 delete from rooms where expires_at <= now();
 delete from room_limits where window_at < now() - interval '1 day';
end $$;
revoke all on function public.cleanup_syncora() from public, anon, authenticated;
grant execute on function public.cleanup_syncora() to service_role;
revoke all on function public.open_room(text) from public, anon;
revoke all on function public.room_action(uuid, uuid, jsonb) from public, anon;
revoke all on function public.leave_room(uuid) from public, anon;
revoke all on function public.room_clock() from public, anon;
grant execute on function public.open_room(text), public.room_action(uuid, uuid, jsonb), public.leave_room(uuid), public.room_clock() to authenticated;
do $$begin
 if to_regclass('realtime.messages') is not null then
 execute 'drop policy if exists syncora_presence_read on realtime.messages';
 execute 'drop policy if exists syncora_presence_write on realtime.messages';
 execute $policy$create policy syncora_presence_read on realtime.messages for select to authenticated
 using (extension = 'presence' and exists(select 1 from public.rooms where id::text = split_part(realtime.topic(), ':', 2) and realtime.topic() = 'room:' || id::text and auth.uid() = any(members) and expires_at > now()))$policy$;
 execute $policy$create policy syncora_presence_write on realtime.messages for insert to authenticated
 with check (extension = 'presence' and exists(select 1 from public.rooms where id::text = split_part(realtime.topic(), ':', 2) and realtime.topic() = 'room:' || id::text and auth.uid() = any(members) and expires_at > now()))$policy$;
 end if;
 if exists(select 1 from pg_publication where pubname = 'supabase_realtime') and not exists(
 select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
 ) then alter publication supabase_realtime add table public.rooms; end if;
end $$;
commit;
