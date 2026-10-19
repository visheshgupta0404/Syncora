-- Schedule shared playback commands 1500ms ahead; preserve room data.
begin;
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
 if kind in ('play', 'skip', 'previous', 'restart', 'transport') then
 stamp := greatest(floor(extract(epoch from clock_timestamp()) * 1000)::bigint + 1500, coalesce((s->>'at')::bigint, 0) + 1);
 end if;
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
 q := (select coalesce(jsonb_agg(v order by ord), '[]'::jsonb) from jsonb_array_elements(q) with ordinality a(v, ord)
 where v->>'key' <> item->>'key' and v->>'key' is distinct from s->'current'->>'key');
 q := jsonb_build_array(item) || q || case when s->'current' <> 'null'::jsonb and s->'current'->>'key' <> item->>'key' then jsonb_build_array(s->'current') else '[]'::jsonb end;
 s := s || jsonb_build_object('current', item, 'playing', true, 'position', 0, 'at', stamp);
 end if;
 elsif kind in ('skip', 'previous', 'restart') then
 if (p->>'key') is distinct from (s->'current'->>'key') then return r; end if;
 if p ? 'at' and (p->>'at') is distinct from (s->>'at') then return r; end if;
 if kind = 'skip' and s->'current' <> 'null'::jsonb and jsonb_array_length(q) > 1 then
 q := (select coalesce(jsonb_agg(v order by ord), '[]'::jsonb) from jsonb_array_elements(q) with ordinality a(v, ord) where v->>'key' <> s->'current'->>'key') || jsonb_build_array(s->'current');
 elsif kind = 'previous' and s->'current' <> 'null'::jsonb and jsonb_array_length(q) > 1 then
 q := jsonb_build_array(q->(jsonb_array_length(q)-1)) || (q - (jsonb_array_length(q)-1));
 end if;
 item := q->0;
 s := s || jsonb_build_object('current', coalesce(item, s->'current'), 'playing', item is not null and not (kind = 'skip' and s->'current' <> 'null'::jsonb and jsonb_array_length(q) = 1), 'position', 0, 'at', stamp);
 elsif kind = 'transport' then
 if s->'current' = 'null'::jsonb or (p->>'key') is distinct from (s->'current'->>'key') then return r; end if;
 if jsonb_typeof(p->'playing') is distinct from 'boolean' or jsonb_typeof(p->'position') is distinct from 'number'
 or (p->>'position')::numeric not between 0 and 604800 then raise exception 'Invalid playback command'; end if;
 s := s || jsonb_build_object('playing', p->'playing', 'position', least(604800, (p->>'position')::numeric + case when p->'seek' = 'true'::jsonb or s->'playing' <> 'true'::jsonb then 0 else greatest(0, stamp - floor(extract(epoch from clock_timestamp()) * 1000)) / 1000.0 end), 'at', stamp);
 elsif kind = 'chat' then
 perform check_room_limit('chat', 30);
 if jsonb_typeof(p) is distinct from 'object' or (p->>'text') is null
 or length(trim(p->>'text')) not between 1 and 500 or (p->>'name') is null
 or length(trim(p->>'name')) not between 1 and 30 then raise exception 'Invalid message'; end if;
 item := jsonb_build_object('id', command_id, 'sender', auth.uid(), 'name', trim(p->>'name'), 'text', trim(p->>'text'), 'at', stamp);
 s := jsonb_set(s, '{messages}', (s->'messages') || jsonb_build_array(item));
 if jsonb_array_length(s->'messages') > 100 then s := jsonb_set(s, '{messages}', (s->'messages') - 0); end if;
 else raise exception 'Unknown command'; end if;
 select ord::integer - 1 into idx from jsonb_array_elements(q) with ordinality a(v, ord) where v->>'key' = s->'current'->>'key';
 if idx > 0 then q := jsonb_build_array(q->idx) || (q - idx); end if;
 s := jsonb_set(s, '{queue}', q);
 update rooms set state = s, version = version + 1,
 recent_commands = (array_prepend(receipt, recent_commands))[1:2048]
 where id = room_id returning * into r;
 return r;
end $$;


commit;
