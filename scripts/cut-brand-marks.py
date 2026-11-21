#!/usr/bin/env python3
"""Knock black out of Evie's neon logos and save swappable WebP under assets/brand/.

Run from the repo root (or anywhere). Known attachment hashes are tried first;
you can also pass image paths:  python3 scripts/cut-brand-marks.py name=path.jpg
"""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand"
BRIEFS = Path("/workspace/evie-briefs")
ATT = Path("/home/box/agent-data/agents/55241869-18a4-4dc6-a363-b0e1726a1946/attachments")

# name -> (attachment filename, optional mark crop box on the original JPG)
KNOWN = {
    "x": "c32dfcef9aa0f1eea6ff30a851210c7f4d6073736e4508af8c79a959d33399d0.jpg",
    "onlyfans": "645f724952c8bcbc86e5c561ebc298f15015bafb37098a063202a464fecedd02.jpg",
    "dropbox": "a29dc4870950bd49492da7f7e936cf1fb620568626277d5ac2f052d5039e5279.jpg",
    "telegram": "3a464ed3e3abed088820dc92d0dcf4587dcc57366e1367323565284f100145b1.jpg",
    "cashapp": "42f6ea0eb17b6721081b7594ebc456ecb05756f9fb3e5f03e5b936e320ca8983.jpg",
    "stripchat": "4aeb23df8007bd74d2e7ec0b3977cc9bb57fb8c643cdf1bcc7c5fbe0935f681b.jpg",
    "paypal": "d64aa5251426868e9915cccd227745658109886ca1fd73cf7a056d1951f51843.jpg",
    "amazon": "9b53097e3c2ea49757ccf6d5293ff5019e860243586d2506f6aeb9bd8b5910eb.jpg",
}
# Earlier t277u/t278u hashes, tried if the t279u file is not on disk yet.
KNOWN_FALLBACK = {
    "x": "c025f785b1c50765350db498b5e141da137e82d08938034a4e7de50fcd822040.jpg",
    "onlyfans": "e9712228f42d0f7b5586964c07c06f6ae05a38381ccf50c86380cb770c77dc6a.jpg",
    "dropbox": "142bd4f2bd02280a4331f5850483035a06437a2d7901a7ae2bde3a46ec79ae4f.jpg",
    "telegram": "63de0b1f2aef2bbe03d6d70babc1b3865634ba3f2fdb14d42e74b3d81ac95ab3.jpg",
    "paypal": "37a7ba9c85dce0bd8cabca93cb5906fd8ca40af9f255823ca7ea27166d1aafaa.jpg",
    "amazon": "553bc6c205c748ed4dc5adc2e7768f68d3e813f8bd12c19793eb18f69ce42323.jpg",
}

# Official Dropbox folder from Evie, t280u. These beat earlier attachment hashes.
T280U = Path("/workspace/evie-assets/x")
T280U_SOURCES = {
    "x": T280U / "Photo Nov 21 2026, 6 53 40 AM (4) (1).png",
    "onlyfans": T280U / "Photo Nov 21 2026, 6 53 40 AM (4).png",
    "dropbox": T280U / "Photo Nov 21 2026, 6 53 40 AM (6).png",
    "telegram": T280U / "Photo Nov 21 2026, 6 53 40 AM (2).png",
    "cashapp": T280U / "Photo Nov 21 2026, 6 53 40 AM (3).png",
    "stripchat": T280U / "Photo Nov 21 2026, 6 23 03 AM.png",
    "paypal": T280U / "Photo Nov 21 2026, 6 53 40 AM.png",
    "amazon": T280U / "Photo Nov 21 2026, 6 53 40 AM (1).png",
    "logo_sticker": T280U / "Photo Nov 21 2026, 6 53 40 AM (5).png",
    "logo_poster": T280U / "Photo Nov 21 2026, 6 53 40 AM.jpg",
}

# Hand-tuned mark crops (x0,y0,x1,y1) on the official 1536x1024 t280u PNGs.
# Amazon has no clean standalone icon; use the full wordmark instead of a mark.
MARK_BOX = {
    "cashapp": (0, 180, 500, 860),
    "stripchat": (0, 200, 400, 760),
    "telegram": (360, 0, 1180, 640),
    "paypal": (0, 180, 490, 860),
    "dropbox": (80, 300, 460, 700),
    "x": (250, 40, 1300, 980),
    "onlyfans": (10, 300, 400, 800),
}


def knockout(im: Image.Image, lo: int = 8, hi: int = 42) -> Image.Image:
    rgb = im.convert("RGB")
    arr = np.array(rgb)
    mx = np.maximum(np.maximum(arr[:, :, 0], arr[:, :, 1]), arr[:, :, 2]).astype(np.int16)
    alpha = np.clip((mx - lo) * (255.0 / (hi - lo)), 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([arr, alpha]), "RGBA")


def tight_crop(im: Image.Image, pad: int = 16, thresh: int = 12) -> Image.Image:
    a = np.array(im)
    ys, xs = np.where(a[:, :, 3] > thresh)
    if xs.size == 0:
        return im
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(im.width, int(xs.max()) + 1 + pad)
    y1 = min(im.height, int(ys.max()) + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def cap(im: Image.Image, max_side: int = 1000) -> Image.Image:
    w, h = im.size
    if max(w, h) <= max_side:
        return im
    scale = max_side / max(w, h)
    return im.resize((int(round(w * scale)), int(round(h * scale))), Image.Resampling.LANCZOS)


def save_webp(im: Image.Image, dest: Path, quality: int = 90) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=quality, method=6)


def square_mark(rgba: Image.Image, box, fade_right: int = 14, size: int = 512) -> Image.Image:
    mark = rgba.crop(box)
    if fade_right:
        ch = np.array(mark)
        for i in range(fade_right):
            ch[:, -1 - i, 3] = (ch[:, -1 - i, 3] * ((i + 1) / (fade_right + 1))).astype(np.uint8)
        mark = Image.fromarray(ch, "RGBA")
    w, h = mark.size
    side = max(w, h) + 8
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(mark, ((side - w) // 2, (side - h) // 2), mark)
    return sq.resize((size, size), Image.Resampling.LANCZOS)


def process_one(name: str, src: Path) -> list[Path]:
    written = []
    raw = Image.open(src)
    BRIEFS.mkdir(exist_ok=True)
    brief = BRIEFS / f"logo_{name}_src.jpg"
    if src.resolve() != brief.resolve():
        try:
            Image.open(src).convert("RGB").save(brief, "JPEG", quality=95)
        except Exception:
            pass
    rgba = knockout(raw)
    word = cap(tight_crop(rgba))
    dest = BRAND / f"{name}.webp"
    save_webp(word, dest)
    written.append(dest)
    print(f"{name}: {dest.relative_to(ROOT)} {dest.stat().st_size}B {word.size}")
    box = MARK_BOX.get(name)
    if box:
        mark = square_mark(rgba, box)
        md = BRAND / f"{name}-mark.webp"
        save_webp(mark, md)
        written.append(md)
        print(f"{name} mark: {md.relative_to(ROOT)} {md.stat().st_size}B")
    return written


def find_src(name: str, override: Path | None = None) -> Path | None:
    if override and override.exists():
        return override
    official = T280U_SOURCES.get(name)
    if official and official.exists():
        return official
    names = [KNOWN.get(name), KNOWN_FALLBACK.get(name)]
    for fn in names:
        if not fn:
            continue
        for d in (ATT, Path(str(ATT).replace("/agent-data/", "/sand-data/"))):
            p = d / fn
            if p.exists():
                return p
    # already-copied brief
    for p in list(BRIEFS.glob(f"logo_{name}*.png")) + list(BRIEFS.glob(f"logo_{name}*.jpg")):
        return p
    return None


def main(argv: list[str]) -> int:
    overrides = {}
    names = []
    for arg in argv:
        if "=" in arg:
            k, v = arg.split("=", 1)
            overrides[k] = Path(v)
            names.append(k)
        else:
            names.append(arg)
    if not names:
        names = list(KNOWN)
    missing = []
    for name in names:
        src = find_src(name, overrides.get(name))
        if not src:
            missing.append(name)
            continue
        process_one(name, src)
    if missing:
        print("not on disk yet:", ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
