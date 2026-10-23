# Kissed by Evie — website and members

Project: Supabase cmjhecwwjoeqpcownkol

## Current state
- Website code has phone-number plus chosen eight-digit PIN signup/signin and a separate six-digit SMS verification.
- Optional social field: choose **one** of Telegram, X, Snapchat, or skip entirely. Member can update/remove the choice later.
- The Supabase member profile and membership tables ARE deployed and RLS protected on the above project.
- The website's member-config.js contains only the public URL/publishable key. EVIE_SMS_READY is false because SMS provider/confirmation settings have not been verified.
- Enable Phone Auth and configure an SMS provider and mandatory phone confirmation in the Supabase dashboard. Test OTP delivery/verification, MFA and rate limiting, **then** change EVIE_SMS_READY to true. SMS provider may charge for messages.
- Membership starts at **pending**. Only an administrator can grant paid access, never user metadata or frontend JS.
- Dropbox private gallery and order intake endpoint are not yet connected.
- Password/PIN is hashed/managed only by Supabase Auth; never stored as plaintext in a public table.
- Use the member profile's owner-only RLS; the only membership insert policy enforces own-user 'pending'/'none' with no expiry/activation fields.
- Phone-number identity can be compromised by SIM swaps/number recycling; add MFA for valuable accounts and secure recovery before scale.
- The age checkbox is self-attestation, not an identity/age verification service.

Migrations:
- supabase/migrations/20261023221422_evie_members_phone_pin_profiles.sql (applied to Supabase)
- supabase/migrations/20261023143000_evie_orders.sql (not yet applied)

Official docs: https://supabase.com/docs/guides/auth/passwords and https://supabase.com/docs/guides/auth/phone-login
