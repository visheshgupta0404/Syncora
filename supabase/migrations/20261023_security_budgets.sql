-- Persistent abuse budgets: rejection responses commit counters rather than throwing.
begin;
create or replace function public.consume_syncora_budget(bucket_name text, maximum integer, seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 if auth.uid() is null then return false; end if;
 insert into room_limits as l values(auth.uid(), bucket_name, clock_timestamp(), 1)
 on conflict(actor,bucket) do update set
 hits = case when l.window_at <= clock_timestamp() - make_interval(secs => seconds) then 1 else least(l.hits + 1, maximum + 1) end,
 window_at = case when l.window_at <= clock_timestamp() - make_interval(secs => seconds) then clock_timestamp() else l.window_at end
 returning hits into n;
 return n <= maximum;
end $$;
revoke all on function public.consume_syncora_budget(text,integer,integer) from public,anon,authenticated;

create or replace function public.secure_room_request(operation text, invite text default null, room_id uuid default null, command_id uuid default null, action jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result public.rooms; n integer;
begin
 if auth.uid() is null then return jsonb_build_object('error','Sign in first'); end if;
 if operation not in ('open','action') or operation is null then return jsonb_build_object('error','Invalid operation'); end if;
 if not consume_syncora_budget('request:' || operation, case when operation='open' then 10 else 120 end,60)
 then return jsonb_build_object('error','Too many requests. Wait one minute and retry.'); end if;
 if operation='action' then
 if action is null or jsonb_typeof(action) is distinct from 'object' or pg_column_size(action)>4096
 or jsonb_typeof(action->'type') is distinct from 'string' or jsonb_typeof(action->'payload') is distinct from 'object'
 then return jsonb_build_object('error','Invalid command'); end if;
 if action->>'type'='add' and (jsonb_typeof(action->'payload'->'title') is distinct from 'string'
 or jsonb_typeof(action->'payload'->'id') is distinct from 'string' or jsonb_typeof(action->'payload'->'key') is distinct from 'string')
 then return jsonb_build_object('error','Invalid video'); end if;
 if action->>'type'='chat' and (jsonb_typeof(action->'payload'->'name') is distinct from 'string'
 or jsonb_typeof(action->'payload'->'text') is distinct from 'string')
 then return jsonb_build_object('error','Invalid message'); end if;
 end if;
 if operation='open' and invite is null then
 insert into search_budget as b values('rooms:day',clock_timestamp(),1)
 on conflict(scope) do update set
 hits=case when b.window_at<=clock_timestamp()-interval '1 day' then 1 else least(b.hits+1,201) end,
 window_at=case when b.window_at<=clock_timestamp()-interval '1 day' then clock_timestamp() else b.window_at end
 returning hits into n;
 if n>200 then return jsonb_build_object('error','Room creation daily limit reached. Try later or join an existing room.'); end if;
 end if;
 -- Only this inner block rolls back on invalid guesses/commands. Budget remains.
 begin
 if operation='open' then result := open_room(invite);
 else result := room_action(room_id,command_id,action); end if;
 return jsonb_build_object('data',to_jsonb(result));
 exception when raise_exception then return jsonb_build_object('error',SQLERRM);
 when others then return jsonb_build_object('error','Invalid request. Check your input and retry.');
 end;
end $$;
revoke all on function public.secure_room_request(text,text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.secure_room_request(text,text,uuid,uuid,jsonb) to authenticated;
revoke all on function public.open_room(text),public.room_action(uuid,uuid,jsonb) from public,anon,authenticated;

create table if not exists public.search_budget (
 scope text primary key, window_at timestamptz not null, hits integer not null
);
alter table public.search_budget enable row level security;
revoke all on public.search_budget from public,anon,authenticated;
create or replace function public.reserve_youtube_search()
returns jsonb language plpgsql security definer set search_path = public as $$
declare room uuid; n integer;
begin
 if auth.uid() is null then return jsonb_build_object('status',401); end if;
 if not consume_syncora_budget('search:minute',6,60) or not consume_syncora_budget('search:day',30,86400)
 then return jsonb_build_object('status',429); end if;
 select id into room from rooms where auth.uid()=any(members) and expires_at>now() order by id limit 1;
 if room is null then return jsonb_build_object('status',403); end if;
 -- Serialize all reservations before the shared Google quota can be spent.
 insert into search_budget as b values('youtube:day',clock_timestamp(),1)
 on conflict(scope) do update set
 hits=case when b.window_at<=clock_timestamp()-interval '1 day' then 1 else least(b.hits+1,81) end,
 window_at=case when b.window_at<=clock_timestamp()-interval '1 day' then clock_timestamp() else b.window_at end
 returning hits into n;
 if n>80 then return jsonb_build_object('status',429); end if;
 return jsonb_build_object('status',200);
end $$;
revoke all on function public.reserve_youtube_search() from public,anon;
grant execute on function public.reserve_youtube_search() to authenticated;
commit;
