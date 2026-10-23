-- LIVE migration was applied using Supabase project cmjhecwwjoeqpcownkol.
-- The production DB additionally has evie_memberships.age_verified_at, private
-- storage bucket evie-daddy-vault and RLS policies protecting both objects and metadata.
-- This file documents the intended schema and rules for later migrations.
ALTER TABLE public.evie_memberships ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;
CREATE TABLE IF NOT EXISTS public.evie_daddy_media (
 id uuid primary key default gen_random_uuid(),
 source_id text unique,
 storage_path text not null unique,
 title text not null check(char_length(title) between 1 and 255),
 kind text not null check(kind in ('photo','video')),
 mime_type text not null,
 file_bytes bigint check(file_bytes is null or file_bytes>=0),
 sort_at timestamptz not null default now(),
 source_modified_at timestamptz,
 imported_at timestamptz not null default now(),
 published boolean not null default true
);
CREATE INDEX IF NOT EXISTS evie_daddy_media_recent_idx ON public.evie_daddy_media(sort_at desc,id);
CREATE TABLE IF NOT EXISTS public.evie_daddy_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 media_id uuid not null references public.evie_daddy_media(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,media_id)
);
CREATE INDEX IF NOT EXISTS evie_daddy_favorites_user_idx ON public.evie_daddy_favorites(user_id,created_at desc);
ALTER TABLE public.evie_daddy_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evie_daddy_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evie_daddy_media FROM anon,authenticated;
REVOKE ALL ON public.evie_daddy_favorites FROM anon,authenticated;
GRANT SELECT ON public.evie_daddy_media TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.evie_daddy_favorites TO authenticated;
CREATE POLICY "Approved adult Daddy members can see published media"
 ON public.evie_daddy_media FOR SELECT TO authenticated
 USING (published AND EXISTS(
  SELECT 1 FROM public.evie_memberships m
  WHERE m.user_id=(SELECT auth.uid()) AND m.tier='daddy' AND m.status='active'
    AND m.age_verified_at IS NOT NULL AND (m.expires_at IS NULL OR m.expires_at>now())
 ));
CREATE POLICY "Approved adult Daddy members can see own favorites"
 ON public.evie_daddy_favorites FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(
  SELECT 1 FROM public.evie_memberships m
  WHERE m.user_id=(SELECT auth.uid()) AND m.tier='daddy' AND m.status='active'
    AND m.age_verified_at IS NOT NULL AND (m.expires_at IS NULL OR m.expires_at>now())
 ));
CREATE POLICY "Approved adult Daddy members can favorite media"
 ON public.evie_daddy_favorites FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(
  SELECT 1 FROM public.evie_daddy_media d WHERE d.id=media_id AND d.published
 ) AND EXISTS(
  SELECT 1 FROM public.evie_memberships m
  WHERE m.user_id=(SELECT auth.uid()) AND m.tier='daddy' AND m.status='active'
    AND m.age_verified_at IS NOT NULL AND (m.expires_at IS NULL OR m.expires_at>now())
 ));
CREATE POLICY "Approved adult Daddy members can remove own favorites"
 ON public.evie_daddy_favorites FOR DELETE TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(
  SELECT 1 FROM public.evie_memberships m
  WHERE m.user_id=(SELECT auth.uid()) AND m.tier='daddy' AND m.status='active'
    AND m.age_verified_at IS NOT NULL AND (m.expires_at IS NULL OR m.expires_at>now())
 ));
INSERT INTO storage.buckets (id,name,public) VALUES ('evie-daddy-vault','evie-daddy-vault',false)
 ON CONFLICT(id) DO NOTHING;
CREATE POLICY "Approved adult Daddy members may view indexed private files"
 ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='evie-daddy-vault' AND EXISTS(
  SELECT 1 FROM public.evie_daddy_media d WHERE d.storage_path=name AND d.published
 ) AND EXISTS(
  SELECT 1 FROM public.evie_memberships m
  WHERE m.user_id=(SELECT auth.uid()) AND m.tier='daddy' AND m.status='active'
    AND m.age_verified_at IS NOT NULL AND (m.expires_at IS NULL OR m.expires_at>now())
 ));
