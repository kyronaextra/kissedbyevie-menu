"""Read-only personal Telegram inbox listener for Evie Admin.

Never sends messages, downloads attachments, exports sessions, or logs message
bodies. Updates only a scoped admin follow-up queue through Supabase HTTPS.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.tl.types import User


BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env", override=False)
LOG = logging.getLogger("evie.telegram_inbox")
EXPECTED_API_HOST = "cmjhecwwjoeqpcownkol.supabase.co"
EXPECTED_API_PATH = "/functions/v1/evie-inbox-ingest"
API_ENDPOINT = f"https://{EXPECTED_API_HOST}{EXPECTED_API_PATH}"


@dataclass(frozen=True)
class Settings:
    api_id: int
    api_hash: str
    session_path: Path
    ingest_token: str
    backfill_limit: int
    preview_mode: str


def settings(mode: str) -> Settings:
    try:
        api_id = int(os.getenv("TELEGRAM_API_ID", "0"))
    except ValueError as exc:
        raise RuntimeError("TELEGRAM_API_ID must be a positive integer") from exc
    api_hash = os.getenv("TELEGRAM_API_HASH", "").strip()
    if api_id <= 0 or len(api_hash) != 32:
        raise RuntimeError("Set TELEGRAM_API_ID and TELEGRAM_API_HASH from my.telegram.org")
    token = os.getenv("EVIE_INBOX_WORKER_TOKEN", "").strip()
    if mode == "listen" and (
        not token.startswith("evi_tg_") or len(token) != 50
    ):
        raise RuntimeError("Paste the one-time Telegram key from Evie Admin into .env")
    session_value = os.getenv("TELEGRAM_SESSION_PATH", str(BASE / "private" / "account"))
    session_path = Path(session_value).expanduser().resolve()
    session_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    limit = os.getenv("TELEGRAM_BACKFILL_LIMIT", "40").strip()
    if not limit.isdigit() or not 0 <= int(limit) <= 100:
        raise RuntimeError("TELEGRAM_BACKFILL_LIMIT must be 0–100")
    mode_name = os.getenv("TELEGRAM_MESSAGE_PREVIEW", "off").strip().lower()
    if mode_name not in {"off", "snippet"}:
        raise RuntimeError("TELEGRAM_MESSAGE_PREVIEW must be off or snippet")
    endpoint = urlsplit(API_ENDPOINT)
    if endpoint.scheme != "https" or endpoint.hostname != EXPECTED_API_HOST or endpoint.path != EXPECTED_API_PATH:
        raise RuntimeError("Unexpected secure intake URL")
    return Settings(api_id, api_hash, session_path, token, int(limit), mode_name)


def display_name(chat: User) -> str:
    name = " ".join(filter(None, [getattr(chat, "first_name", ""), getattr(chat, "last_name", "")]))
    return (name or getattr(chat, "username", None) or f"Telegram user {chat.id}")[:100]


def preview_for(message, outbound: bool, mode: str) -> str:
    if mode == "snippet":
        value = " ".join((message.raw_text or "").split())[:160]
        if value:
            return value
    if getattr(message, "photo", None):
        kind = "photo"
    elif getattr(message, "video", None):
        kind = "video"
    elif getattr(message, "voice", None):
        kind = "voice note"
    elif getattr(message, "document", None):
        kind = "attachment"
    else:
        kind = "message"
    return ("You sent a " if outbound else "New Telegram ") + kind


class FollowUpForwarder:
    def __init__(self, config: Settings, client: httpx.AsyncClient):
        self.config = config
        self.http = client
        self.auth_rejected = False

    async def send(self, payload: dict) -> bool:
        if self.auth_rejected:
            return False
        headers = {"Authorization": "Bearer " + self.config.ingest_token}
        for attempt in range(3):
            try:
                result = await self.http.post(API_ENDPOINT, json=payload, headers=headers)
                if result.status_code == 200:
                    return True
                if result.status_code == 401:
                    LOG.error("Connection key expired or revoked. Generate a new one in Evie Admin.")
                    self.auth_rejected = True
                    return False
                if result.status_code in {400, 403, 405, 413}:
                    LOG.error("Inbox event not accepted (%s). No message data was logged.", result.status_code)
                    return False
                LOG.warning("Inbox temporarily unavailable (%s), retrying.", result.status_code)
            except (httpx.TimeoutException, httpx.TransportError):
                LOG.warning("Inbox network temporarily unavailable, retrying.")
            if attempt < 2:
                await asyncio.sleep((attempt + 1) * 2)
        return False

    async def heartbeat(self):
        while True:
            await self.send({"type": "heartbeat"})
            await asyncio.sleep(60)

    async def message(self, msg, chat: User, my_id: int):
        if not chat or not isinstance(chat, User):
            return
        if chat.bot or chat.id == my_id or getattr(chat, "deleted", False):
            return
        if not getattr(msg, "id", None) or not getattr(msg, "date", None):
            return
        when = msg.date
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        if when < datetime.now(timezone.utc) - timedelta(days=44):
            return
        outgoing = bool(msg.out)
        payload = {
            "platform": "telegram",
            "thread_id": str(chat.id),
            "event_id": "tg:" + str(chat.id) + ":" + str(msg.id),
            "display_name": display_name(chat),
            "username": ("@" + chat.username) if chat.username else "",
            "direction": "outbound" if outgoing else "inbound",
            "preview": preview_for(msg, outgoing, self.config.preview_mode),
            "occurred_at": when.isoformat(),
        }
        await self.send(payload)


async def login(config: Settings):
    client = TelegramClient(str(config.session_path), config.api_id, config.api_hash)
    try:
        # Interactive login happens on this trusted device only. No codes or
        # Telegram session credentials are sent to the website.
        await client.start()
        account = await client.get_me()
        if not account:
            raise RuntimeError("Telegram did not authorize the account")
        LOG.info("Telegram account authorized. No messages have been forwarded.")
        file = Path(str(config.session_path) + ".session")
        if file.exists() and os.name != "nt":
            file.chmod(0o600)
    finally:
        await client.disconnect()


async def listen(config: Settings):
    # One active Telethon user session per listener; do not start this process
    # simultaneously on your PC and in Docker using the same session file.
    telegram = TelegramClient(str(config.session_path), config.api_id, config.api_hash,
                              auto_reconnect=True, catch_up=True, receive_updates=True)
    await telegram.connect()
    try:
        if not await telegram.is_user_authorized():
            raise RuntimeError("Telegram isn't logged in. Run: python telegram_inbox.py login")
        account = await telegram.get_me()
        if not account:
            raise RuntimeError("Cannot read Telegram account")
        LOG.info("Connected to your personal Telegram account in read-only mode.")
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(12.0, connect=6.0),
            limits=httpx.Limits(max_connections=5),
            follow_redirects=False,
        ) as http:
            worker = FollowUpForwarder(config, http)
            first_heartbeat = await worker.send({"type": "heartbeat"})
            if not first_heartbeat:
                raise RuntimeError("Evie Admin did not accept the connection key. Check it in .env.")
            LOG.info("Evie Admin intake connected. Automatic replies are OFF.")
            heartbeat = asyncio.create_task(worker.heartbeat())
            try:
                @telegram.on(events.NewMessage())
                async def on_new(event):
                    if not event.is_private or not event.message:
                        return
                    try:
                        chat = await event.get_chat()
                        await worker.message(event.message, chat, account.id)
                    except Exception:
                        LOG.exception("Could not forward a Telegram message event; content not logged.")

                # One most-recent event per chat is enough to identify
                # existing unreplied DMs. Does NOT scrape conversation history.
                if config.backfill_limit:
                    count = 0
                    async for dialog in telegram.iter_dialogs(limit=config.backfill_limit):
                        if not dialog.is_user or not isinstance(dialog.entity, User):
                            continue
                        if not dialog.message or dialog.entity.bot:
                            continue
                        await worker.message(dialog.message, dialog.entity, account.id)
                        count += 1
                    LOG.info("Checked last message of %s recent private conversations.", count)
                LOG.info("Listening for new incoming and outgoing private messages. Ctrl+C stops.")
                await telegram.run_until_disconnected()
            finally:
                heartbeat.cancel()
                try:
                    await heartbeat
                except asyncio.CancelledError:
                    pass
    finally:
        await telegram.disconnect()


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    # Silence library debug logs that could expose chat identifiers or session internals.
    logging.getLogger("telethon").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    command = sys.argv[1] if len(sys.argv) > 1 else "listen"
    if command not in {"login", "listen"}:
        print("Usage: python telegram_inbox.py login | listen", file=sys.stderr)
        raise SystemExit(2)
    try:
        asyncio.run(login(settings(command)) if command == "login" else listen(settings(command)))
    except KeyboardInterrupt:
        LOG.info("Stopped personal Telegram listener.")
    except Exception as exc:
        LOG.error("Listener stopped: %s", str(exc).splitlines()[0][:220])
        raise SystemExit(1)


if __name__ == "__main__":
    main()
