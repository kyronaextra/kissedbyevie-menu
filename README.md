# Kissed by Evie — website and member accounts

Supabase project: cmjhecwwjoeqpcownkol
Production website: https://kissedbyevie-menu.onrender.com/

## Member authentication
- Create an account with email, Telegram/Snapchat username and private eight-digit PIN. Normal login uses the ADMIN-APPROVED Telegram or Snapchat username + PIN through the `evie-username-login` Edge Function. Verified email + PIN remains available only as a setup fallback.
- Supabase Auth stores the email identity and securely hashes the PIN/password. PINs are never stored in public database tables.
- Signup sends an email confirmation link. Members verify the email and then sign in.
- Email confirmations must be **enabled** at Supabase Dashboard > Authentication > Providers > Email.
- Add https://kissedbyevie-menu.onrender.com/ to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs. Set Site URL to the website too.
- Supabase's built-in email delivery has sending limitations; configure custom SMTP for production volumes and test real confirmation delivery.
- No SMS provider or phone collection is required.
- **Admin-only PIN recovery**: the site tells the member to contact Evie on Telegram. There is no self-service password-reset form or API call. Administrators must verify ownership securely before changing credentials in a privileged Supabase administrative workflow. Do not ask members to share existing PINs, and never put any service-role key into client code.
- A Telegram or Snapchat username is REQUIRED to enroll a login alias. Other profile socials remain optional. These are stored in a private Supabase member profile under owner-only row-level security. Signup metadata is only used to save an optional profile after verification; never for paid-access decisions.
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

## Username alias approval and security

- Server-side auth function: `supabase/functions/evie-username-login/index.ts` (deployed to Supabase; password checks always use Supabase Auth).
- Username alias request table: `evie_username_requests` (members submit request only).
- Admin-only approved aliases: `evie_username_logins` (the browser has no SELECT/INSERT/UPDATE permission).
- A member verifies their email and signs in once with the setup fallback to create a username request; they cannot approve it themselves.
- The admin must INDEPENDENTLY verify social handle ownership, then approve the exact account ID and username in Supabase SQL Editor.
- Pending requests query: `select r.user_id,r.platform,r.username,u.email_confirmed_at from public.evie_username_requests r join auth.users u on u.id=r.user_id order by r.requested_at;`
- Approval ONLY AFTER checking ownership: `insert into public.evie_username_logins(user_id,platform,username,verified_at) select r.user_id,r.platform,r.username,now() from public.evie_username_requests r join auth.users u on u.id=r.user_id where r.user_id='<verified-user-uuid>' and u.email_confirmed_at is not null;`
- Database rate limits: 10 tries per username and 50 per IP per 15 minutes, plus GoTrue's own throttles. Do not use a phone number as a PIN.
- Account and paid membership approval are separate. Daddy gallery STILL requires verified adult age and an active paid Daddy membership; X usernames are profile-only.
- Admin manually handles PIN changes after confirming account ownership. Never place service-role keys in the browser.
