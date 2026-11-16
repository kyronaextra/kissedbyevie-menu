# Evie Admin — temporary Render backend

This branch stages a Render-hosted, passcode-only admin backend without changing the live public storefront.

## Scope

- Uses the existing `admin.html`, `admin.css`, `admin.js` and `admin-inbox.js` look and navigation.
- Server-side six-digit passcode only. **Never put the passcode in GitHub or frontend JavaScript.**
- PostgreSQL-persisted sessions, connection references, automation drafts, activity log and manual follow-up reminders.
- Rate limiting: five attempts per source address and twenty attempts globally within fifteen minutes.
- Four-hour, Secure, HttpOnly, SameSite=Strict session cookies; logout invalidates the session server-side.
- Member roster, paid-access approvals, private media, Telegram worker pairing and real-time sync **are not migrated**.
- Existing Supabase project remains intact. Never turn it off until all dependencies have a tested migration.

## Render deployment after workspace confirmation

Create a new **Node web service** connected to the repo and branch:
- Repository: `kyronaextra/kissedbyevie-menu`
- Branch: `evie-render-passcode-2026-11-15`
- Build command: `cd render-admin && npm install --omit=dev`
- Start command: `node render-admin/server.js`
- Health check: `/healthz`

Provision a dedicated Render PostgreSQL instance (consider retention and paid-plan costs). Set these **Render server-only environment variables**:

```
NODE_ENV=production
DATABASE_URL=<Render internal PostgreSQL connection URL>
EVIE_ADMIN_PASSCODE=<owner's six-digit code>
```

The server intentionally fails to start unless both required secrets are configured. It creates new `evie_render_*` tables on startup. Store these values in Render's environment settings, not frontend files, GitHub, pull requests or screenshots.

Open `https://<new-service>.onrender.com/admin.html`.

## Verification before any cutover

1. `GET /healthz` returns HTTP 200 with `{"ok":true}`.
2. Unauthenticated `GET /api/admin?action=overview` returns HTTP 401.
3. Incorrect passcode is rejected; repeated attempts become HTTP 429.
4. Correct passcode sets an HttpOnly cookie, then loads the dashboard.
5. Create a manual follow-up, refresh, and verify it persists.
6. Add and archive a service reference; confirm this changes only local records.
7. Sign out; the old cookie can no longer access the API.
8. Verify the original public storefront and Supabase member sign-in are unchanged.

## Security / limitations

This is **not** a full Supabase migration and cannot display existing member records. A six-digit shared passcode is substantially weaker than per-admin logins with MFA; restrict use to the temporary console and rotate the code after sharing it. Render services must use HTTPS. No server secrets should ever be sent to a browser. With multiple service instances, database-backed sessions and rate limits remain shared, but review and test concurrent login behavior before scaling.

The Docker and Telegram integrations shown in the UI are references or placeholders, not automatically connected workers. An automation draft does not execute. Render status checks are not yet implemented.

## Rollback

Do not remove or change the original site's Supabase configuration. Keep the original `main` branch and storefront deployed as-is; the new admin uses a separate Render service and branch. Decommission the temporary admin by disabling its Render service and revoking or rotating its passcode. Existing Supabase member data remains untouched.
