-- Run once in a NEW Supabase project's SQL editor. Enable anonymous Auth separately.
create table public.rooms(id uuid primary key default gen_random_uuid(), code text unique not null default replace(gen_random_uuid()::text,'-',''), members uuid[] not null, state jsonb not null default '{"queue":[],"current":null,"playing":false,"position":0,"at":0,"messages":[]}', version bigint not null default 0, expires_at timestamptz not null default now()+interval '7 days');
alter table public.rooms enable row level security;
revoke all on public.rooms from anon, authenticated;
grant select on public.rooms to authenticated;
create policy member_read on public.rooms for select to authenticated using (auth.uid()=any(members) and expires_at>now());
create function public.open_room(invite text default null) returns public.rooms language plpgsql security definer set search_path=public as $$
declare r public.rooms;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if invite is null then insert into rooms(members) values(array[auth.uid()]) returning * into r;
 else
 select * into r from rooms where code=lower(trim(invite)) and expires_at>now() for update;
 if r.id is null then raise exception 'Room not found or expired'; end if;
 if not auth.uid()=any(r.members) then
 if cardinality(r.members)>=2 then raise exception 'This room already has two members'; end if;
 update rooms set members=array_append(members,auth.uid()) where id=r.id returning * into r;
 end if;
 end if;
 return r;
end $$;
create function public.save_room(room_id uuid, expected_version bigint, next_state jsonb) returns public.rooms language plpgsql security definer set search_path=public as $$
declare r public.rooms;
begin
 select * into r from rooms where id=room_id for update;
 if r.id is null or not auth.uid()=any(r.members) or r.expires_at<=now() then raise exception 'Room access denied'; end if;
 if r.version<>expected_version then raise exception 'CONFLICT'; end if;
 if pg_column_size(next_state)>200000 or jsonb_typeof(next_state->'queue')<>'array' or jsonb_array_length(next_state->'queue')>100 or jsonb_typeof(next_state->'messages')<>'array' or jsonb_array_length(next_state->'messages')>100 then raise exception 'Invalid room state'; end if;
 update rooms set state=next_state,version=version+1 where id=room_id returning * into r;
 return r;
end $$;
revoke all on function public.open_room(text) from public,anon;
revoke all on function public.save_room(uuid,bigint,jsonb) from public,anon;
grant execute on function public.open_room(text) to authenticated;
grant execute on function public.save_room(uuid,bigint,jsonb) to authenticated;
alter publication supabase_realtime add table public.rooms;
