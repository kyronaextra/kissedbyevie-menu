-- Run only in the chosen dedicated Evie Supabase project.
create extension if not exists pgcrypto;
create table if not exists public.evie_order_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','confirmed','fulfilled','cancelled')),
  contact_platform text not null check (contact_platform in ('snapchat','telegram')),
  contact_handle text not null check (char_length(contact_handle) between 2 and 80),
  notes text not null default '' check (char_length(notes)<=500),
  payment_method text not null check (payment_method in ('cash_app','venmo','amazon_gift_card','apple_pay')),
  items jsonb not null,
  initial_total_cents integer not null check (initial_total_cents between 0 and 250000),
  adult_confirmed boolean not null check (adult_confirmed)
);
alter table public.evie_order_requests enable row level security;
-- Intentionally no anon or authenticated SELECT/INSERT/UPDATE policies.
-- Only the private Edge Function's service role may access this table.
revoke all on table public.evie_order_requests from anon, authenticated;
create index if not exists evie_orders_created_idx on public.evie_order_requests(created_at desc);
