-- Run in Supabase → SQL Editor. Idempotent. Not an auto-applied migration.
create table if not exists public.evie_bot_config (
  id smallint primary key check (id = 1),
  configuration jsonb not null,
  revision integer not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);
insert into public.evie_bot_config (id, configuration)
values (1, '{"active_profile":"evie","profiles":[{"id":"evie","name":"Evie","quick_replies":[]}],"automations":[],"menu":{},"settings":{}}')
on conflict (id) do nothing;

create table if not exists public.evie_bot_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  token_sha256 text not null unique check (token_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);
create index if not exists evie_bot_devices_active_idx
  on public.evie_bot_devices (created_at desc) where revoked_at is null;

alter table public.evie_bot_config enable row level security;
alter table public.evie_bot_devices enable row level security;
revoke all on public.evie_bot_config from public, anon, authenticated;
revoke all on public.evie_bot_devices from public, anon, authenticated;
grant select, insert, update, delete on public.evie_bot_config to service_role;
grant select, insert, update, delete on public.evie_bot_devices to service_role;
-- No client RLS policies: only the Edge Function touches these rows.