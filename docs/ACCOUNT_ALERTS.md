# Free accounts and alert preferences

Public entry point: `/account.html`

## Shipped

- Free account signup (verified email, login username, 8 digit PIN).
- Existing Supabase Auth + `evie-username-login` for sign-in.
- Optional Snapchat, Telegram or X reference (not used as proof of social account ownership).
- Account session persistence and sign-out.
- RLS-protected, opt-in-only alert preferences; **both default OFF**.
- Stripchat email preference and FT/live availability email preference, independently switchable.
- No phone numbers collected for marketing. No automatic emails or SMS currently sent.
- The homepage links to the new free account page. VIP purchase is separate.

## Supabase setup required

1. Confirm that Email signup + Email confirmations are enabled in Supabase Auth.
2. Set the Site URL to the production site and add `https://kissedbyevie-menu.onrender.com/account.html` to **Authentication > URL Configuration > Redirect URLs**. Also add any future custom-domain `/account.html` URL.
3. Set up a production-compatible Auth email service for signup confirmations. Supabase's default Auth mailer is rate limited. Test email confirmation from an account you control.
4. An alert email service must independently approve this adult creator use case **before** connecting any marketing/notification send. Do not use Resend or MailerLite for sexually explicit promotions without permission: their policies prohibit pornographic content.
5. For instantaneous livestream status, Stripchat has its own `Notify when online` control for viewers; linking the account's native notification setting is preferable to unapproved scraping.

## Database table deployed

`public.evie_alert_preferences` (user_id UUID, stripchat_email boolean, availability_email boolean, opted-in timestamps, updated_at).
Both booleans are false by default. RLS allows authenticated users to create, view, change and delete **only their own** row. A trigger assigns opt-in timestamps on the server. The browser has no service-role key.

## When an approved email sender is connected

Build a separate privileged Edge Function whose delivery actions are authorized to an Evie Admin user. The sender must:

- Fetch only recipients with a confirmed email AND the corresponding preference explicitly enabled.
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

- Test signup with a new email, confirmation, username and email+PIN sign-in.
- Test preferences on a signed-in account and refresh to confirm persistence.
- Verify one account cannot query or modify another user's preferences.
- Verify both boxes are initially unchecked and opt-out persists.
- Test mobile form display and keyboard navigation.
- Confirm homepage link and the new account page are deployed.
