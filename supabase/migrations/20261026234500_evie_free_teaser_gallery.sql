-- Free-account gallery: published, pre-censored PHOTO assets only.
-- This is NOT the Daddy vault and never grants paid media access.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('evie-account-teasers','evie-account-teasers',false,10485760,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.evie_teaser_photos (
 id uuid primary key default gen_random_uuid(),
 storage_path text not null unique
   check (storage_path ~ '^teasers/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
 caption text not null default '' check (char_length(caption)<=120),
 alt_text text not null default '' check (char_length(alt_text)<=180),
 published boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists evie_teaser_photos_feed
 on public.evie_teaser_photos (published,sort_order,created_at desc);
alter table public.evie_teaser_photos enable row level security;

revoke all on public.evie_teaser_photos from anon, authenticated;
grant select,insert,update,delete on public.evie_teaser_photos to authenticated;

-- Authenticated accounts see only PUBLISHED teasers.
-- Gallery administrators may preview and approve unpublished files.
create policy "Free accounts view published teaser photos" on public.evie_teaser_photos
 for select to authenticated
 using (
   (published=true and (auth.jwt()->>'is_anonymous') is distinct from 'true')
   or exists (
     select 1 from public.evie_gallery_admins admins
     where admins.user_id=(select auth.uid())
   )
 );
create policy "Gallery admins insert teaser metadata" on public.evie_teaser_photos
 for insert to authenticated
 with check (exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid())));
create policy "Gallery admins update teaser metadata" on public.evie_teaser_photos
 for update to authenticated
 using (exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid())))
 with check (exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid())));
create policy "Gallery admins remove teaser metadata" on public.evie_teaser_photos
 for delete to authenticated
 using (exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid())));

-- All file bytes live in an INDEPENDENT private bucket, never in evie-daddy-vault.
-- Published and indexed paths can be signed/downloaded by signed-in members.
create policy "Signed-in members view published teaser photos" on storage.objects
 for select to authenticated
 using (
   bucket_id='evie-account-teasers'
   and (
     (exists (
       select 1 from public.evie_teaser_photos p
       where p.storage_path=name and p.published=true
     ) and (auth.jwt()->>'is_anonymous') is distinct from 'true')
     or exists (select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid()))
   )
 );
create policy "Gallery admins upload teaser photo files" on storage.objects
 for insert to authenticated
 with check (
   bucket_id='evie-account-teasers'
   and name ~ '^teasers/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
   and exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid()))
 );
create policy "Gallery admins replace teaser photo files" on storage.objects
 for update to authenticated
 using (
   bucket_id='evie-account-teasers'
   and exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid()))
 )
 with check (
   bucket_id='evie-account-teasers'
   and name ~ '^teasers/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
   and exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid()))
 );
create policy "Gallery admins delete teaser photo files" on storage.objects
 for delete to authenticated
 using (
   bucket_id='evie-account-teasers'
   and exists(select 1 from public.evie_gallery_admins a where a.user_id=(select auth.uid()))
 );
comment on table public.evie_teaser_photos is
 'Account-only photos; uploader must pre-censor image bytes and inspect each draft before publish. No videos, no paid files.';
