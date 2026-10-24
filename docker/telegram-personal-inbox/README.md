# Personal Telegram → Evie Admin message inbox

This is for your **personal Telegram account**, NOT a BotFather bot or your
existing `nightshift-telegram-bot` service. It uses Telethon (MTProto)
and only reports your **private 1:1 message events** to the already-protected
Evie Admin follow-up queue.

**It never sends or reacts to Telegram messages.** It does not touch
`client.py`, the old autonomous-reply code, or the Render bot webhook.
It also never stores your Telegram login session on the public website,
in Supabase, or on GitHub.

## Start on Windows (recommended for private sessions)

1. Open https://kissedbyevie-menu.onrender.com/admin.html and log in as an
   approved administrator.
2. Under **Message Inbox → Personal Telegram account**, select **Generate
   secure connection key**. Copy it once. It is limited to incoming event
   forwarding, expires after 180 days and can be revoked from Admin.
3. Open https://my.telegram.org in a browser and choose **API development
   tools**. Create an app to obtain your `api_id` and `api_hash`. These are
   **not** BotFather values.
4. Get these files onto the Windows computer that will stay online.
   Open PowerShell in the `docker/telegram-personal-inbox` folder.
5. Set up a private local environment:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   py -3 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

   Fill the `.env` values for `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`
   and `EVIE_INBOX_WORKER_TOKEN`. Never post these values in chat.

6. Authorize your personal Telegram session on **your own computer**.
   This prompts for your Telegram number, a Telegram login code, and possibly
   your two-step password. **Never send the code or session file to anyone.**

   ```powershell
   .\.venv\Scripts\python.exe telegram_inbox.py login
   ```

7. Start the private listener and keep it running when you want to receive
   updates:

   ```powershell
   .\.venv\Scripts\python.exe telegram_inbox.py listen
   ```

8. In Evie Admin the Telegram status changes to **online** when a worker
   heartbeat is received (normally within 60 seconds). Incoming Telegram
   DMs become **Needs reply**; outgoing messages become **Waiting**.

Your computer must be awake and connected for this to be live. If it's
offline, the dashboard shows the last synced state but not new updates.
The initial backfill checks only the most recent message from at most 40
private conversations (within 44 days), so you can see who already needs
a reply. Set `TELEGRAM_BACKFILL_LIMIT=0` to avoid backfill.

## Docker alternative (on your own trusted PC/server)

1. Complete steps 1–5 above, including the private `.env`.
2. Make sure Docker is installed, and run:

   ```sh
   docker compose build
   docker compose run --rm telegram-personal-inbox python telegram_inbox.py login
   docker compose up -d
   docker compose logs -f telegram-personal-inbox
   ```

3. The `private/` folder is mounted to the container so the session
   survives restarts. Stop with `docker compose down`.

**Never start both the Windows process and the Docker process on the
same session file at the same time.** Don't run another Telethon instance
(`client.py`) using that same session.

## Security and privacy

- Telegram's `*.session` file is effectively an **account credential**.
  Keep it local, restrict file permissions, and never put it in GitHub,
  cloud drive, public logs, the admin website, or messages.
- The per-listener key is scoped to the Supabase inbox ingest endpoint;
  it cannot use your Telegram account or read member records. It can be
  revoked independently from the Telegram session.
- There are no inbound HTTP ports, external webhooks, auto replies,
  scheduled messages, or hidden bot markers.
- By default `TELEGRAM_MESSAGE_PREVIEW=off` shares only message type,
  sender name, username, direction, timestamp and message ID with the
  private Evie Admin inbox. Set `snippet` to store up to 160 characters
  per new event on Supabase; consider the privacy implications.
- Private 1:1 conversations with other humans are tracked; groups,
  channels, Saved Messages and Telegram bots are excluded.
- Missing Telegram updates while your device is offline may be caught
  on reconnection, but no always-on guarantee exists on an offline PC.
- To revoke a compromised session, use Telegram **Settings → Devices**
  and terminate that session. To revoke the forwarding key, use Evie Admin
  → Personal Telegram account → Revoke access.
- You must comply with Telegram's developer rules and only connect
  accounts you control. Do not share other participants' messages outside
  their expected private audience.

Official help: https://core.telegram.org/api/obtaining_api_id
Telethon sessions: https://docs.telethon.dev/en/stable/concepts/sessions.html
