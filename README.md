# Kissed by Evie — website and member accounts

Supabase project: cmjhecwwjoeqpcownkol
Production website: https://kissedbyevie-menu.onrender.com/

## Tips (Ko-fi)

The menu (`/` and `/menu`) has an optional tip section under How to pay. It uses the same dark card, serif heading, and metal-pink button as the rest of the menu. The hero action is “Open Ko-fi”, which goes to https://ko-fi.com/eviesquirts in a new tab. Ko-fi’s panel iframe is secondary, inside a dark rounded frame, and loads only when that frame is near the screen. There are no amount chips: a Ko-fi link cannot reliably prefill an amount. A small “Tip Evie” button, styled like the menu buttons, appears after the 18+ check and stays off How to pay, the checkout prompt, and the tip panel. Tips are not purchases: they do not buy content and they do not change the checkout total. The menu pages do not set a Content-Security-Policy. If one is added later, allow `https://ko-fi.com` for the panel frame.

The live Render service is a static site (`render.yaml`, `runtime: static`). It cannot run `POST /api/kofi-webhook`, so that route is not in this repo. There is no `KOFI_VERIFICATION_TOKEN` to set on the static site, and there is no webhook URL to paste into Ko-fi yet.

To receive Ko-fi webhooks later, add a separate server (a small Render web service, or a Supabase Edge Function) that:

- Accepts `POST` with Ko-fi’s form field `data` (a JSON string).
- Reads `verification_token` from that JSON and compares it to the environment variable `KOFI_VERIFICATION_TOKEN` with a constant-time compare. Never put the token in the static site or in git.
- Returns `401` when the token is missing or does not match.
- Logs only `type`, `amount`, `currency`, `from_name`, and `message`. Do not log email.
- Leaves a TODO for future notifications.

Point Ko-fi’s API webhook setting at that server’s `/api/kofi-webhook`. The menu embed does not need the token.

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
- supabase/migrations/20261120153000_evie_checkout_payment_proof.sql (apply after the orders table exists)

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

## Remembered sign-in
- Supabase Auth `persistSession: true` and `autoRefreshToken: true` restore the session on the same browser/device; the home-page member button displays "My Daddy Account" while a session exists.
- The member can sign out at any time. A session can expire or be revoked; a new login may then be required.
- We do **not** use or store IP addresses as identity/login credentials: IPs change and multiple people can share one.
- The server-side login throttle may hash incoming network addresses to prevent abuse, separately from persistent authentication.
- Persisted sessions on a shared device can expose the account to other people using that device. Members should sign out on shared/public devices.
- Paid media access and age verification are checked independently for each gallery request.

## Daddy Members full-screen lounge

- The public site remains the storefront. Signed-in members enter a full-screen, mobile-responsive dashboard styled in black velvet, burgundy and champagne-gold.
- Username + PIN login, one-time email setup sign-in, and automatic remembered sessions route directly to this lounge. Returning members click "My Daddy Account" and don't need to re-enter their PIN if their session is still valid.
- Lounge shortcuts: Vault (all media), Favorites, New Drops (newest-first), member status, priority Telegram contact, account settings and sign out.
- The three gallery shortcuts use the existing private `EvieDaddyGallery.open(mode)` integration rather than public Dropbox URLs.
- Approved Daddy members can see real counts of imported photos/videos and their own favorites; these are queried using their Supabase user session and protected by RLS.
- Members who are pending, expired or not independently age verified see the lounge but **no private media previews or counts**. Calls to private gallery remain blocked.
- The page shows an honest empty state until Dropbox files are imported; it must never pretend the collection has been populated.
- Closing Account Settings keeps the secure session active, while Sign Out clears the lounge and private gallery.
- CSS and behavior live in `style.css` / `daddy-lounge.js` / `member-auth.js` / `daddy-gallery.js`.


## Evie Admin Control Room

- Private URL: https://kissedbyevie-menu.onrender.com/admin.html
- Admin page is protected by a **manually assigned** Supabase Auth `app_metadata.evie_admin` role and email/password sign-in. The authenticator-app requirement was removed at the owner's request. Two verified accounts currently have the role; only those approved accounts can access the protected backend. Admin sessions are not persisted across browser restarts.
- Protected backend: `evie-admin-api`; metadata registry, workflow drafts, read-only member overview and audit events.
- Bots, agents, Docker services and automations are **references/drafts** until a real backend worker is separately connected. No credentials or Docker commands run in browser code.
- Setup and admin-role activation instructions: [docs/ADMIN_CONTROL_ROOM.md](docs/ADMIN_CONTROL_ROOM.md).
- Optional non-executing Docker worker starter: [docker/evie-worker/README.md](docker/evie-worker/README.md).

## Checkout and payment screenshots

Public page: https://kissedbyevie-menu.onrender.com/checkout.html

The storefront bag’s **Continue to checkout** button opens the same page and carries the bag in `sessionStorage`. Menu cards use the checkout names and prices, including VIP 3 Months at **$350** and the 900+ Dropbox at **$75** (today’s promo is **$55**).

The browser only calls `evie-order-request` with the publishable key. The service-role key stays in Supabase Edge Function secrets. Proof images go to the private `evie-payment-proofs` bucket. Evie reviews them in Admin → Orders. A saved order is not a payment confirmation.

If the function or migration is not deployed, checkout shows that the order was not saved.

After merge, from this repo with the Supabase CLI logged into project `cmjhecwwjoeqpcownkol`:

```bash
supabase link --project-ref cmjhecwwjoeqpcownkol
supabase db push
supabase functions deploy evie-order-request --no-verify-jwt
supabase functions deploy evie-admin-api
```

`db push` applies `20261023143000_evie_orders.sql` first if that table is still missing, then `20261120153000_evie_checkout_payment_proof.sql`. Do not put `SUPABASE_SERVICE_ROLE_KEY` in the static site. Optional: set Edge secret `EVIE_ALLOWED_ORIGINS` if the public origin is not `https://kissedbyevie-menu.onrender.com` (localhost ports 4173 and 8080 are already allowed by default).

## Personal Telegram account → Live Message Inbox (read-only)

- Open [Evie Admin message inbox](https://kissedbyevie-menu.onrender.com/admin.html) and choose **Personal Telegram account**.
- Generate a unique, revocable 180-day scoped connection key. It is shown once and stored hashed in Supabase, so members and anonymous browsers cannot retrieve it.
- On a device you control, authorize your Telegram **user account** via Telethon (API ID/hash and Telegram login code). **No BotFather bot is involved.**
- Run the isolated [personal Telegram inbox listener](docker/telegram-personal-inbox/README.md) locally on Windows or in a Docker container with persistent private session storage. A listener must remain online for the feed to be live.
- The worker only reports private 1:1 incoming and outgoing events. It never sends messages, downloads attachments or runs the old `telethon-client/client.py` auto-reply workflow.
- Evie Admin displays who needs a reply and updates via private Supabase real-time signals, with a 20-second fallback refresh. Replying on Telegram moves the thread to **Waiting**. Manual queue actions are not Telegram replies.
- The Telegram session file and API credentials are local to the listener. Only a scoped worker key and minimal event metadata are shared with the admin backend; full message snippets are off by default.
- **Status:** The dashboard and listener code are deployed/committed, but **no personal Telegram session has been authorized or worker connected** yet. X and Snapchat personal messages are not connected.
