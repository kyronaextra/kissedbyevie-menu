"""One private Telethon session -> local profiler + existing Evie Admin inbox.

Never sends Telegram messages, reads channels, or exports session credentials.
The existing Evie Admin inbox uses a scoped, revocable worker key.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from telethon import TelegramClient, events
from telethon.tl.types import User

LOG = logging.getLogger("evie.listener")
EVIE_INGEST = "https://cmjhecwwjoeqpcownkol.supabase.co/functions/v1/evie-inbox-ingest"


def config() -> dict:
    try:
        api_id = int(os.getenv("TELEGRAM_API_ID", "0"))
    except ValueError as exc:
        raise RuntimeError("TELEGRAM_API_ID must be a number") from exc
    api_hash = os.getenv("TELEGRAM_API_HASH", "").strip()
    if api_id <= 0 or len(api_hash) != 32:
        raise RuntimeError("Fill TELEGRAM_API_ID and TELEGRAM_API_HASH from my.telegram.org")
    session = Path(os.getenv("TELEGRAM_SESSION_PATH", "/app/private/account"))
    session.parent.mkdir(parents=True, exist_ok=True)
    mode = os.getenv("TELEGRAM_MESSAGE_PREVIEW", "off").lower()
    if mode not in {"off", "snippet"}:
        raise RuntimeError("TELEGRAM_MESSAGE_PREVIEW must be off or snippet")
    token = os.getenv("PROFILER_TOKEN", "")
    if len(token) < 32 or token.startswith("REPLACE_"):
        raise RuntimeError("Configure the private PROFILER_TOKEN")
    external = os.getenv("EVIE_INBOX_WORKER_TOKEN", "").strip()
    if external and (not external.startswith("evi_tg_") or len(external) != 50):
        raise RuntimeError("EVIE_INBOX_WORKER_TOKEN must be a real scoped Evie Admin token")
    backfill = min(100, max(0, int(os.getenv("TELEGRAM_BACKFILL_LIMIT", "40"))))
    return dict(api_id=api_id, api_hash=api_hash, session=session,
                preview_mode=mode, local_api=os.getenv("LOCAL_API_URL", "http://api:8000").rstrip("/"),
                token=token, external_token=external, backfill=backfill)


def preview(message, preview_mode: str) -> str:
    if preview_mode == "snippet" and getattr(message, "message", None):
        return message.message[:160]
    return "Media message" if getattr(message, "media", None) else "Private message"


def display_name(person: User) -> str:
    return " ".join(filter(None, [person.first_name, person.last_name])).strip() or person.username or "Telegram user"


async def post_with_retries(client: httpx.AsyncClient, url: str, payload: dict, token: str) -> bool:
    for attempt in range(3):
        try:
            response = await client.post(url, json=payload, headers={"Authorization": "Bearer " + token})
            if 200 <= response.status_code < 300:
                return True
            if response.status_code in {400, 401, 403, 413}:
                LOG.error("Event rejected by receiver (%d); no message body logged", response.status_code)
                return False
            LOG.warning("Receiver temporarily unavailable (HTTP %d)", response.status_code)
        except httpx.RequestError:
            LOG.warning("Receiver temporarily unreachable")
        if attempt < 2:
            await asyncio.sleep(attempt + 1)
    return False


async def listen(cfg: dict) -> None:
    # Credentials remain on your trusted computer; one live process per session.
    telegram = TelegramClient(str(cfg["session"]), cfg["api_id"], cfg["api_hash"])
    await telegram.connect()
    if not await telegram.is_user_authorized():
        await telegram.disconnect()
        raise RuntimeError("Authorize once with: docker compose run --rm listener python -m app.listener login")
    account = await telegram.get_me()
    if not account:
        raise RuntimeError("Telegram session is not authorized")

    async with httpx.AsyncClient(timeout=12, limits=httpx.Limits(max_connections=5)) as http:
        local_url = cfg["local_api"] + "/ingest"

        async def report(message, person: User):
            if not isinstance(person, User) or person.bot or person.is_self or person.id == account.id:
                return
            date = message.date or datetime.now(timezone.utc)
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            event_id = f"tg:{person.id}:{message.id}"
            name = display_name(person)
            username = person.username or ""
            direction = "outbound" if message.out else "inbound"
            snippet = preview(message, cfg["preview_mode"])
            packet = {
                "platform": "telegram", "event_id": event_id,
                "chat_id": str(person.id), "sender_id": str(person.id),
                "username": username, "name": name, "text": snippet,
                "direction": direction, "ts": date.timestamp(),
            }
            ok = await post_with_retries(http, local_url, packet, cfg["token"])
            if not ok:
                LOG.warning("Could not save local event %s", event_id)
            if cfg["external_token"]:
                external = {
                    "platform": "telegram", "thread_id": "tg:" + str(person.id),
                    "event_id": event_id, "display_name": name,
                    "username": username, "direction": direction,
                    "preview": snippet, "occurred_at": date.isoformat(),
                }
                await post_with_retries(http, EVIE_INGEST, external, cfg["external_token"])

        @telegram.on(events.NewMessage(incoming=True, outgoing=True))
        async def new_message(event):
            if not event.is_private or not event.message:
                return
            try:
                person = await event.get_chat()
                if isinstance(person, User):
                    await report(event.message, person)
            except Exception:
                LOG.exception("Unable to ingest Telegram event (message body not logged)")

        if cfg["external_token"]:
            success = await post_with_retries(http, EVIE_INGEST, {"type": "heartbeat"}, cfg["external_token"])
            if not success:
                LOG.warning("Evie Admin bridge is not accepting the scoped token")

        if cfg["backfill"]:
            earliest = datetime.now(timezone.utc) - timedelta(days=44)
            try:
                async for dialog in telegram.iter_dialogs(limit=cfg["backfill"]):
                    person = dialog.entity
                    if not isinstance(person, User) or person.bot or person.is_self:
                        continue
                    recent = await telegram.get_messages(person, limit=1)
                    if recent and recent[0].date and recent[0].date >= earliest:
                        await report(recent[0], person)
            except Exception:
                LOG.exception("Backfill interrupted")

        async def heartbeat_loop():
            while True:
                if cfg["external_token"]:
                    await post_with_retries(http, EVIE_INGEST, {"type": "heartbeat"}, cfg["external_token"])
                await asyncio.sleep(60)

        job = asyncio.create_task(heartbeat_loop())
        LOG.info("Telegram listener active. Profiled events are read-only; no sending enabled")
        try:
            await telegram.run_until_disconnected()
        finally:
            job.cancel()
            await telegram.disconnect()


async def login(cfg: dict):
    client = TelegramClient(str(cfg["session"]), cfg["api_id"], cfg["api_hash"])
    await client.start()
    me = await client.get_me()
    print("Authenticated Telegram account:", getattr(me, "username", "(username unavailable)"))
    await client.disconnect()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    mode = sys.argv[1] if len(sys.argv) > 1 else "listen"
    if mode not in {"login", "listen"}:
        raise SystemExit("Usage: python -m app.listener login | listen")
    c = config()
    try:
        asyncio.run(login(c) if mode == "login" else listen(c))
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass