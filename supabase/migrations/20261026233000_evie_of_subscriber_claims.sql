-- OnlyFans subscriber verification claims.
-- Separate from evie_memberships: an OF claim never grants paid gallery access.
-- Only Edge Functions with the service-role key may create or review claims.
create table if not exists public.evie_of_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  of_username text not null check (of_username ~ '^[A-Za-z0-9_.-]{3,50}$'),
  challenge_code text not null check (challenge_code ~ '^[A-F0-9]{24}$'),
  status text not null default 'pending'
    check (status in ('pending','verified','rejected')),
  requested_at timestamptz not null default now(),
  challenge_expires_at timestamptz not null,
  verified_at timestamptz,
  verified_until timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint evie_of_valid_times check (
    (status = 'verified' and verified_at is not null and verified_until is not null and reviewed_at is not null)
    or (status <> 'verified' and verified_at is null and verified_until is null)
  )
);
create index if not exists evie_of_claims_review_queue
  on public.evie_of_claims(status, requested_at desc);
alter table public.evie_of_claims enable row level security;
revoke all on table public.evie_of_claims from anon, authenticated;
grant select on table public.evie_of_claims to authenticated;
create policy "Users view only their OF claim"
  on public.evie_of_claims for select to authenticated
  using ((select auth.uid())=user_id);
comment on table public.evie_of_claims is
  'Manual creator-confirmed OnlyFans subscriber proofs. No OAuth, no OF passwords, no paid membership authorization.';
