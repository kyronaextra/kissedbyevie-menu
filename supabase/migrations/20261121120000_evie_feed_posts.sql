-- Feed posts for the homepage. Anon can read published rows only.
-- Writes go through the evie-feed Edge Function (service role).
-- Do not apply to live until Evie reviews the preview.

create table if not exists public.evie_feed_posts (
  id uuid primary key default gen_random_uuid(),
  body text not null default '',
  link_url text,
  link_kind text,
  pinned boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);

alter table public.evie_feed_posts
  drop constraint if exists evie_feed_posts_link_kind_check;

alter table public.evie_feed_posts
  add constraint evie_feed_posts_link_kind_check
  check (link_kind is null or link_kind in ('show','custom','sale','url'));

create index if not exists evie_feed_posts_published_pinned_created_idx
  on public.evie_feed_posts (published, pinned desc, created_at desc);

alter table public.evie_public_photos
  add column if not exists post_id uuid references public.evie_feed_posts(id) on delete set null;

alter table public.evie_public_photos
  add column if not exists in_gallery boolean not null default true;

-- Existing gallery rows stay visible. New feed photos that should also
-- appear in the gallery use placement = 'gallery' so current gallery
-- queries (which do not select in_gallery) keep working.
create index if not exists evie_public_photos_post_id_idx
  on public.evie_public_photos (post_id)
  where post_id is not null;

alter table public.evie_feed_posts enable row level security;

drop policy if exists evie_feed_posts_public_read on public.evie_feed_posts;
create policy evie_feed_posts_public_read
  on public.evie_feed_posts
  for select
  to anon, authenticated
  using (published = true);

-- No insert/update/delete policies for anon or authenticated. The Edge
-- Function uses the service role.
grant select on public.evie_feed_posts to anon, authenticated;
