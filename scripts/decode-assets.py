#!/usr/bin/env python3
"""Rebuild binary site assets from assets-src/*.b64 using the manifest.

Used as the Render build command, and at static-server startup if files
are missing or their sha256 does not match. Stdlib only.
"""
from __future__ import annotations

import base64
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets-src" / "manifest.json"


def load_manifest() -> dict:
    if not MANIFEST.is_file():
        raise SystemExit(f"missing manifest: {MANIFEST}")
    return json.loads(MANIFEST.read_text())


def assemble(parts: list[str]) -> bytes:
    chunks: list[str] = []
    for rel in parts:
        path = ROOT / rel
        if not path.is_file():
            raise FileNotFoundError(rel)
        chunks.append("".join(path.read_text().split()))
    return base64.b64decode("".join(chunks), validate=True)


def decode(force: bool = False) -> int:
    doc = load_manifest()
    written = 0
    checked = 0
    for item in doc["files"]:
        dest = ROOT / item["path"]
        expected = item["sha256"]
        if dest.is_file() and not force:
            got = hashlib.sha256(dest.read_bytes()).hexdigest()
            if got == expected:
                checked += 1
                continue
        data = assemble(item["parts"])
        got = hashlib.sha256(data).hexdigest()
        if got != expected:
            raise SystemExit(f"sha256 mismatch for {item['path']}: got {got}, expected {expected}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".tmp")
        tmp.write_bytes(data)
        tmp.replace(dest)
        written += 1
        print(f"wrote {item['path']} ({item['bytes']} bytes)")
    print(f"decode-assets: {written} written, {checked} already ok, {len(doc['files'])} total")
    return 0


if __name__ == "__main__":
    force = "--force" in sys.argv
    raise SystemExit(decode(force=force))
