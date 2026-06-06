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

**Process hosts (Render, Railway, Fly, a VPS):** start command `python server.py`. The host
provides `PORT`; the server auto-binds `0.0.0.0` when `PORT` is set. Set a strong
`ADMIN_PASSWORD` env var.

**PythonAnywhere (WSGI, free, no card, persistent storage):**
1. Open a **Bash console** → `git clone https://github.com/lubibasim-crypto/astrosync.git`
2. **Web** tab → **Add a new web app** → **Manual configuration** → **Python 3.10**.
3. Edit the WSGI config file it created (`/var/www/<user>_pythonanywhere_com_wsgi.py`) —
   replace its contents with:
   ```python
   import sys, os
   project = '/home/USERNAME/astrosync'          # <-- your username
   if project not in sys.path:
       sys.path.insert(0, project)
   os.environ['ADMIN_PASSWORD'] = 'YOUR_STRONG_PASSWORD'
   from wsgi_app import application
   ```
4. **Reload** the web app. Site is at `https://USERNAME.pythonanywhere.com`,
   admin at `/admin.html`. Edits persist (the disk is permanent).
