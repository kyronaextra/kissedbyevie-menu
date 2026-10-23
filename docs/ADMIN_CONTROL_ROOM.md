# Evie Admin Control Room — setup and limitations

Admin UI: https://kissedbyevie-menu.onrender.com/admin.html
Source: `admin.html`, `admin.css`, `admin.js`
Backend: `supabase/functions/evie-admin-api/index.ts`
Database: `supabase/migrations/20261023233503_evie_admin_control_room_registry.sql`

**Status:** Admin page, role authorization, TOTP (authenticator-app) setup/verification,
private registry, automation draft storage, member read-only list, and audit log
are implemented. The public Kissed by Evie storefront and Daddy Member logins
remain separate.

This is **not** a remote command shell, and does **not** deploy, start, stop,
schedule, or execute bots or containers. Admin registry entries describe intended
connections, not live verified integrations.

## 1. Bootstrap the REAL owner/admin account

**No account is an admin by default.** Do not make the first registered customer
an admin, rely on a publicly shared password, or leave a self-service admin
signup endpoint. Only grant the role to an owner identity you have independently
verified.

1. Create a dedicated **Supabase Auth email/password account** for the owner if
   not already available. Use a long, unique random password (16+ characters);
   do not reuse any member's eight-digit PIN or phone number.
2. Verify that account's email address. In the **existing** Supabase project,
   open [Authentication → Users](https://supabase.com/dashboard/project/cmjhecwwjoeqpcownkol/auth/users).
3. In [SQL Editor](https://supabase.com/dashboard/project/cmjhecwwjoeqpcownkol/sql/new),
   read the precise user ID of **your own verified account**:

   ```sql
   select id, email, email_confirmed_at
   from auth.users
   where email = 'your-own-verified-admin@email.example';
   ```

4. After confirming that account really belongs to you, assign the administrator
   role to the returned user UUID (use the actual ID, NOT the text placeholder):

   ```sql
   update auth.users
   set raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb) ||
       jsonb_build_object('evie_admin', true)
   where id = '<verified-owner-auth-user-uuid>'
     and email_confirmed_at is not null;
   ```

5. Open https://kissedbyevie-menu.onrender.com/admin.html, sign in with that
   email and password, and follow the on-page instructions to enroll an
   authenticator app (TOTP). Future logins require its six-digit code.
6. Verify non-admin member accounts see **Access Not Granted** and cannot retrieve
   protected API content. The API checks fresh server-side `app_metadata` and
   a Supabase-authenticated JWT containing the MFA `aal2` assurance level.
7. To revoke admin access, set `evie_admin` to false in `raw_app_meta_data` using
   the SQL editor; review/revoke active sessions and access tokens if an account
   may be compromised.

NEVER make `evie_admin` an attribute of editable `user_metadata`. Never store
the administrator password or an `admin secret key` in GitHub, JavaScript,
Render static-site environment variables or the control-room registry.

## 2. Connect a bot, Docker worker or agent

- Use **Bots & Connections** to register a friendly service name, type, provider,
  Render service ID, public HTTPS endpoint if any, and optional name of a
  server-side secret environment variable. The field stores **only the variable
  name**, never its value.
- The existing Render services `nightshift-telegram-bot` and
  `evieadmin-control` can be prefilled from the **Docker & Render** section;
  pressing *Register* merely fills the form. Review the details and save.
- The *Check Render* button becomes available only after you configure
  `RENDER_API_KEY` in the Supabase Edge Functions **server-side secrets**.
  It uses a fixed Render API domain and only checks explicitly registered
  Render service IDs; it does not send commands to arbitrary URLs.
- Links to running Render services are informational. Never assume that
  a bot connected to its own account should automatically access member data.
- To actually issue commands, add a **separate allowlisted, audited control
  adapter** to your backend and a corresponding protected worker endpoint.
  Start with read-only diagnostics and manual approvals for any sends.

## 3. Automations

- Saved entries in **Automations** are intentionally DRAFTS. Triggers and
  schedules are text descriptions; **no jobs run until** a real scheduler and
  Docker worker are deployed and explicitly configured.
- The control room does not call Telegram APIs or access member photo assets
  automatically. Anything that sends messages, processes identity records,
  or uploads private media should have specific permissions, event logs,
  and admin review/approval as appropriate.
- A safe Docker baseline is provided at `docker/evie-worker/`. It serves
  `/healthz` and an authenticated `/admin/ping` endpoint only. It does
  not execute Docker commands, contact members, or run arbitrary scripts.

## 4. Deploy a Docker service to Render (optional; not yet deployed)

1. In your existing Render workspace, create **a separate Docker web service**,
   pointed at the same GitHub repository but with root directory
   `docker/evie-worker` (the Dockerfile is in that directory).
2. Set a strong random `EVIE_WORKER_CONTROL_TOKEN` secret in that Render service.
   Never paste it into the static site or the public admin registry.
3. Set service memory, region, and plan deliberately; inspect costs before
   deploying. Configure health-check path `/healthz`.
4. Create a reference for the new Render service in the admin UI, then add a
   server-side control adapter with authentication and least-privilege actions
   before exposing job execution. The scaffold does NOT connect itself.
5. Prefer separate credentials, data stores and logs for each bot/agent. Never
   copy the customer's Supabase `service_role` key into an untrusted worker.

## 5. Member security and outstanding work

- The member roster is **read-only**. Paid membership and verified adult access
  are not granted by this UI. Both require independent manual review.
- The private Daddy gallery is separately protected by Supabase Storage and
  Postgres row-level security. Dropbox files have **not** yet been imported.
- The three admin tables intentionally deny all browser users with RLS and
  revoked grants. Only the privileged Edge Function can access them following
  fresh admin role + MFA checks.
- There is no public admin account registration, hardcoded `evieadmin` password,
  IP-as-login mechanism, secret token entry form, or browser Docker shell.
- If a browser session is not sufficient, the admin page asks for a new login.
- Supabase's security advisor also recommends enabling **leaked password
  protection** in Auth configuration:
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Verification checklist

- `evie-admin-api` Edge Function is ACTIVE with `verify_jwt=true`.
- Only the chosen owner has `raw_app_meta_data.evie_admin=true` (manual setup).
- Browser cannot directly select/insert/update `evie_admin_*` rows.
- Admin must pass TOTP; mere sign-in or membership status is insufficient.
- Registering a connection logs an event, and archiving never alters actual
  Render, Telegram, or Docker runtime state.
- A newly saved automation is visible as **draft**, never **running**.
