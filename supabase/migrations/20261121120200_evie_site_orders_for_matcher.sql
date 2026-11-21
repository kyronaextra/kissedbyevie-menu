-- Safer matcher source than rewriting tg_agent_exec.
-- Includes pending and paid rows, contact_handle / contact_platform, and
-- whether a proof was uploaded. Do not apply to live until Evie reviews.

create or replace view public.evie_site_orders_for_matcher as
select
  id,
  request_id,
  contact_platform,
  contact_handle,
  telegram_handle,
  snapchat_handle,
  x_handle,
  payment_method,
  items,
  initial_total_cents,
  tip_cents,
  status,
  source,
  created_at,
  (proof_path is not null and length(proof_path) > 0) as has_proof
from public.evie_order_requests
where coalesce(status, 'pending') in ('pending','paid','review','awaiting_review');

-- Intended list_paid_orders change (do not replace the whole tg_agent_exec
-- body here): select contact_handle, contact_platform, request_id, source,
-- has_proof, and include pending/paid rather than paid-only telegram_handle.
comment on view public.evie_site_orders_for_matcher is
  'Checkout orders for the payment matcher. Prefer contact_handle when the platform is telegram.';
