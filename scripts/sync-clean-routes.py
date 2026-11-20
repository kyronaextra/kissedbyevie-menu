#!/usr/bin/env python3
"""Copy canonical pages into clean-route directories.

Edit the root HTML files, then run this script. Directory indexes are what
Render and a normal static server serve for /menu, /menu/, and the other
clean paths.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(relative, text):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print('wrote', relative)


def main():
    menu = (ROOT / 'index.html').read_text()
    menu = menu.replace(
        '<meta property="og:url" content="https://kissedbyevie-menu.onrender.com/">',
        '<meta property="og:url" content="https://kissedbyevie-menu.onrender.com/menu">',
        1,
    )
    menu = menu.replace(
        '<link rel="canonical" href="https://kissedbyevie-menu.onrender.com/">',
        '<link rel="canonical" href="https://kissedbyevie-menu.onrender.com/menu">',
        1,
    )
    menu = menu.replace(
        '<title>Everything I Sell | Kissed by Evie</title>',
        '<title>Menu | Kissed by Evie</title>',
        1,
    )
    write('menu/index.html', menu)
    for name in ('checkout.html', 'gallery.html', 'about.html'):
        slug = name.replace('.html', '')
        write(f'{slug}/index.html', (ROOT / name).read_text())


if __name__ == '__main__':
    main()
