-- Unified inbox for approved administrator accounts.
-- Message previews are short; full chats stay on their original platforms.
-- Browser clients have zero direct data access. Intake is worker-only.
create table public.evie_admin_inbox_threads (
 id uuid primary key default gen_random_uuid(),
 platform text not null check(platform in ('telegram','x','snapchat')),
 external_thread_id text not null check(char_length(external_thread_id) between 1 and 200),
 contact_name text not null check(char_length(contact_name) between 1 and 100),
 contact_handle text not null default '' check(char_length(contact_handle)<=80),
 origin text not null check(origin in ('worker','manual')),
 last_preview text not null default '' check(char_length(last_preview)<=280),
 last_message_at timestamptz not null default now(),
 last_inbound_at timestamptz,
 last_outbound_at timestamptz,
 last_direction text not null check(last_direction in ('inbound','outbound','manual')),
 reply_state text not null default 'needs_reply' check(reply_state in ('needs_reply','waiting','handled')),
 priority text not null default 'normal' check(priority in ('high','normal','low')),
 unread_count integer not null default 0 check(unread_count between 0 and 1000000),
 note text not null default '' check(char_length(note)<=600),
 source_verified boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(platform,external_thread_id)
);
create index evie_inbox_pending_idx
  on public.evie_admin_inbox_threads(reply_state,priority,last_message_at desc);
create index evie_inbox_recent_idx
  on public.evie_admin_inbox_threads(last_message_at desc);
alter table public.evie_admin_inbox_threads enable row level security;
revoke all on public.evie_admin_inbox_threads from public,anon,authenticated;
grant select,insert,update,delete on public.evie_admin_inbox_threads to service_role;
comment on table public.evie_admin_inbox_threads is
  'Owner-private follow-up queue. origin=manual is NOT verified as a live platform chat.';

create table public.evie_admin_inbox_event_keys (
 id bigint generated always as identity primary key,
 platform text not null check(platform in ('telegram','x','snapchat')),
 external_event_id text not null check(char_length(external_event_id) between 1 and 200),
 thread_id uuid not null references public.evie_admin_inbox_threads(id) on delete cascade,
 direction text not null check(direction in ('inbound','outbound')),
 occurred_at timestamptz not null,
 received_at timestamptz not null default now(),
 unique(platform,external_event_id)
);
create index evie_inbox_event_thread_idx on public.evie_admin_inbox_event_keys(thread_id,received_at desc);
alter table public.evie_admin_inbox_event_keys enable row level security;
revoke all on public.evie_admin_inbox_event_keys from public,anon,authenticated;
grant all on public.evie_admin_inbox_event_keys to service_role;
grant usage,select on sequence public.evie_admin_inbox_event_keys_id_seq to service_role;
comment on table public.evie_admin_inbox_event_keys is
  'Deduplication keys only. Message bodies are never stored in event log.';

-- Only the trusted Edge Function/service role can call this ingestion RPC.
-- Atomic de-duplication prevents a repeated webhook update from incrementing the queue.
create function public.evie_admin_inbox_ingest(
 p_platform text, p_thread_id text, p_event_id text, p_contact_name text,
 p_contact_handle text, p_direction text, p_preview text, p_occurred_at timestamptz
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare v_thread uuid; v_event bigint; v_latest_at timestamptz;
begin
 if p_platform not in ('telegram','x','snapchat')
  or p_direction not in ('inbound','outbound')
  or p_thread_id is null or char_length(p_thread_id) not between 1 and 200
  or p_event_id is null or char_length(p_event_id) not between 1 and 200
  or p_contact_name is null or char_length(p_contact_name) not between 1 and 100
  or p_contact_handle is null or char_length(p_contact_handle)>80
  or p_preview is null or char_length(p_preview)>280
  or p_occurred_at is null or p_occurred_at>now()+interval '5 minutes'
  or p_occurred_at<now()-interval '45 days'
 then raise exception 'Invalid inbox event'; end if;
 insert into public.evie_admin_inbox_threads
   (platform,external_thread_id,contact_name,contact_handle,origin,
    last_direction,last_preview,last_message_at,
    last_inbound_at,last_outbound_at,reply_state,unread_count,source_verified)
 values
   (p_platform,p_thread_id,p_contact_name,p_contact_handle,'worker',
    p_direction,p_preview,p_occurred_at,
    case when p_direction='inbound' then p_occurred_at end,
    case when p_direction='outbound' then p_occurred_at end,
    case when p_direction='inbound' then 'needs_reply' else 'waiting' end,
    case when p_direction='inbound' then 1 else 0 end,
    true)
 on conflict(platform,external_thread_id) do nothing;

 select id,last_message_at into v_thread,v_latest_at
 from public.evie_admin_inbox_threads
 where platform=p_platform and external_thread_id=p_thread_id
 for update;

 insert into public.evie_admin_inbox_event_keys
    (platform,external_event_id,thread_id,direction,occurred_at)
 values(p_platform,p_event_id,v_thread,p_direction,p_occurred_at)
 on conflict(platform,external_event_id) do nothing returning id into v_event;

 if v_event is null then
   return jsonb_build_object('accepted',true,'duplicate',true,'thread_id',v_thread);
 end if;

 -- Only a newer actual event changes the latest message and follow-up status.
 if p_occurred_at >= v_latest_at and
    p_direction in ('inbound','outbound') then
  update public.evie_admin_inbox_threads
  set contact_name=p_contact_name,
      contact_handle=p_contact_handle,
      last_preview=p_preview,
      last_message_at=p_occurred_at,
      last_direction=p_direction,
      last_inbound_at=case when p_direction='inbound' then p_occurred_at else last_inbound_at end,
      last_outbound_at=case when p_direction='outbound' then p_occurred_at else last_outbound_at end,
      reply_state=case when p_direction='inbound' then 'needs_reply' else 'waiting' end,
      unread_count=case when p_direction='inbound'
        then least(unread_count+case when v_latest_at=p_occurred_at and unread_count=1 then 0 else 1 end,1000000)
        else 0 end,
      source_verified=true, updated_at=now()
  where id=v_thread;
 end if;
 return jsonb_build_object('accepted',true,'duplicate',false,'thread_id',v_thread);
end;
$$;
revoke all on function public.evie_admin_inbox_ingest(text,text,text,text,text,text,text,timestamptz)
 from public,anon,authenticated;
grant execute on function public.evie_admin_inbox_ingest(text,text,text,text,text,text,text,timestamptz)
 to service_role;

-- A change sends only a record UUID, never a message snippet or handle.
create function public.evie_admin_inbox_change_signal()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 perform realtime.send(
   jsonb_build_object('thread_id',new.id::text),
   'inbox_changed',
   'evie-admin-inbox',
   true
 );
 return new;
end;
$$;
revoke all on function public.evie_admin_inbox_change_signal() from public,anon,authenticated;
create trigger evie_admin_inbox_broadcast
after insert or update on public.evie_admin_inbox_threads
for each row execute function public.evie_admin_inbox_change_signal();

-- Subscription allowed ONLY for JWTs identifying approved administrators.
-- These signals contain IDs only; actual inbox data still requires fresh
-- server-side admin role verification on every read.
create policy "Only Evie administrators receive private inbox changes"
on realtime.messages for select to authenticated
using (
  realtime.topic()='evie-admin-inbox'
  and (auth.jwt()->'app_metadata'->>'evie_admin')='true'
);
