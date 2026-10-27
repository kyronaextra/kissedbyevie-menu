# KBE free customer accounts — deployment checklist

This feature adds \`account.html\`, \`account.js\`, and \`account.css\` to the **existing** static Render website. It does not replace the older Daddy Lounge authentication flow.

## What customers can do

- **X:** Sign in using the official X OAuth 2.0 provider. An X identity is linked to the Supabase account ID; the X handle is populated only if the provider supplies it.
- **Snapchat / Telegram:** Choose the platform and request an email magic link to create or sign into a free Supabase account; add their social handle in the editable profile **after authentication**. A typed handle is never treated as proof of social account ownership.
- **Profile:** Enter required nickname/name, optional phone, and one or more social references. A connected X identity satisfies the social-account reference requirement without a typed handle.
- **Orders:** When a logged-in customer copies a menu order, \`app.js\` appends their authenticated customer ID and optional nickname, and pre-fills a known social handle. This is a **manual customer-order matching aid**; it does NOT submit or persist an order, verify payment, or grant membership.

## Database

The additive migration at \`supabase/migrations/20261026220000_evie_free_customer_profile.sql\` adds nullable \`nickname\` and \`phone_number\` fields with basic checks to \`public.evie_member_profiles\`. Existing per-user RLS controls must remain enabled.

The app creates \`evie_memberships\` entries only as \`tier='none'\` / \`status='pending'\`. Adult media access still requires separate payment approval and age verification.

## Provider setup (manual, credentials never in the repo)

1. In Supabase Authentication → URL Configuration, add **\`https://kissedbyevie-menu.onrender.com/account.html\`** to allowed redirect URLs. Retain any existing redirect URLs. Set Site URL to the canonical website URL.
2. In Supabase Authentication → Providers, enable email authentication and configure reliable email delivery for magic links.
3. To enable X, create an X Developer App configured for **OAuth 2.0**, set the callback to **\`https://cmjhecwwjoeqpcownkol.supabase.co/auth/v1/callback\`**, then enter the X client ID and client secret in **Supabase Authentication → Providers → X**. The callback is to Supabase, not \`account.html\`. Do NOT put the X client secret into static HTML, GitHub, or client-side JS.
4. Merge/deploy the site changes to Render.
5. Deploy \`supabase/functions/evie-admin-api/index.ts\` from this feature branch after confirming it matches the current deployed version (with its matching \`deno.json\`). It selects \`nickname\` and \`phone_number\` for the authorized administrator-only member roster.

## Smoke tests (real auth required)

1. Open \`/account.html\` while signed out: both X and Snapchat/Telegram/email choices are shown; neither creates an account without the 18+ confirmation checkbox.
2. Open a magic link: it should return to \`/account.html\`, show the form, require nickname and at least one social handle when there is no connected X identity.
3. Save a profile with and without phone. Reload/sign back in; values should be retained and editable.
4. Complete a genuine X sign-in; profile should show **X connected**. Any typed Snapchat/Telegram handles should remain unverified labels.
5. Confirm a signed-in user cannot read or edit any other user’s profile; ensure admin-only \`phone_number\` is not exposed in public lists or markup.
6. Copy a menu order after sign-in: a Customer account ID is included. Sign out and copy again: there must be no customer ID.
7. Verify a free profile receives no paid gallery entitlement. Confirm admin roster is still restricted to accounts with \`app_metadata.evie_admin === true\`.

## Notes

- Order linking is **not** automatic until a separate secure order-submission workflow is enabled. The pasted customer ID lets Evie reconcile an order manually.
- Existing email+PIN member accounts are not deleted or migrated, and they may use the new profile page with their authenticated Supabase session.
- Do not use the optional phone number for authentication, marketing messages, or resale of customer data.
