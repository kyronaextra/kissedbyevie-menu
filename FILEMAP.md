# Kissed by Evie — File Map

Quick index of the important HTML files so you can jump straight to the right place when editing context, copy, prices, or layout.

**Live site:** https://kissedbyevie-menu.onrender.com/

---

## Main public pages

| File | Purpose | Notes |
|------|---------|-------|
| `index.html` | Main menu / homepage | Primary storefront. Categories, bag, “How to pay”, tip section. |
| `menu/index.html` | Menu route (same content as index) | Used for `/menu` path. |
| `checkout.html` | Checkout page | Bag total, Venmo/Cash App/etc., proof upload, note field. |
| `checkout/index.html` | Checkout route | Same as `checkout.html` for clean URLs. |
| `about.html` | About page | Bio, photos, “About me” copy. |
| `about/index.html` | About route | Same content as `about.html`. |
| `gallery.html` | Public gallery | Curated photos. |
| `gallery/index.html` | Gallery route | |
| `photos.html` | Photo gallery page | |
| `disclosure.html` | Disclosure / legal | |
| `privacy.html` | Privacy page | |

---

## Member / account pages

| File | Purpose |
|------|---------|
| `account.html` | Member login / account area |
| `admin.html` | Evie Admin Control Room (protected) |
| `fulfillment.html` | Order fulfillment view |
| `editor.html` | Content editor |

---

## Other

| File | Purpose |
|------|---------|
| `bot-studio.html` | Bot studio page |
| `blog/agencies-are-shit-bots-suck.html` | Blog post |

---

## Key related files (not HTML)

- `Evie-Menu.json` — menu data / prices / items
- `app.js` — main menu logic
- `checkout.js` — checkout logic
- `checkout.css` — checkout styles
- `style.css` — main styles (if present)
- `admin.js` / `admin.css` — admin panel
- `account.js` / `account.css` — account pages

---

## Tips for editing

- Most copy and pricing live in `index.html` + `Evie-Menu.json` + the matching JS file.
- Checkout text and payment instructions are in `checkout.html` + `checkout.js`.
- After changing HTML/JS, push and the Render static site will pick it up on the next deploy.

Last updated: 2026-11-20
