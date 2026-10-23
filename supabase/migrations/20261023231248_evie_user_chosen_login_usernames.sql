-- A member chooses an independent login username; Snapchat/X are optional references.
-- The user can claim ONE username. Renames require an administrator, not
-- editing public social profiles. Password hashes remain inside Supabase Auth.
create table if not exists public.evie_member_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null
    check (username ~ '^@?[A-Za-z0-9._-]{3,30}$'),
  normalized_username text generated always as (lower(ltrim(username,'@'))) stored,
  created_at timestamptz not null default now(),
  unique (normalized_username)
);
create index if not exists evie_member_usernames_created_idx
 on public.evie_member_usernames(created_at desc);
alter table public.evie_member_usernames enable row level security;
revoke all on public.evie_member_usernames from anon, authenticated;
grant select,insert on public.evie_member_usernames to authenticated;

create policy "Members see own chosen username"
on public.evie_member_usernames
for select to authenticated
using ((select auth.uid())=user_id);

create policy "Members claim own username once"
on public.evie_member_usernames
for insert to authenticated
with check ((select auth.uid())=user_id);

-- No authenticated UPDATE or DELETE grant, so a member cannot silently
-- change their username to impersonate another account or create aliases.
-- Public browser clients cannot enumerate other usernames.
-- The existing server-only per-username/IP rate limiter is reused.
