-- Privately deliver approved customer photo/video orders. NOT the free tease or Daddy vault.
-- Account holders see only their own files/messages; only server-verified admins publish.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('evie-customer-deliveries','evie-customer-deliveries',false,52428800,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.evie_customer_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 title text not null check (char_length(btrim(title)) between 1 and 120),
 kind text not null check (kind in ('photo','video')),
 mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')),
 status text not null default 'ready' check (status in ('ready','revoked')),
 delivered_at timestamptz not null default now(),
 delivered_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint evie_delivery_path check (
   storage_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$')
 ),
 constraint evie_delivery_type check (
  (kind='photo' and mime_type like 'image/%') or
  (kind='video' and mime_type like 'video/%')
 )
);
create index if not exists evie_customer_deliveries_user_feed
  on public.evie_customer_deliveries(user_id, delivered_at desc);

create table if not exists public.evie_customer_messages (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1200),
 posted_by uuid references auth.users(id) on delete set null,
 posted_at timestamptz not null default now()
);
create index if not exists evie_customer_messages_user_feed
  on public.evie_customer_messages(user_id, posted_at desc);
alter table public.evie_customer_deliveries enable row level security;
alter table public.evie_customer_messages enable row level security;

revoke all on public.evie_customer_deliveries from anon,authenticated;
revoke all on public.evie_customer_messages from anon,authenticated;
grant select on public.evie_customer_deliveries to authenticated;
grant select on public.evie_customer_messages to authenticated;

-- Independent age verification required for purchased adult media,
-- not a VIP membership purchase, and NEVER just the website 18+ checkbox.
create policy "Customer sees own approved deliveries" on public.evie_customer_deliveries
  for select to authenticated
  using (user_id=(select auth.uid()) and status='ready' and
    exists (select 1 from public.evie_memberships m
     where m.user_id=(select auth.uid()) and m.age_verified_at is not null));
create policy "Customer sees own messages" on public.evie_customer_messages
  for select to authenticated using (user_id=(select auth.uid()));

-- Separate private storage: the exact path must exist in the recipient's
-- ready delivery metadata and verified-adult status. No access to vault assets.
create policy "Recipients read own delivered objects" on storage.objects
 for select to authenticated
 using (bucket_id='evie-customer-deliveries'
   and exists (select 1 from public.evie_customer_deliveries d
      where d.storage_path=name and d.user_id=(select auth.uid()) and d.status='ready'
      and exists (select 1 from public.evie_memberships m
         where m.user_id=d.user_id and m.age_verified_at is not null)));

-- Only admins can upload objects, from their existing logged-in Evie Admin session.
-- The admin app_metadata claim is server-owned (not user_metadata).
create policy "Evie administrators upload customer objects" on storage.objects
 for insert to authenticated
 with check (bucket_id='evie-customer-deliveries' and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$' and
  (select auth.jwt()->'app_metadata'->>'evie_admin')='true');
create policy "Evie administrators manage customer objects" on storage.objects
 for select to authenticated
 using (bucket_id='evie-customer-deliveries' and
  (select auth.jwt()->'app_metadata'->>'evie_admin')='true');

comment on table public.evie_customer_deliveries is 'Permanent per-customer purchased media assignments; admin-only writes via protected Edge Function; age-verification required for reading.';
comment on table public.evie_customer_messages is 'Private one-way administrator dashboard messages, unrelated to public social inboxes.';
