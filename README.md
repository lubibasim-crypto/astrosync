# AstroSync

Marketing website for **AstroSync** — a Houston social-media marketing agency — with a built-in
**admin panel** for editing all site content. Built to run locally with **zero external
dependencies**: no npm, no pip, no CDN. Fonts are self-hosted; the backend is pure Python
standard library.

Brand: *Nova Spectrum*-derived palette matched to the logo — teal · deep teal · navy · mint,
dark-first with a light/dark toggle.

---

## Quick start

You need **Python 3.8+** (tested on 3.14). No installation required.

```bash
python server.py
```

Then open:

- Website → http://127.0.0.1:8000
- Admin   → http://127.0.0.1:8000/admin.html

Stop with `Ctrl+C`.

Options (environment variables):

```bash
PORT=9000 python server.py            # change port
HOST=0.0.0.0 python server.py         # expose on your LAN
ADMIN_PASSWORD="my-secret" python server.py   # set / change the admin password
```

### Admin login

Default password: **`astrosync`** — change it by running once with `ADMIN_PASSWORD=...`
(it is stored hashed in `data/admin.db`, which is git-ignored), or set it permanently in your
host's environment.

---

## How content editing works

The whole site is **data-driven**. Every headline, card, price, testimonial, contact detail
and brand color comes from one content model.

1. `assets/content.js` — the built-in **default content** (also the offline fallback).
2. The site loads content in this order: **backend API → this browser's localStorage → bundled defaults**.
3. The **admin panel** edits that model and saves it via `PUT /api/content`, which writes
   `data/content.json`. That file is the persisted, deployable source of truth — commit it to
   keep changes.
4. Editing the **brand colors** in the admin updates the entire palette live (CSS variables).

### Offline / no-server mode
Opening the `.html` files directly (file://) still works — the site uses the bundled defaults
(or whatever this browser saved). In the admin, if no server is running you can still edit and
**Export** a `content.json` to drop into `data/`.

---

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home — hero with 3D revolving social sphere, why-us, services, results, testimonials |
| `services.html` | Services + process |
| `work.html` | Case studies + testimonials |
| `pricing.html` | Plans + FAQ |
| `about.html` | Story, dual-team, values |
| `contact.html` | Audit request form + contact info |
| `admin.html` | Content control panel (separate design) |

Shared: `assets/site.css`, `assets/site.js`, `assets/content.js`, self-hosted fonts in
`assets/fonts/`, and the logo mark `assets/mark.svg` (recreated, transparent, theme-adaptive).

---

## API (used by the admin)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/content` | – | Current content (404 if never saved → site uses defaults) |
| `PUT` | `/api/content` | Bearer token | Save content (writes `data/content.json`) |
| `POST`| `/api/login` | – | `{ "password": "…" }` → `{ "token": "…" }` |
| `GET` | `/api/health` | – | Health check |

> Auth is a signed token suitable for a local/single-admin tool. For a public deployment,
> put it behind HTTPS and a strong `ADMIN_PASSWORD`.

---

## Deploy

Any host that runs Python works (Render, Railway, Fly, a VPS, etc.). Start command:
`python server.py` with `PORT` provided by the host and a strong `ADMIN_PASSWORD` set.
Commit `data/content.json` to ship your edited content.
