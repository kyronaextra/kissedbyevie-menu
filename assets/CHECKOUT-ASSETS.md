# Checkout charms, stickers, and backgrounds

These are layout placeholders so the checkout wizard can be reviewed now.
When Evie sends the real asset folder, drop the finals in here using the same filenames.
Do not change the paths in checkout.html or checkout.css unless a filename itself changes.

Recommended format: square 512×512 WebP (or SVG) with a transparent background, except the background overlays.

## Charms — `/assets/charms/`
Used on bag lines and summaries. The checkout picks a charm from the product name.

| File | Used for |
| --- | --- |
| `heart-padlock.webp` | Deluxe / Dropbox / vault items |
| `crown.webp` | VIP |
| `phone.webp` | Customs |
| `gift.webp` | Bundles and other items |
| `cherries.webp` | Decorative + 20-for-$20 / sweet items |
| `butterfly.webp` | Decorative fallback |

## Stickers — `/assets/stickers/`
Chrome/candy stickers around the checkout chrome (not portraits).

| File | Used for |
| --- | --- |
| `lips.webp` | Header logo and “Mwah. Got it” hero |
| `heart.webp` | Accents |
| `heart-melt.webp` | Accents |
| `sparkles.webp` | Header and confirmation sparkles |
| `star.webp` | Confirmation sparkles |
| `bow.webp` | Decorative bow |
| `heart-outline.webp` | Accents |
| `butterfly.webp` | Step 1 corner butterfly |

Existing real Evie likeness sticker (do not replace with a generated lookalike):

- `/assets/stickers/see-menu-sticker.webp`

## Backgrounds — `/assets/backgrounds/`

| File | Used for |
| --- | --- |
| `sparkle.webp` | Dark sparkle page background |
| `pink-swirl.webp` | Soft swirl overlay |

Placeholder only. Swap files, keep names.


## Source of current art

These files were copied from Evie’s t276u glass-checkout style reference (inline WebP/SVG, no remote scripts). They are still swappable: drop her final folder here using the same names.

From the style reference:
- `charms/heart-padlock.webp` — heart vault lock
- `charms/butterfly.webp` and `stickers/butterfly.webp` — chrome butterfly
- `stickers/bow.webp` — chrome bow
- `stickers/lips.webp` and `stickers/lips.svg` — lips mark (header + confirmation)

Still layout placeholders until finals arrive:
- `charms/crown.webp`, `charms/phone.webp`, `charms/gift.webp`, `charms/cherries.webp`
- `stickers/heart.webp`, `heart-melt.webp`, `heart-outline.webp`, `sparkles.webp`, `star.webp`
- `backgrounds/sparkle.webp`, `backgrounds/pink-swirl.webp`

Do not replace `see-menu-sticker.webp` with a generated lookalike.

## Brand marks (t277u / t278u)

Real neon logos live in `/assets/brand/`. Cash App and Stripchat are wired. PayPal, Amazon, X, OnlyFans, Telegram, and Dropbox slots use the same filenames once Evie’s files are cut with `scripts/cut-brand-marks.py`. The cherries charm was cropped from Evie’s wordmark logo.
