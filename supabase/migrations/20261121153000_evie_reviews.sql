-- Moderated buyer reviews. Anon can read approved rows only.
-- Submits go through the evie-reviews Edge Function (service role).
-- Bot approval uses evie-site-bot and evie_site_bot_secrets (no public policies).

create table if not exists public.evie_reviews (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  display_handle text,
  platform text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  ip_hash text
);

alter table public.evie_reviews
  drop constraint if exists evie_reviews_platform_check;
alter table public.evie_reviews
  add constraint evie_reviews_platform_check
  check (platform is null or platform in ('x','telegram'));

alter table public.evie_reviews
  drop constraint if exists evie_reviews_status_check;
alter table public.evie_reviews
  add constraint evie_reviews_status_check
  check (status in ('pending','approved','hidden'));

alter table public.evie_reviews
  drop constraint if exists evie_reviews_body_len;
alter table public.evie_reviews
  add constraint evie_reviews_body_len
  check (char_length(body) between 8 and 280);

create index if not exists evie_reviews_status_created_idx
  on public.evie_reviews (status, created_at desc);

create index if not exists evie_reviews_ip_created_idx
  on public.evie_reviews (ip_hash, created_at desc);

alter table public.evie_reviews enable row level security;

drop policy if exists evie_reviews_public_read on public.evie_reviews;
create policy evie_reviews_public_read
  on public.evie_reviews
  for select
  to anon, authenticated
  using (status = 'approved');

grant select on public.evie_reviews to anon, authenticated;
revoke insert, update, delete on public.evie_reviews from anon, authenticated, public;

create table if not exists public.evie_site_bot_secrets (
  name text primary key,
  secret_sha256 text not null,
  created_at timestamptz not null default now()
);

alter table public.evie_site_bot_secrets enable row level security;
revoke all on public.evie_site_bot_secrets from anon, authenticated, public;
