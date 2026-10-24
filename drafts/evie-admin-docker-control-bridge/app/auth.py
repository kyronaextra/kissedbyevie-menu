"""Fail-closed tokens and tamper-proof short-lived read sessions."""
from __future__ import annotations
import base64
import hashlib
import hmac
import os
import secrets
import time
from fastapi import Cookie, Header, HTTPException, Request

COOKIE_NAME = "profiler_read"
SESSION_SECONDS = 12 * 60 * 60


def _required(name: str) -> str:
    value = os.getenv(name, "")
    if len(value) < 32 or value.startswith("REPLACE_"):
        raise RuntimeError(f"{name} must be configured as a random secret of at least 32 characters")
    return value


MASTER = _required("PROFILER_TOKEN")
READ = _required("PROFILER_READ_TOKEN")
SESSION_SECRET = _required("SESSION_SECRET").encode("utf-8")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"


def constant_match(candidate: str, expected: str) -> bool:
    return bool(candidate) and hmac.compare_digest(candidate, expected)


def new_session() -> str:
    payload = f"{int(time.time())}.{secrets.token_urlsafe(18)}"
    mac = hmac.new(SESSION_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}.{mac}".encode()).decode().rstrip("=")


def valid_session(token: str) -> bool:
    if not token or len(token) > 500:
        return False
    try:
        decoded = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode()
        timestamp, nonce, signature = decoded.split(".")
        if not nonce or len(nonce) > 64 or not timestamp.isdigit():
            return False
        issued = int(timestamp)
        if issued > time.time() + 60 or issued + SESSION_SECONDS < time.time():
            return False
        message = f"{timestamp}.{nonce}".encode()
        expected = hmac.new(SESSION_SECRET, message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)
    except (ValueError, UnicodeDecodeError):
        return False


def auth_read(profiler_read: str | None = Cookie(default=None)) -> None:
    if not valid_session(profiler_read or ""):
        raise HTTPException(status_code=401, detail="Read login required")


def auth_master(authorization: str = Header(default="")) -> None:
    if not authorization.startswith("Bearer ") or not constant_match(authorization[7:], MASTER):
        raise HTTPException(status_code=401, detail="Worker authorization required")


def require_same_origin(request: Request) -> None:
    """For cookie-authenticated state-changing requests, reject cross-origin browsers."""
    origin = request.headers.get("origin")
    if origin:
        expected = str(request.base_url).rstrip("/")
        configured = os.getenv("PUBLIC_ORIGIN", "").rstrip("/")
        if origin not in {expected, configured}:
            raise HTTPException(status_code=403, detail="Origin denied")