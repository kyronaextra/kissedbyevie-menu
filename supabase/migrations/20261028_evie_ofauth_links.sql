-- Optional OFAuth fan account linking. Private backend-only records.
-- No direct client reads or writes. A linked OF account never grants paid access.
create table if not exists public.evie_ofauth_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending','connected')),
  connection_id text unique,
  link_client_secret text,
  reference_id text,
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.evie_ofauth_links enable row level security;
revoke all privileges on public.evie_ofauth_links from anon, authenticated;
comment on table public.evie_ofauth_links is
  'Service-role-only account linking. Store no OnlyFans passwords. Link does not imply membership, age verification, or entitlement.';
