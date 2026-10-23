-- Private username login mapping and abuse prevention for Daddy Members.
-- Users REQUEST a social login identifier; only an administrator can APPROVE one.
-- No browser can read the mapping from a username to its Supabase Auth account.

create table if not exists public.evie_username_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform text not null check (platform in ('telegram','snapchat')),
  username text not null check (username ~ '^@?[A-Za-z0-9._-]{3,50}$'),
  normalized_username text generated always as (lower(ltrim(username,'@'))) stored,
  requested_at timestamptz not null default now()
);
create index if not exists evie_username_requests_lookup_idx
 on public.evie_username_requests(platform,normalized_username);
alter table public.evie_username_requests enable row level security;
revoke all on public.evie_username_requests from anon,authenticated;
grant select,insert on public.evie_username_requests to authenticated;
create policy "Member can see own username request"
 on public.evie_username_requests for select to authenticated
 using ((select auth.uid())=user_id);
create policy "Member can request own username once"
 on public.evie_username_requests for insert to authenticated
 with check ((select auth.uid())=user_id);

create table if not exists public.evie_username_logins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform text not null check (platform in ('telegram','snapchat')),
  username text not null check (username ~ '^@?[A-Za-z0-9._-]{3,50}$'),
  normalized_username text generated always as (lower(ltrim(username,'@'))) stored,
  verified_at timestamptz not null,
  approved_at timestamptz not null default now(),
  unique (platform,normalized_username)
);
create index if not exists evie_username_logins_platform_idx
 on public.evie_username_logins(platform,normalized_username);
alter table public.evie_username_logins enable row level security;
revoke all on public.evie_username_logins from anon,authenticated;

-- Server-only lockout counters. No IP, username or PIN is stored in plaintext.
create table if not exists public.evie_username_login_throttles (
  bucket_key text primary key check (char_length(bucket_key) between 3 and 140),
  attempts integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists evie_username_login_throttles_expiry_idx
 on public.evie_username_login_throttles(expires_at);
alter table public.evie_username_login_throttles enable row level security;
revoke all on public.evie_username_login_throttles from anon,authenticated;

-- Called only by the service-role Edge Function; two independent limits:
-- 10 attempts per social username and 50 per IP in each rolling 15-minute window.
create or replace function public.evie_username_login_rate_check(
 p_handle_hash text, p_ip_hash text
)
returns boolean language plpgsql security invoker set search_path = ''
as $body$
declare
  u_count integer;
  ip_count integer;
begin
  if p_handle_hash !~ '^[0-9a-f]{64}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  insert into public.evie_username_login_throttles (bucket_key,attempts,expires_at)
  values ('u:'||p_handle_hash,1,now()+interval '15 minutes')
  on conflict(bucket_key) do update set
    attempts=case when public.evie_username_login_throttles.expires_at<=now()
      then 1 else public.evie_username_login_throttles.attempts+1 end,
    expires_at=case when public.evie_username_login_throttles.expires_at<=now()
      then now()+interval '15 minutes' else public.evie_username_login_throttles.expires_at end,
    updated_at=now()
  returning attempts into u_count;

  insert into public.evie_username_login_throttles (bucket_key,attempts,expires_at)
  values ('i:'||p_ip_hash,1,now()+interval '15 minutes')
  on conflict(bucket_key) do update set
    attempts=case when public.evie_username_login_throttles.expires_at<=now()
      then 1 else public.evie_username_login_throttles.attempts+1 end,
    expires_at=case when public.evie_username_login_throttles.expires_at<=now()
      then now()+interval '15 minutes' else public.evie_username_login_throttles.expires_at end,
    updated_at=now()
  returning attempts into ip_count;

  if random()<0.02 then
    delete from public.evie_username_login_throttles
    where expires_at < now()-interval '24 hours';
  end if;
  return u_count<=10 and ip_count<=50;
end;
$body$;
revoke all on function public.evie_username_login_rate_check(text,text)
 from public,anon,authenticated;
grant execute on function public.evie_username_login_rate_check(text,text)
 to service_role;

-- Example administrator review (DO NOT run approval without verifying handle ownership):
-- select r.user_id,r.platform,r.username,u.email_confirmed_at
-- from public.evie_username_requests r join auth.users u on u.id=r.user_id
-- order by r.requested_at desc;
-- After independently verifying ownership of the social account:
-- insert into public.evie_username_logins(user_id,platform,username,verified_at)
-- select user_id,platform,username,now()
-- from public.evie_username_requests
-- where user_id = '<verified-user-uuid>';
