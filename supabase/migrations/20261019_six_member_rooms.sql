-- Upgrade existing Syncora rooms to six members without changing room data.
begin;
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
 stamp := floor(extract(epoch from clock_timestamp()) * 1000);
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
 q := q - idx;
 if kind = 'move' then
 if jsonb_typeof(p->'to') is distinct from 'number' or (p->>'to') !~ '^\d{1,3}$'
 then raise exception 'Invalid queue position'; end if;
 dest := greatest(0, least((p->>'to')::integer, jsonb_array_length(q)));
 if dest = jsonb_array_length(q) then q := q || jsonb_build_array(item);
 else q := jsonb_insert(q, array[dest::text], item); end if;
 elsif kind = 'play' then
 s := s || jsonb_build_object('current', item, 'playing', true, 'position', 0, 'at', stamp);
 end if;
 elsif kind = 'skip' then
 if (p->>'key') is distinct from (s->'current'->>'key') then return r; end if;
 s := s || jsonb_build_object('current', q->0, 'playing', jsonb_array_length(q) > 0, 'position', 0, 'at', stamp);
 q := q - 0;
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

commit;
