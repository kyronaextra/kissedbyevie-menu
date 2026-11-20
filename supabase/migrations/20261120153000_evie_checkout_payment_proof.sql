-- Checkout orders can include Snapchat, Telegram, and X handles plus a
-- proof-of-payment image. The image bucket stays private. Browsers cannot
-- read or write these rows or files; the Edge Function uses the service role.
-- Service-role keys must never be placed in client JavaScript.

alter table public.evie_order_requests
  add column if not exists snapchat_handle text,
  add column if not exists telegram_handle text,
  add column if not exists x_handle text,
  add column if not exists tip_cents integer not null default 0,
  add column if not exists source text not null default 'legacy',
  add column if not exists proof_bucket text,
  add column if not exists proof_path text,
  add column if not exists proof_mime text,
  add column if not exists proof_bytes integer;

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
      and pg_get_constraintdef(c.oid) ilike '%contact_platform%'
  loop
    execute format('alter table public.evie_order_requests drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_contact_platform_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_contact_platform_check
  check (contact_platform in ('snapchat', 'telegram', 'x'));

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_source_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_source_check
  check (source in ('legacy', 'checkout'));

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_tip_cents_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_tip_cents_check
  check (tip_cents between 0 and 250000);

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_checkout_handles_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_checkout_handles_check
  check (
    source <> 'checkout'
    or (
      (snapchat_handle is not null or telegram_handle is not null or x_handle is not null)
      and (snapchat_handle is null or snapchat_handle ~ '^[A-Za-z0-9_.@-]{2,80}$')
      and (telegram_handle is null or telegram_handle ~ '^[A-Za-z0-9_.@-]{2,80}$')
      and (x_handle is null or x_handle ~ '^[A-Za-z0-9_.@-]{2,80}$')
    )
  );

alter table public.evie_order_requests
  drop constraint if exists evie_order_requests_proof_check;

alter table public.evie_order_requests
  add constraint evie_order_requests_proof_check
  check (
    (
      proof_path is null
      and proof_mime is null
      and proof_bytes is null
      and proof_bucket is null
    )
    or (
      proof_bucket = 'evie-payment-proofs'
      and proof_path ~ '^[0-9a-f-]{36}/[a-z0-9]{16}\.(jpg|png|gif|webp|heic|heif)$'
      and proof_mime in ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif')
      and proof_bytes between 1 and 5242880
    )
  );

create unique index if not exists evie_order_proof_path_idx
  on public.evie_order_requests (proof_path)
  where proof_path is not null;

comment on column public.evie_order_requests.proof_path is
  'Object path inside the private evie-payment-proofs bucket. Do not make that bucket public.';

insert into storage.buckets (id, name, public)
values ('evie-payment-proofs', 'evie-payment-proofs', false)
on conflict (id) do update set public = false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types'
  ) then
    update storage.buckets
    set file_size_limit = 5242880,
        allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif']::text[]
    where id = 'evie-payment-proofs';
  end if;
end $$;

-- No storage policies are added. Authenticated and anon clients have no access.
-- The service role, used only inside the Edge Function, bypasses RLS.