# Evie Admin — Docker profiler + personal Telegram listener

This is a **working backend starter** built around the three uploaded files:
`auth.py` (FastAPI auth), Cloudflare tunnel one-time commands, and `indexx.html`
(the Listener Control Centre). It does **not** overwrite the existing
[Kissed by Evie admin site](https://kissedbyevie-menu.onrender.com/admin.html).

## Architecture

```
Telegram account (ONE authorized Telethon session, no BotFather)
  -> Docker listener (read-only; local session mounted in ./private)
       -> Docker FastAPI /ingest -> SQLite ./data -> /live + /feed -> profiler UI
       -> (optional) existing Supabase evie-inbox-ingest -> Evie Admin inbox
```

The optional Supabase forwarding uses the existing **revocable worker key** issued
by the live Evie Admin UI. No Supabase secret/service-role key is in this Docker app.
X and Snapchat are not connected automatically. Other authorized agents may send
schema-validated events to the Docker `/ingest` API over a trusted private network.

## First run (Linux/macOS)

```bash
cp .env.example .env
python3 - <<'PY'
import secrets
for key in ('PROFILER_TOKEN', 'PROFILER_READ_TOKEN', 'SESSION_SECRET'):
    print(key + '=' + secrets.token_urlsafe(48))
PY
# Copy the three DIFFERENT generated values into .env.
mkdir -p data private
sudo chown -R 10001:10001 data private
chmod 700 data private
chmod 600 .env

docker compose up -d --build api
# URL on the same host: http://127.0.0.1:8180
# Sign in with the PROFILER_READ_TOKEN from .env.
```

On Windows PowerShell, use `Copy-Item .env.example .env`, create directories
with `New-Item -ItemType Directory -Force data,private`, and run Docker Desktop.
Do not use `sudo chown` in Windows PowerShell.

## Enable personal Telegram listener

1. Go to https://my.telegram.org and create a personal Telegram API app to get
   `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`. Put those in your private `.env`.
2. For **the existing Evie Admin Message Inbox**, sign in at
   https://kissedbyevie-menu.onrender.com/admin.html, open **Personal Telegram
   account**, generate the connection key, and set `EVIE_INBOX_WORKER_TOKEN`
   in `.env`. Leave it blank if you only want the local profiler.
3. Authenticate once using your own Telegram number and login code:

   ```bash
   docker compose --profile telegram run --rm listener python -m app.listener login
   docker compose --profile telegram up -d --build api listener
   docker compose logs -f listener
   ```

The listener writes only into `./private` and never sends Telegram messages.
**Do not run the old Telegram listener and this one at the same time using the
same session or account.** Your existing `docker/telegram-personal-inbox` worker
can instead remain the only Telegram worker if you merely need Evie Admin's inbox.

## Authenticated API

- `GET /healthz` — unauthenticated, readiness only.
- `POST /login` — JSON `{ "token": "READ_TOKEN" }` swaps read token for a
  signed, HttpOnly, SameSite=Strict session cookie (12-hour expiry).
- `POST /logout` — clears cookie; `GET /health`, `/feed`, `/live`, `/context/{id}`,
  `/profile/{id}` — session protected. `/live` is Server-Sent Events.
- `POST /ingest` — server-to-server only; `Authorization: Bearer PROFILER_TOKEN`.
- `POST /profile` — server-to-server profile snapshots. LTV, spend and sentiment
  **are not inferred**; only real values supplied by an authorized system appear.

Example from an **authorized server**, not the browser:

```bash
curl -X POST http://127.0.0.1:8180/ingest \
  -H "Authorization: Bearer $PROFILER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"platform":"telegram","event_id":"example-001","chat_id":"123","sender_id":"123","username":"demo","name":"Demo","text":"Private message","direction":"inbound"}'
```

The read login and the master worker token are separate; do not paste either
into a URL. The uploaded dashboard's `?t=` and `?api=` query-token modes have
been removed for this reason. Blank/missing tokens now fail closed.

## Development hot rebuild

The user's sample `rebuilder` service has been corrected:
- Create `/tmp/evie-build-stamp` before `find -newer`.
- Watch `app/`, `web/`, `Dockerfile`, `requirements.txt`, `compose.yaml`.
- Touch the stamp only **after successful rebuild**; failed builds retry.
- Use `docker compose --profile telegram up -d --build api listener`.

```bash
docker compose --profile dev up -d rebuilder
```

**Danger:** the Docker socket gives the rebuilder near-root control of the Docker
host. This profile is *development-only*, on a trusted machine, and must never
run as a public service. The production `api` and `listener` do not mount a
Docker socket. Disable hot rebuild with `docker compose --profile dev stop rebuilder`.

## Cloudflare tunnel (optional)

The uploaded `#once.bash.txt` contains one-time `cloudflared tunnel login`,
`tunnel create profiler`, and `tunnel route dns profiler control.yourdomain.com`
commands. Use those only for a domain you control. For a token-managed tunnel,
configure the `control` hostname in Cloudflare Zero Trust to serve `http://api:8000`
and set `TUNNEL_TOKEN` in `.env`. Then:

```bash
# Change .env: COOKIE_SECURE=true, PUBLIC_ORIGIN=https://control.yourdomain.com
# Configure a Cloudflare Access application allowing only your approved admins.
docker compose --profile tunnel up -d api tunnel
```

The Docker API is bound to `127.0.0.1` on the host, not publicly exposed.
Cloudflare Access is recommended in front of any internet-facing control
panel. Do not expose private Telegram session files through the tunnel.

## Testing and limitations

```bash
python -m pip install -r requirements.txt pytest
python -m pytest -q
```

For Evie Admin, incoming Telegram events are forwarded to the **existing**
`evie-inbox-ingest` function only if a real scoped token is configured; the
existing protected admin console is where you review/mark replies. The separate
profiler UI has its own read-token gate; this starter does **not** make Supabase
administrator sessions valid for the profiler, nor can the browser stop/start
Docker containers, send Telegram messages, or read Snapchat/X private DMs.

For security, the current `data` database keeps events up to `RETENTION_DAYS`.
Message bodies are omitted by default (`TELEGRAM_MESSAGE_PREVIEW=off`).

---

## Evie Admin real Docker controls (optional addition)

This upgraded package responds to the uploaded **texttttt.txt** control-worker
proposal without its unsafe public socket/API layout. **The new controller is
not enabled by default** and the existing site is not overwritten. The existing
Telegram listener forwards to the current protected Evie Admin inbox as before.

### Control architecture

```
Render admin.html (existing Supabase Auth + evie_admin server-verified role)
  -> existing Supabase evie-admin-api (audits admin and creates short-lived job)
    -> private Supabase command table (browser direct access denied)
      <- outbound HTTPS poll by local controller (separate worker token)
          -> label-allowlisted Docker socket (local only)
      -> worker writes result + heartbeat -> existing Evie Admin UI
```

No Tailscale Funnel, Cloudflare Tunnel or inbound port is necessary for
**remote control**. This bridge controls only the containers on your trusted
Docker host, **not** the Docker containers managed internally by Render. The optional Cloudflare tunnel from the base package serves
only the separate **read-only profiler** and should be protected with Cloudflare
Access. Control commands are **never** authenticated with a reusable browser
secret or stored in a URL/localStorage. Command history remains in Supabase.

Allowed operations: **status, start, stop, restart, logs, pause/resume** on the
profiler `api` and `listener` services only. Recompute, Telegram sends,
Docker exec, containers outside this Compose project, and automation execution
are deliberately **not implemented**. The uploaded proposed `profile.py` /
`pipeline.py` are absent; do not present fabricated spend/churn analysis.

### 1. Install into a local checkout of your existing site

From this extracted package folder, after cloning your
`kyronaextra/kissedbyevie-menu` repository to a trusted local folder:

```bash
python scripts/install_into_evie_repo.py /path/to/kissedbyevie-menu
cd /path/to/kissedbyevie-menu
git diff --check
git diff
```

It adds `admin-control.js` and `.css`, attaches the controls inside the existing
**Docker & Render** panel and extends `evie-admin-api` with `worker_state`,
`worker_commands`, `worker_command`. **It preserves** your existing admin login,
member access, gallery and Telegram inbox. It also copies:

- `supabase/migrations/20261023234500_evie_control_bridge.sql`
- `supabase/functions/evie-control-relay/index.ts`

The installer backs up changed `.js`, `.html` and `.ts` files with an
`.evie-backup` suffix (exclude those backups from production commits).
It stops safely if the original files have changed so the expected anchors
cannot be found. Review the diff before any deployment.

### 2. Activate the Supabase backend deliberately

In the **same** existing Supabase project `cmjhecwwjoeqpcownkol`:

1. Apply the SQL migration. It creates locked-down tables and the
   privileged, atomic `evie_worker_claim_next` function.
2. Set a brand-new high-entropy `EVIE_CONTROL_WORKER_TOKEN` in **Supabase Edge
   Function Secrets**. Use the *same secret* only on your trusted Docker PC.
3. Deploy `evie-control-relay` **with JWT verification disabled** because this
   endpoint authenticates its own strong worker bearer token (it refuses
   requests from browser origins). Never expose the token in a web page.
4. Deploy the updated existing `evie-admin-api` with its **existing JWT
   verification enabled**. Only independently approved Supabase admin accounts
   can queue or read commands.
5. Deploy the reviewed static site as usual. The new control section will appear
   only after the normal administrator login.

Both the admin Edge API and the relay require Supabase service-role access for
the private database tables. Do not publish that key or include it in Docker.
Do not blindly execute migrations or overwrite the hosted admin app without
review and a backup of the previous deployment.

### 3. Start on your trusted Linux host

Generate a fresh fourth secret, independent from the existing three:

```bash
python -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Set `EVIE_CONTROL_WORKER_TOKEN` in your private `.env` (and the matching Edge
secret). Set `DOCKER_GID` to the **actual** host socket group id:

```bash
stat -c '%g' /var/run/docker.sock
```

Use that number, not the example `10001`. Prepare directories and launch:

```bash
mkdir -p data private
sudo chown -R 10001:10001 data private
docker compose --profile control up -d --build api controller
# Add --profile telegram and `listener` only after Telegram login.
docker compose --profile control logs --tail=100 controller
```

On Windows with Docker Desktop, socket permissions and bind mounts differ.
Run the Docker commands from your actual Linux/WSL2 engine context and set the
socket's effective group appropriately. A wrong GID prevents controlling
Docker; **do not** solve it by making the socket world writable.

### Security properties and boundaries

- The controller's access to Docker's Unix socket grants **root-equivalent
  authority on the local Docker host** despite its fixed allowlist. Run it only
  on a trusted, dedicated host, with a reviewed immutable image and no external
  ports. Do not mount the socket into the publicly reachable `api` container.
- If your Supabase administrator login is compromised, a thief could queue
  these limited service operations. Protect approved admin accounts with strong
  passwords, monitor audit entries and restrict who has the server-managed role.
- The relay's worker token is separate from all admin/Telegram/profiler tokens;
  rotate it if exposed. Commands expire if no controller claims them within
  five minutes. Online means a heartbeat received within 60 seconds.
- Logs can include private or sensitive metadata. Review log retention before
  enabling this feature. Only authorized admins can retrieve command results.
- **Pause** rejects new local profiler writes while the listener stays connected.
  The existing separate Supabase Evie Admin inbox can continue to receive
  events; stop `listener` to suspend both destinations. Events skipped while
  paused are not guaranteed to be restored later.
- The Telegram session remains private; only one active session worker runs.
  A separate continuous backfill session and bot-send endpoint are not added.
- X/Snapchat personal DM integrations and payment verification are not implied
  by the control bridge.

### Validation and deployment status

Run `python -m pytest -q` to exercise the local API and control allowlist tests.
The SQL/Edge deployment is **not executed** by this package and has to be
applied to your connected Supabase project. The controller cannot be live until
those steps and the new token are completed.