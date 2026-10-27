-- Free customer accounts: optional contact number and required-on-onboarding nickname.
-- Nullable columns preserve existing memberships and social-only profiles.
-- Profile ownership is still enforced by existing evie_member_profiles RLS policies.
alter table public.evie_member_profiles
  add column if not exists nickname text,
  add column if not exists phone_number text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='evie_member_profiles_nickname_valid') then
    alter table public.evie_member_profiles add constraint evie_member_profiles_nickname_valid
      check (nickname is null or (char_length(btrim(nickname)) between 1 and 80));
  end if;
  if not exists (select 1 from pg_constraint where conname='evie_member_profiles_phone_valid') then
    alter table public.evie_member_profiles add constraint evie_member_profiles_phone_valid
      check (phone_number is null or (
        phone_number ~ '^[+0-9() .-]{7,24}$'
        and length(regexp_replace(phone_number,'[^0-9]','','g')) between 7 and 15
      ));
  end if;
end
$$;

comment on column public.evie_member_profiles.nickname is
  'Member-chosen display name or nickname, visible only to that member and authorized admins.';
comment on column public.evie_member_profiles.phone_number is
  'Optional customer contact number for order/account support; never used as a login secret.';
