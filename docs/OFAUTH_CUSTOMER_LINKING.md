# OFAuth customer linking (optional, gated)

## Current state

The optional **Connect OnlyFans** panel is committed to `account.html`, `account.js`, and `account.css`.
A dedicated `evie-ofauth-link` Supabase Edge Function has been deployed with `verify_jwt=true`.
The `evie_ofauth_links` table is private: RLS is on; `anon` and `authenticated` have no direct table privileges or policies.

**Linking is disabled until the owner configures a private OFAuth API key, validates the current callback contract in OFAuth's sandbox, and explicitly turns on `OFAUTH_LINK_ENABLED=true`.** No live OFAuth customer link has been tested.

The existing `evie-of-claim` manual OnlyFans subscription check is unchanged. Do not confuse the two systems. A linked OnlyFans account is *not* a VIP purchase, subscription verification, or age verification.

## What to configure

1. In [OFAuth Client Apps](https://app.ofauth.com/), select the **Redirect** integration for client app `app_sxxfcrdnsk4fflq5j4x01xxa`.
2. Allowlist exactly: `https://kissedbyevie-menu.onrender.com/account.html`. Add any future custom domain only after it is deployed and tested.
3. Review the client app's **Access Permissions**. For fan identity linking, request the minimum account/profile scope actually needed. **Disable access to messages, posts, earnings, vault, and write actions.** Do not launch until OFAuth confirms fan accounts are supported for this app type and the permissions presented to fans are acceptable.
4. In Supabase project `cmjhecwwjoeqpcownkol`, use **Edge Function Secrets** to add `OFAUTH_API_KEY`. Do not put the key in GitHub, Render's static site, the frontend, or a chat message.
5. **Keep `OFAUTH_LINK_ENABLED` unset or `false` while testing.** When the sandbox and callback verification have passed, change it to `true`. That is the deliberate launch switch. With the switch off the dashboard shows “OnlyFans account linking is not available yet.”
6. The Edge Function sends `POST https://api.ofauth.com/v2/link/init` with the app ID, a server-generated `clientReferenceId`, and the approved callback URL. OFAuth handles the login. The browser receives only the hosted Link URL.
7. The callback is *not* trusted without server-side verification. The current backend accepts a completed link only if OFAuth returns a matching active connection when the server polls the Link session using the returned `clientSecret`. **Some current OFAuth docs show hosted sessions without `clientSecret`. If your app returns no secret, this callback method intentionally fails closed. Implement and test OFAuth webhook signature validation or another authenticated, documented backend verification before enabling production.**
8. Test revoke/disconnect with the actual OFAuth endpoint before launching. The current function calls `DELETE /v2/account/connections/{connectionId}`, and only removes the local record on successful provider response. The exact endpoint has not yet been verified against a live API response.
9. Sandbox-test new signup, guest browsing, signed-in linking, callback success/cancel/error, same-account duplicate prevention, disconnect, permissions, mobile Safari, service errors, and age restrictions before production.

## Security boundaries

* Users must be signed into a permanent KissedByEvie account; guest access and anonymous Supabase users are rejected.
* The client app ID is **public**. The OFAuth API key, Link client secret, and connection ID are **backend only**.
* The server verifies Supabase's user JWT itself, even though the Edge gateway also requires JWT.
* DB policies and the function are separated from `evie_memberships` and Daddy private gallery authorization. Linking **never** automatically changes paid access, verified age, or order history.
* No passwords, cookies, 2FA codes, or raw OnlyFans credentials are collected by KissedByEvie.
* Allow minimum access to the provider; follow OFAuth's documented unlink and consent procedures.
* Check [OFAuth's End User Account Linking Agreement](https://ofauth.com/policies/account-linking-agreement) and [Link API docs](https://docs.ofauth.com/guides/link) before launch.
* OFAuth charges based on active connections; review its pricing plan before allowing open public connections.

## Operational notes

* A free account still uses the existing Supabase email + username + PIN login. Enabling OFAuth does not replace it.
* Registration without an email confirmation link requires Supabase's Confirm email setting to be disabled in Auth > Providers > Email. This has not been changed automatically here.
* OFAuth itself is a third-party integration for OnlyFans' unofficial API, **not** official OnlyFans OAuth.
* If API credentials or Link verification aren't available, the site must not claim “Connected.”
