# Kissed by Evie — private boutique

A cinematic gallery, boutique, shopping bag, order-request checkout, and Daddy Members account screens.

## Activation status

- Frontend: Phone number + chosen eight-digit PIN for signup/sign-in, SMS signup verification, PIN reset, and optional Telegram / X / Snapchat profiles are implemented.
- Supabase: NOT ACTIVE. Choose a dedicated Kissed by Evie project before enabling member signup or order capture. Do not use Santi's Tires project.
- Dropbox: Member-only gallery is NOT connected. A valid active status displays a placeholder and never exposes private Dropbox links.
- Payments: External/manual. Membership requires separate payment verification and operator approval.

## Supabase setup

1. Select or create a dedicated project. Enable Phone provider, phone confirmations and an SMS provider in Authentication. SMS delivery can incur costs.
2. Apply migrations in order:
   - supabase/migrations/20261023143000_evie_orders.sql
   - supabase/migrations/20261023143100_evie_member_auth.sql
3. Set the public project URL and publishable/anon key in member-config.js. NEVER insert any service-role key, SMS provider secret or Dropbox token in a public file.
4. Sign up: phone in international +country-code format, custom 8-digit PIN and optional socials. Verify with the separate six-digit SMS code. Sign in with phone + PIN.
5. The profiles table uses owner-only row level security. Creating an account creates a pending member record but NEVER paid access.
6. Only an authorized operator should update membership status after confirming payment and age eligibility; never allow browser-supplied status changes.
7. Enable the Supabase Edge Function for order intake, then set the public endpoint in order-config.js. Add rate limits and anti-bot checks first.
8. For a future private Dropbox gallery, issue temporary media access only from a server that validates active membership and expiration per request; never serve public Dropbox share URLs.

## Security

- Supabase Auth handles PINs; our tables do not contain plaintext PINs.
- Phone-number login and SMS resets can be affected by phone recycling, SIM swaps, and brute-force attempts. Enable additional MFA and reasonable rate limits before broad release.
- An 18+ checkbox is self-attestation and does not replace identity or age verification required by applicable law.
- Social accounts are optional and users may update them after signup.
- The static frontend is public; its keys must be publishable-only and all private-data authorization enforced server-side.

References: https://supabase.com/docs/guides/auth/passwords and https://supabase.com/docs/guides/auth/phone-login
