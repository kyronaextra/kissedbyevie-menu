
-- Kissed by Evie: deployed on Supabase project cmjhecwwjoeqpcownkol.
-- PIN credentials are managed ONLY through Supabase Auth.
create table if not exists public.evie_member_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 telegram_handle text check (telegram_handle is null or char_length(telegram_handle)<=80),
 x_handle text check (x_handle is null or char_length(x_handle)<=80),
 snapchat_handle text check (snapchat_handle is null or char_length(snapchat_handle)<=80),
 updated_at timestamptz not null default now()
);
create table if not exists public.evie_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tier text not null default 'none' check (tier in ('none','daddy','vault')),
 status text not null default 'pending' check (status in ('pending','active','expired','revoked')),
 activated_at timestamptz,
 expires_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.evie_member_profiles enable row level security;
alter table public.evie_memberships enable row level security;
revoke all on table public.evie_member_profiles from anon;
revoke all on table public.evie_memberships from anon;
grant select, insert, update on table public.evie_member_profiles to authenticated;
grant select, insert on table public.evie_memberships to authenticated;
revoke update, delete on table public.evie_memberships from authenticated;
create policy "Member sees own social profile" on public.evie_member_profiles
 for select to authenticated using ((select auth.uid())=user_id);
create policy "Member creates own social profile" on public.evie_member_profiles
 for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Member updates own social profile" on public.evie_member_profiles
 for update to authenticated using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id);
create policy "Member views own membership" on public.evie_memberships
 for select to authenticated using ((select auth.uid())=user_id);
create policy "Member creates pending-only membership" on public.evie_memberships
 for insert to authenticated with check ((select auth.uid())=user_id
 and tier='none' and status='pending' and activated_at is null and expires_at is null);
