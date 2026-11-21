# Brand assets

Evie’s real logos. Black backgrounds were removed (soft alpha from brightness). Swap a file in place to update the site. Prefer the WebP.

| File | Use |
| --- | --- |
| `logo.webp` | Header, home hero, checkout masthead |
| `og-image.jpg` / `og-image.webp` | Open Graph / link previews |
| `favicon-32.png`, `apple-touch-icon.png`, `../../favicon.ico` | Favicons (cherries crop) |
| `cashapp.webp` / `cashapp-mark.webp` | Cash App checkout tile and payment panel |
| `stripchat.webp` / `stripchat-mark.webp` | Stripchat social links, feed show posts, checkout contact chip |
| `paypal.webp` | PayPal checkout tile and panel (when Evie’s file is cut in) |
| `amazon.webp` | Amazon E-gift checkout tile and panel (when Evie’s file is cut in) |
| `x.webp`, `onlyfans.webp`, `telegram.webp` | Social links and contact chips (when Evie’s files are cut in) |
| `dropbox.webp` | Dropbox category, Deluxe hero, order-summary charm (when Evie’s file is cut in) |

Cherries-and-bow from the wordmark also live at `/assets/charms/cherries.webp`.

To cut a new neon-on-black JPG: `python3 scripts/cut-brand-marks.py paypal=/path/to.jpg`
