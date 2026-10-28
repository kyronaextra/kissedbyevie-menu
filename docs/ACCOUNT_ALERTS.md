# Free accounts and alert preferences

Public entry point: `/account.html`

## Access model (October 28, 2026)

- **Continue as Guest:** browse public menu, existing public previews and public site without giving email or creating any Supabase identity. This is intentionally not Supabase anonymous sign-in. It avoids creating disposable accounts that are easy to lose and avoids widening existing authenticated RLS policies.
- **Create account / sign in:** permanent free email + username + PIN login with saved alert preferences. Free registration does not grant private media access.
- **Paid / VIP:** requires an authenticated permanent account, separate paid approval and age verification for protected media. Never infer paid entitlement from an authenticated session or user-controlled metadata. The existing Supabase RLS private-gallery policy requires active Daddy tier and verified age.
- The homepage gate now offers both guest browsing and account creation. Guest choice is stored only as a local browser preference, not an auth account. `?browse=guest` can open the public menu directly from the account page; it does not bypass private media authorization.

## Shipped

- Free account signup (email, login username, 8 digit PIN) with no link, once the Supabase Confirm email requirement is disabled.
- Existing Supabase Auth + `evie-username-login` for sign-in.
- Optional Snapchat, Telegram or X reference (not used as proof of social account ownership).
- Account session persistence and sign-out.
- RLS-protected, opt-in-only alert preferences; **both default OFF**.
- Stripchat email preference and FT/live availability email preference, independently switchable.
- No phone numbers collected for marketing. No automatic emails or SMS currently sent.
- The homepage links to the new free account page. VIP purchase is separate.

## Supabase setup required

1. In Supabase Dashboard > Authentication > Providers > Email, turn **Confirm email OFF** and leave Email signup ON. This cannot be changed through the connected Supabase tools. Until disabled, Supabase may still create a user without a session; the website now reports this problem instead of waiting for a link.
2. New signups now require no email confirmation redirect.
3. **Important:** when Confirm email is disabled, Supabase marks emails confirmed even though actual email ownership has not been proven. Notifications still require a separate proof of address ownership (for example a code) and a clear opt-in before any email is delivered. Never use Supabase's automatically set email_confirmed_at as ownership evidence. Existing accounts stuck in pending state may need administrator assistance.
4. An alert email service must independently approve this adult creator use case **before** connecting any marketing/notification send. Do not use Resend or MailerLite for sexually explicit promotions without permission: their policies prohibit pornographic content.
5. For instantaneous livestream status, Stripchat has its own `Notify when online` control for viewers; linking the account's native notification setting is preferable to unapproved scraping.

## Database table deployed

`public.evie_alert_preferences` (user_id UUID, stripchat_email boolean, availability_email boolean, opted-in timestamps, updated_at).
Both booleans are false by default. RLS allows authenticated users to create, view, change and delete **only their own** row. A trigger assigns opt-in timestamps on the server. The browser has no service-role key.

## When an approved email sender is connected

Build a separate privileged Edge Function whose delivery actions are authorized to an Evie Admin user. The sender must:

- Fetch only recipients with a separately verified email address AND the corresponding preference explicitly enabled.
- Use a verified sender domain, appropriate unsubscribe links and suppression lists.
- Rate-limit sends, deduplicate `stream_started` events, log deliveries and handle bounce/unsubscribe callbacks.
- Never expose the subscriber list or secret to browser users.
- Keep livestream alerts and availability announcements as separate event types.
- Send only after admin confirmation OR a confirmed, officially supported Stripchat live-status event is available.
- Offer recipients easy, durable opt-out even if they are logged out of the site.

**Important**: Saving a preference alone does not send a notification. The frontend deliberately says this. A separate, provider-approved sender and status trigger are still needed.

## SMS restrictions

Major US/Canadian providers prohibit messaging for sex-related businesses/campaigns, even with consent. Do not collect phone numbers for a messaging program or try to route around provider restrictions. If a provider/carrier-approved delivery method is ever established, obtain separate express SMS consent (not prechecked), store consent records, honor STOP, publish message frequency and rates, and supply a privacy policy before activating. Consider official platform notifications or website inbox alerts in the meantime.

## Security / QA

- Test signup with a new email and no confirmation link, username and email+PIN sign-in after Supabase Confirm email is off.
- Test preferences on a signed-in account and refresh to confirm persistence.
- Verify one account cannot query or modify another user's preferences.
- Verify both boxes are initially unchecked and opt-out persists.
- Test mobile form display and keyboard navigation.
- Confirm homepage link and the new account page are deployed.
