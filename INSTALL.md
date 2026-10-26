# Evie SnapDesk — install

## 1. Database (once)
Supabase → SQL Editor → run `docs/EVIE_SNAPDESK_SCHEMA.sql`.

## 2. Function (once)
`supabase/config.toml` must contain `[functions.evie-bot-sync] verify_jwt = false`.
Then: `supabase functions deploy evie-bot-sync`

Verify: open
https://cmjhecwwjoeqpcownkol.supabase.co/functions/v1/evie-bot-sync?action=profile
Expect `{"error":"Device key required"}`.

## 3. Studio
Replace `bot-studio.html` + `bot-studio.js`. Commit and push.
Open `/bot-studio.html` → sign in → Import JSON → `evie-seed.json` → Publish settings.

## 4. Userscript
Tampermonkey → Dashboard → `+` → clear the template → paste
`userscripts/evie-snapdesk.user.js` → Ctrl+S.
Runs on web.snapchat.com, x.com, web.telegram.org.

## 5. Pair
Tampermonkey → "Copy Evie pairing key" → Studio → Pair device.

## 6. Use
Snapchat Web → click **pick composer** once.
Panel is bottom-right. Starts in **audit-only** — it logs and touches nothing.

Rungs: audit-only → suggest → self-send only → Full auto.
Timer: 1h / 2h / 3h / 4h, then it reverts to audit-only by itself.
Kill: `Ctrl+Shift+E` or ⏸ stop.

## Notes
- Prices live in the menu. Replies use `{{tokens}}`; never hardcode a `$`.
- Payment is never confirmed from a screenshot.
- `auto` rules may self-send. `draft` waits. `escalate` comes to you.
- The studio lint warns on hardcoded `$` and unknown tokens.