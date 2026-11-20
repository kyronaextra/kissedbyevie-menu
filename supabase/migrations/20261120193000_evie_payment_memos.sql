-- Memos already copied into a saved Venmo or Cash App checkout.
-- A page view does not write here. Only the order function's service role
-- can read or write these rows.

alter table public.evie_order_requests
  add column if not exists payment_memo text;

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_payment_memo_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_payment_memo_check
  check (payment_memo is null or char_length(payment_memo) between 2 and 80);

create table if not exists public.evie_used_memos (
  memo text primary key check (char_length(memo) between 2 and 80),
  request_id uuid,
  created_at timestamptz not null default now()
);

alter table public.evie_used_memos enable row level security;
revoke all on table public.evie_used_memos from anon, authenticated;

comment on table public.evie_used_memos is
  'Memos claimed by a saved checkout. No anon or authenticated policies; the service role bypasses RLS.';
