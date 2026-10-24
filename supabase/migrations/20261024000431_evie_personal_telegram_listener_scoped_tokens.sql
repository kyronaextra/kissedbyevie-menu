-- Scoped credentials for read-only personal Telegram event ingest.
-- Generated only by an authenticated owner in the Edge admin API.
-- Never store the raw bearer token; revoke/reissue at any time.
create table if not exists public.evie_admin_inbox_worker_tokens (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 3 and 75),
 platform text not null check (platform in ('telegram')),
 token_sha256 text not null unique check (token_sha256 ~ '^[0-9a-f]{64}$'),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '180 days'),
 revoked_at timestamptz,
 last_seen_at timestamptz,
 requests_total bigint not null default 0 check(requests_total >= 0)
);
create index if not exists evie_admin_inbox_worker_tokens_active_idx
  on public.evie_admin_inbox_worker_tokens(platform,created_at desc)
  where revoked_at is null;
alter table public.evie_admin_inbox_worker_tokens enable row level security;
revoke all on public.evie_admin_inbox_worker_tokens from public,anon,authenticated;
grant select,insert,update,delete on public.evie_admin_inbox_worker_tokens to service_role;

-- The scoped key is checked and heartbeat recorded atomically. No access
-- is given to members, ordinary authenticated clients or anonymous callers.
create or replace function public.evie_admin_inbox_verify_worker(
 p_digest text, p_platform text
) returns boolean
language plpgsql security invoker set search_path=''
as $$
declare accepted uuid;
begin
 if p_digest is null or p_digest !~ '^[0-9a-f]{64}$'
    or p_platform <> 'telegram' then return false; end if;
 update public.evie_admin_inbox_worker_tokens
 set last_seen_at=now(), requests_total=requests_total+1
 where token_sha256=p_digest
   and platform=p_platform
   and revoked_at is null
   and expires_at > now()
 returning id into accepted;
 return accepted is not null;
end;
$$;
revoke all on function public.evie_admin_inbox_verify_worker(text,text) from public,anon,authenticated;
grant execute on function public.evie_admin_inbox_verify_worker(text,text) to service_role;
comment on table public.evie_admin_inbox_worker_tokens is
 'Owner-approved, scoped personal Telegram listener credentials. Raw tokens are NEVER stored.';
