-- Evie SnapDesk isolated schema for the existing Supabase project.
-- Run in SQL editor only after reviewing the PR. This file is setup SQL,
-- not an automatically applied migration.
create table if not exists public.evie_bot_config (
  id smallint primary key check (id = 1),
  configuration jsonb not null,
  revision integer not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);
insert into public.evie_bot_config (id, configuration)
values (1, '{
 "active_profile":"evie",
 "profiles":[
  {"id":"evie","name":"Evie","tone":"Confident, warm and playful","guidance":"Brief, friendly replies. Require manual approval.","quick_replies":[{"label":"Hello","text":"Hey you 💕 What did you have in mind?"},{"label":"Busy","text":"Hey! I will get back to you soon."}]},
  {"id":"customer","name":"Customer Service","tone":"Helpful, professional and friendly","guidance":"Clear questions and no unverified payment claims.","quick_replies":[{"label":"Pricing","text":"I can send you the menu and help you choose what fits."},{"label":"Follow-up","text":"Following up to see if you had any questions!"}]}
 ]}')
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
-- Do NOT add client-facing RLS policies: only the protected Edge Function
-- (which checks an admin session or a paired device token) can access rows.
