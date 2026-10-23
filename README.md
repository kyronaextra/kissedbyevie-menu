# Kissed by Evie — website and member accounts

Supabase project: cmjhecwwjoeqpcownkol
Production website: https://kissedbyevie-menu.onrender.com/

## Member authentication
- Members choose a unique login username and private eight-digit PIN. Signup recommends using their Snapchat or X username as a recognizable reference, but does not require linking those accounts. Email is retained for verification and setup recovery.
- Supabase Auth stores the email identity and securely hashes the PIN/password. PINs are never stored in public database tables.
- Signup sends an email confirmation link. Members verify the email and then sign in.
- Email confirmations must be **enabled** at Supabase Dashboard > Authentication > Providers > Email.
- Add https://kissedbyevie-menu.onrender.com/ to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs. Set Site URL to the website too.
- Supabase's built-in email delivery has sending limitations; configure custom SMTP for production volumes and test real confirmation delivery.
- No SMS provider or phone collection is required.
- **Admin-only PIN recovery**: the site tells the member to contact Evie on Telegram. There is no self-service password-reset form or API call. Administrators must verify ownership securely before changing credentials in a privileged Supabase administrative workflow. Do not ask members to share existing PINs, and never put any service-role key into client code.
- Optional social reference handles (Snapchat, X, Telegram) can be provided separately. The chosen login username is stored in an owner-only Supabase table; username selection does not grant paid media access.
- New accounts start with pending membership. Only a trusted admin can activate Daddy or Vault access.
- The vault is currently a placeholder; private Dropbox access and the order backend are separate unfinished work.
- The checkbox confirms claimed age, but does not constitute independent age verification.
- PINs are weaker than full passwords; enforce rate limits, abuse prevention, and secure admin identity checks.

Database member tables and RLS were deployed previously:
- supabase/migrations/20261023221422_evie_members_phone_pin_profiles.sql (schema filename historical; the tables are auth-provider-neutral)
- supabase/migrations/20261023143000_evie_orders.sql (not yet applied)

Docs: https://supabase.com/docs/guides/auth/passwords

## Daddy Members private gallery
- Database migration: `supabase/migrations/20261023223713_evie_daddy_private_gallery_and_favorites.sql`.
- Live Supabase tables: `evie_daddy_media` and `evie_daddy_favorites`.
- Private storage bucket: `evie-daddy-vault`. **Never make it public.**
- Photo/video cards sorted by `sort_at` (Dropbox server_modified as available), grouped by date; default newest first.
- Members can filter All / Photos / Videos / Favorites and save or remove their own favorites; all actions are protected with RLS.
- Signed private-media URLs expire within minutes. Never store Dropbox share links in the browser or public GitHub repo.
- Admin must activate Daddy tier, confirm account's age verification and set `evie_memberships.age_verified_at` via privileged workflow before any adult media is accessible.
- Dropbox connection/import is NOT complete: the shared folder link alone does not provide a connected Dropbox API/file transfer. No media files have been copied yet.
- Import assets with admin credentials via a protected backend/script; never expose Dropbox tokens or Supabase secret/service role keys in the frontend. Confirm account storage and file-size quotas first.
- Attribution: Dropbox `server_modified` is the available date proxy and does not reliably equal original upload date.

## User-chosen username login

- Member chooses a login username and PIN. Snapchat or X names are a suggestion, not a requirement or linked social login.
- Username is stored in `evie_member_usernames`, unique ignoring case. One name per account, changed only by admin.
- User verifies email to finish signup; Supabase Auth hashes the PIN.
- After email verification, the frontend claims their username under authenticated, owner-only RLS. If taken, the dashboard requests another choice.
- The public `evie-username-login` Edge Function securely resolves the alias server-side and checks the PIN with Supabase Auth. It uses per-username and IP attempt limits, and does not expose emails.
- Email + PIN is only an alternate setup sign-in; no social-platform verification is needed.
- The old social-approval tables are obsolete and unused; neither user metadata nor account usernames can authorize paid media access.
- Admin can find new members through SQL Editor:
  `select n.username,u.email,m.tier,m.status,p.snapchat_handle,p.x_handle from public.evie_member_usernames n join auth.users u on u.id=n.user_id left join public.evie_memberships m on m.user_id=n.user_id left join public.evie_member_profiles p on p.user_id=n.user_id order by n.created_at desc;`
- Private Daddy media access still requires separate administrator approval and verified adult age. Dropbox content is not imported.
