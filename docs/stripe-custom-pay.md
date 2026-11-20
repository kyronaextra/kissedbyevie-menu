# Custom Stripe payments

`pay.html` is a custom-amount page for tips, tributes, custom requests, and agreed rates for **@kissedbyevie**. The browser never sees a Stripe secret. It asks `POST /api/create-checkout-session` for a Checkout Session and redirects to the `url` Stripe returns.

The live site at `https://kissedbyevie-menu.onrender.com` is a **Render static site**. There is no Node server in front of it today. Menu checkout is still Venmo / Cash App plus a screenshot (`checkout.html` and the `evie-order-request` Supabase function). This Stripe page does not replace that flow.

`server/` is a Node/Express app that:

- creates the Checkout Session
- verifies Stripe webhooks
- confirms a session for the success page
- can serve the repo’s HTML, CSS, and JS when you run it as one Render web service

## Environment variables

Set these on the server only. Do not put them in git, in `order-config.js`, or in any file the browser downloads.

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Restricted API key (`rk_`) with **Checkout Sessions: Write** and **Checkout Sessions: Read**. A secret key (`sk_`) also works, but a restricted key is the one to create. Use a sandbox key while testing and a live restricted key only when you are ready to charge cards. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/webhook`. The Stripe CLI prints one for local forwarding. The Dashboard (or `stripe webhook_endpoints`) gives the one for the deployed URL. |
| `PUBLIC_BASE_URL` | Origin shoppers return to, with no path. Local: `http://localhost:3000`. Production static site: `https://kissedbyevie-menu.onrender.com`. Success and cancel URLs are built only from this value. |
| `PORT` | Port to bind. Render sets this. Local default is `3000`. The process listens on `0.0.0.0`. |
| `EXTRA_CORS_ORIGINS` | Optional comma-separated origins allowed to call the API. `PUBLIC_BASE_URL` is already allowed. |
| `STRIPE_MOCK` | Local preview only. Set to `1` to skip Stripe and redirect back to the success page. The server refuses to boot if this is set and `NODE_ENV=production`. |

Copy `server/.env.example` to `server/.env` for local runs. `.env` is gitignored.

Stripe also recommends an [access policy](https://docs.stripe.com/keys.md#access-policies) on the key, separate keys per environment, and passkeys or an authenticator app on the Dashboard (not SMS). If a key leaks, roll it in the Dashboard before anything else.

## What the API does

`POST /api/create-checkout-session`

- Accepts `{ amount, purpose, note, handle }`. `amount` may be a string or number with at most 2 decimal places.
- Converts dollars to integer cents. Minimum **500** ($5.00). Maximum **500000** ($5,000.00).
- Creates a Checkout Session with `mode: 'payment'` and one `price_data` line item. No pre-created Price is required.
- Does **not** send `payment_method_types`, so Stripe’s dynamic payment methods stay on.
- Tags the session with `integration_identifier` `kbe_custom_pay_qmnxwkrp` (API version `2026-11-18.endive`).

`POST /api/webhook`

- Raw body, verified with `stripe.webhooks.constructEvent`.
- `checkout.session.completed` and `checkout.session.async_payment_succeeded` are fulfilled only when `payment_status` is not `unpaid`.
- `checkout.session.async_payment_failed` is recorded as failed.
- The success page is not fulfillment. A payer can close the tab before it loads. The handler logs a non-sensitive summary (session id, status, amount, purpose). Wire that log to your own records before you treat a tip as delivered work.

`GET /api/checkout-session/:id`

- `id` must look like `cs_test_…` or `cs_live_…`.
- Returns `status`, `payment_status`, `amount_total`, `currency`, and `purpose` only.

`GET /api/health` returns `{ ok: true }` even when Stripe is not configured, so a deploy can boot before you paste the keys. Creating a session then returns **503** with “Card payments are not configured yet.”

## Browser configuration

`order-config.js` sets `window.EVIE_PAY_API_BASE`.

- Leave it `''` when the Node server serves `pay.html`. The page calls same-origin `/api`.
- Set it to the companion origin, with no trailing slash, when Render static hosting serves the HTML and a second web service runs the API:

```js
window.EVIE_PAY_API_BASE = 'https://kissedbyevie-pay.onrender.com';
```

The page handles:

- `pay.html?status=success&session_id={CHECKOUT_SESSION_ID}`
- `pay.html?status=cancel`

Cancel keeps the amount in `sessionStorage`. Success asks the API before it says the payment was received.

## Local test

From the repo:

```bash
cd server
npm ci
npm test
```

Run the site with a real sandbox key:

```bash
cp .env.example .env
# fill STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and PUBLIC_BASE_URL
npm start
```

Open `http://localhost:3000/pay.html`.

A [sandbox](https://docs.stripe.com/sandboxes.md) is a Stripe test environment with its own data, separate from live mode. You can create one with the Stripe CLI without using the shared test mode of a live account:

```bash
npm install -g @stripe/cli
stripe sandbox create
```

Forward webhooks while you click through Checkout:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Put the `whsec_` signing secret the CLI prints into `STRIPE_WEBHOOK_SECRET`. Use the test card numbers from Stripe’s docs. Do not use a live key for this.

For a screenshot or click-through with no Stripe account:

```bash
STRIPE_MOCK=1 PUBLIC_BASE_URL=http://127.0.0.1:4179 PORT=4179 npm start
```

`STRIPE_MOCK=1` is not a payment integration. It never runs in production.

## Render

Two ways to host it. Neither is applied to the live site until this branch is merged and the Blueprint sync (or a manual service) is confirmed.

### A. Companion web service + existing static site

`render.yaml` keeps `kissedbyevie-menu` as a static site and adds `kissedbyevie-pay` (Node). On the first Blueprint sync, Render asks for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. It does not store those values in the repo.

1. Set `PUBLIC_BASE_URL` to `https://kissedbyevie-menu.onrender.com` (already in the blueprint).
2. Set `window.EVIE_PAY_API_BASE` in `order-config.js` to the new service’s `https://….onrender.com` origin.
3. In Stripe, add a webhook endpoint at `https://<pay-service>.onrender.com/api/webhook` for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
4. Paste that endpoint’s signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

`/pay` on the static site rewrites to `/pay.html`.

### B. One web service for the site and the API

Change `kissedbyevie-menu` from static to a Node web service (or point DNS at `kissedbyevie-pay`) with:

- Build: `npm ci --prefix server`
- Start: `npm start --prefix server`
- Health check: `/api/health`

Leave `EVIE_PAY_API_BASE` empty. Set `PUBLIC_BASE_URL` to the origin shoppers use. The same process serves `pay.html` and `/api`.

Free web services spin down after inactivity. The first checkout after a sleep can take longer to answer. The page shows the server error if the API is down or the key is missing.

## Fulfillment

Log lines look like:

```json
{"msg":"checkout_event","action":"fulfill","eventType":"checkout.session.completed","sessionId":"cs_test_…","paymentStatus":"paid","amountTotal":5000,"currency":"usd","purpose":"tip"}
```

`action` is `fulfill`, `defer` (completed but still unpaid), or `fail`. The process does not store cards, emails, or the raw webhook body. An in-memory note of the event disappears on restart. Add a database before you depend on it for delivery.

Signature verification is required. If the host can allowlist [Stripe’s webhook IP addresses](https://docs.stripe.com/ips.md), that is extra defense. The signature check still has to pass.
