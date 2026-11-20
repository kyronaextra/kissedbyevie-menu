-- Checkout can save PayPal and Amazon e-gift alongside Venmo and Cash App.
-- amazon_gift_card stays allowed so older rows still satisfy the check.
-- The previous check rejected payment_method = 'paypal' and 'amazon_egift'.

do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'evie_order_requests'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%payment_method%'
  loop
    execute format('alter table public.evie_order_requests drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_payment_method_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_payment_method_check
  check (payment_method in ('cash_app', 'venmo', 'paypal', 'amazon_egift', 'amazon_gift_card', 'apple_pay'));
