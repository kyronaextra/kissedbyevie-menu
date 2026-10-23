-- Intended for a DEDICATED Kissed by Evie Supabase project.
-- Do not deploy in a different business project's database.
-- Password/PIN hashes live only in Supabase Auth. Never create a PIN column.
create table if not exists public.evie_member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_handle text check (telegram_handle is null or char_length(telegram_handle) <= 80),
  x_handle text check (x_handle is null or char_length(x_handle) <= 80),
  snapchat_handle text check (snapchat_handle is null or char_length(snapchat_handle) <= 80),
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
revoke all on public.evie_member_profiles from anon;
revoke all on public.evie_memberships from anon;
grant select, insert, update on public.evie_member_profiles to authenticated;
grant select on public.evie_memberships to authenticated;
revoke insert, update, delete on public.evie_memberships from authenticated;
create policy "Member can view own socials" on public.evie_member_profiles
 for select to authenticated using ((select auth.uid()) = user_id);
create policy "Member can save own socials" on public.evie_member_profiles
 for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Member can edit own socials" on public.evie_member_profiles
 for update to authenticated using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);
create policy "Member can view own access" on public.evie_memberships
 for select to authenticated using ((select auth.uid()) = user_id);
-- Sign-up trigger creates *pending only*. Paid access can only be granted
-- by a trusted administrator/service-role process, never from the browser.
create or replace function public.evie_create_member_pending()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.evie_memberships(user_id,tier,status)
  values(new.id,'none','pending') on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists evie_auth_user_created on auth.users;
create trigger evie_auth_user_created
after insert on auth.users for each row execute function public.evie_create_member_pending();
-- No public Dropbox URLs, assets, or credentials belong in these tables.
