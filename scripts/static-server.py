#!/usr/bin/env python3
"""Static server that matches Render's clean-route behavior.

/menu and /menu/ both return 200 with menu/index.html (the browser URL does
not change). /checkout.html and the other legacy files are served as files.
Query strings are left on the request path for the page to read.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CLEAN = {"menu", "checkout", "gallery", "about", "tip", "blog"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parts = urlsplit(self.path)
        bare = parts.path[:-1] if parts.path != "/" and parts.path.endswith("/") else parts.path
        name = bare[1:]
        index = ROOT / name / "index.html"
        if name in CLEAN and index.is_file():
            target = f"/{name}/index.html"
            if parts.query:
                target += "?" + parts.query
            self.path = target
        return super().do_GET()


def ensure_assets():
    """Rebuild binaries from assets-src if the Render build step did not run."""
    script = ROOT / "scripts" / "decode-assets.py"
    manifest = ROOT / "assets-src" / "manifest.json"
    if script.is_file() and manifest.is_file():
        import subprocess, sys
        subprocess.check_call([sys.executable, str(script)], cwd=str(ROOT))


if __name__ == "__main__":
    ensure_assets()
    server = ThreadingHTTPServer(("0.0.0.0", 4173), Handler)
    print("serving", ROOT, "on http://127.0.0.1:4173", flush=True)
    server.serve_forever()
