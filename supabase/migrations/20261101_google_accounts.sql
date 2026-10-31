begin;
create table if not exists public.account_libraries (
 owner_id uuid primary key, playlists jsonb not null default '[]', room_names jsonb not null default '{}', updated_at timestamptz not null default now()
);
alter table public.account_libraries enable row level security;
revoke all on public.account_libraries from public,anon,authenticated;
grant select on public.account_libraries to authenticated;
drop policy if exists own_library on public.account_libraries;
create policy own_library on public.account_libraries for select to authenticated using(owner_id=auth.uid() and auth.jwt()->>'is_anonymous'='false');
create table if not exists public.guest_account_transfers (
 guest_id uuid primary key, token_hash text unique not null, expires_at timestamptz not null, claimed_by uuid
);
alter table public.guest_account_transfers enable row level security;
revoke all on public.guest_account_transfers from public,anon,authenticated;
create or replace function public.prepare_guest_transfer(token text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or auth.jwt()->>'is_anonymous' is distinct from 'true' then raise exception 'A guest session is required'; end if;
 if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid transfer token'; end if;
 perform check_room_limit('prepare_transfer',5);
 delete from guest_account_transfers where expires_at<now();
 insert into guest_account_transfers values(auth.uid(),encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '30 minutes',null)
 on conflict(guest_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,claimed_by=null;
end $$;
create or replace function public.claim_guest_transfer(token text) returns void language plpgsql security definer set search_path=public as $$
declare transfer guest_account_transfers; r rooms; n integer;
begin
 if auth.uid() is null or auth.jwt()->>'is_anonymous' is distinct from 'false' then raise exception 'Sign in with Google first'; end if;
 if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid transfer token'; end if;
 perform check_room_limit('claim_transfer',10);
 select * into transfer from guest_account_transfers where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
 if transfer.guest_id is null or transfer.expires_at<=now() or (transfer.claimed_by is not null and transfer.claimed_by<>auth.uid()) then raise exception 'Guest transfer expired or unavailable'; end if;
 if transfer.claimed_by=auth.uid() then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select count(*) into n from rooms where expires_at>now() and (auth.uid()=any(members) or transfer.guest_id=any(members));
 if n>5 then raise exception 'Release a room first: accounts support five active rooms. Then retry importing guest rooms.'; end if;
 for r in select * from rooms where transfer.guest_id=any(members) and expires_at>now() order by id for update loop
  update rooms set members=(select array_agg(member order by first_position) from (select case when v=transfer.guest_id then auth.uid() else v end as member,min(ord) as first_position from unnest(r.members) with ordinality a(v,ord) group by 1) unique_members),version=version+1 where id=r.id;
 end loop;
 update guest_account_transfers set claimed_by=auth.uid() where guest_id=transfer.guest_id;
end $$;
create or replace function public.account_library(operation text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare library account_libraries; item jsonb; track jsonb; key text; room_key uuid;
begin
 if auth.uid() is null or auth.jwt()->>'is_anonymous' is distinct from 'false' then return jsonb_build_object('error','Sign in with Google to sync your library'); end if;
 if not consume_syncora_budget('account_library',120,60) then return jsonb_build_object('error','Too many library requests. Please wait a minute.'); end if;
 begin
 insert into account_libraries(owner_id) values(auth.uid()) on conflict do nothing;
 select * into library from account_libraries where owner_id=auth.uid() for update;
 if payload is null or jsonb_typeof(payload)<>'object' or pg_column_size(payload)>50000 then raise exception 'Invalid library request'; end if;
 if operation='save_playlist' then
  item:=payload; key:=item->>'id';
  if key is null or key !~ '^[A-Za-z0-9-]{1,64}$' or jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 40 or jsonb_typeof(item->'tracks') is distinct from 'array' then raise exception 'Invalid playlist'; end if;
  if jsonb_array_length(item->'tracks') not between 1 and 100 then raise exception 'Playlists need 1 to 100 videos'; end if;
  for track in select value from jsonb_array_elements(item->'tracks') loop
   if jsonb_typeof(track)<>'object' or jsonb_typeof(track->'id') is distinct from 'string' or track->>'id' !~ '^[A-Za-z0-9_-]{11}$' or jsonb_typeof(track->'title') is distinct from 'string' or length(trim(track->>'title')) not between 1 and 120 then raise exception 'Invalid playlist video'; end if;
  end loop;
  library.playlists:=(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(library.playlists) v where v->>'id'<>key);
  if jsonb_array_length(library.playlists)>=20 then raise exception 'You can save up to 20 playlists'; end if;
  item:=jsonb_build_object('id',key,'name',trim(item->>'name'),'tracks',(select jsonb_agg(jsonb_build_object('id',v->>'id','title',trim(v->>'title'))) from jsonb_array_elements(item->'tracks') v));
  library.playlists:=library.playlists||jsonb_build_array(item);
 elsif operation='delete_playlist' then
  library.playlists:=(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(library.playlists) v where v->>'id' is distinct from payload->>'id');
 elsif operation in ('name_room','hide_room') then
  room_key:=(payload->>'id')::uuid;
  if not exists(select 1 from rooms where id=room_key and auth.uid()=any(members) and expires_at>now()) then raise exception 'Room access denied or expired'; end if;
  if jsonb_typeof(payload->'name') is distinct from 'string' or length(trim(payload->>'name')) not between 1 and 40 then raise exception 'Room names need 1 to 40 characters'; end if;
  library.room_names:=jsonb_set(library.room_names,array[room_key::text],jsonb_build_object('name',trim(payload->>'name'),'hidden',operation='hide_room'));
 elsif operation<>'read' or operation is null then raise exception 'Unknown library operation'; end if;
 update account_libraries set playlists=library.playlists,room_names=library.room_names,updated_at=now() where owner_id=auth.uid();
 return jsonb_build_object('data',jsonb_build_object('playlists',library.playlists,'room_names',library.room_names));
 exception when others then return jsonb_build_object('error',SQLERRM); end;
end $$;
revoke all on function public.prepare_guest_transfer(text),public.claim_guest_transfer(text),public.account_library(text,jsonb) from public,anon;
grant execute on function public.prepare_guest_transfer(text),public.claim_guest_transfer(text),public.account_library(text,jsonb) to authenticated;
commit;
