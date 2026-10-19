-- Short room codes with preserved legacy invitations.
begin;
alter table public.rooms add column if not exists legacy_code text;
create unique index if not exists rooms_legacy_code_idx on public.rooms(legacy_code);
alter table public.rooms alter column code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
do $$
declare old_room record; attempts integer;
begin
 for old_room in select id, code from public.rooms where length(code) = 32 and legacy_code is null for update loop
 attempts := 0;
 loop
 begin
 update public.rooms set legacy_code = old_room.code, code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), version = version + 1 where id = old_room.id;
 exit;
 exception when unique_violation then
 attempts := attempts + 1;
 if attempts >= 5 then raise exception 'Could not shorten a room code. Retry migration.'; end if;
 end;
 end loop;
 end loop;
end $$;
create or replace function public.open_room(invite text default null)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r public.rooms; attempts integer := 0;
begin
 perform check_room_limit('open', 10);
 -- Opportunistic retention cleanup; admin Cron can also run cleanup_syncora.
 delete from rooms where expires_at <= now();
 delete from room_limits where window_at < now() - interval '1 day';
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 if invite is null then
 if (select count(*) from rooms where auth.uid() = any(members) and expires_at > now()) >= 5
 then raise exception 'You already have five active rooms. Leave one first.'; end if;
 loop
 begin
 insert into rooms(members) values(array[auth.uid()]) returning * into r;
 exit;
 exception when unique_violation then
 attempts := attempts + 1;
 if attempts >= 5 then raise exception 'Could not create a room. Please retry.'; end if;
 end;
 end loop;
 else
 invite := lower(replace(trim(invite), '-', ''));
 if invite !~ '^([a-f0-9]{10}|[a-f0-9]{32})$' then raise exception 'Invalid room code'; end if;
 select * into r from rooms where (code = invite or legacy_code = invite) and expires_at > now() for update;
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


commit;
