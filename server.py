#!/usr/bin/env python3
"""
AstroSync — local backend (Python standard library only, no pip installs).

Serves the static website AND a small JSON content API that the admin
panel uses to edit the site. Content is persisted to data/content.json
(safe to commit / deploy); admin credentials live in data/admin.db
(sqlite, git-ignored).

Run:
    python server.py                 # http://127.0.0.1:8000
    PORT=9000 python server.py       # custom port
    ADMIN_PASSWORD=secret python server.py   # set/override admin password

Default admin password is "astrosync" (change it — see README).
"""
import os, re, json, sqlite3, hmac, hashlib, base64, time, secrets, tempfile, mimetypes
import threading, smtplib
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
CONTENT_FILE = os.path.join(DATA_DIR, "content.json")
SUBMISSIONS_FILE = os.path.join(DATA_DIR, "submissions.json")
DB_FILE = os.path.join(DATA_DIR, "admin.db")
# Locally bind to localhost; on a host (Render/Railway set PORT) bind to 0.0.0.0.
HOST = os.environ.get("HOST") or ("0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
TOKEN_TTL = 60 * 60 * 8  # 8 hours

mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("application/javascript", ".js")


# ----------------------------- storage / auth -----------------------------
def db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)")
    return conn


def kv_get(conn, k, default=None):
    row = conn.execute("SELECT v FROM kv WHERE k=?", (k,)).fetchone()
    return row[0] if row else default


def kv_set(conn, k, v):
    conn.execute("INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))
    conn.commit()


def hash_pw(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 120000).hex()


def init_auth():
    conn = db()
    secret = kv_get(conn, "secret")
    if not secret:
        secret = secrets.token_hex(32)
        kv_set(conn, "secret", secret)
    # set password from env (always wins) or seed a default once
    env_pw = os.environ.get("ADMIN_PASSWORD")
    if env_pw or not kv_get(conn, "pwhash"):
        pw = env_pw or "astrosync"
        salt = kv_get(conn, "salt") or secrets.token_hex(8)
        kv_set(conn, "salt", salt)
        kv_set(conn, "pwhash", hash_pw(pw, salt))
    conn.close()
    return secret


SECRET = init_auth()


def check_password(pw):
    conn = db()
    salt = kv_get(conn, "salt", "")
    expected = kv_get(conn, "pwhash", "")
    conn.close()
    return bool(expected) and hmac.compare_digest(hash_pw(pw, salt), expected)


def make_token():
    exp = str(int(time.time()) + TOKEN_TTL)
    sig = hmac.new(SECRET.encode(), exp.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{exp}.{sig}".encode()).decode()


def valid_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        exp, sig = raw.split(".", 1)
        good = hmac.new(SECRET.encode(), exp.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, good) and int(exp) > time.time()
    except Exception:
        return False


def read_content():
    if os.path.exists(CONTENT_FILE):
        try:
            with open(CONTENT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def write_content(obj):
    os.makedirs(DATA_DIR, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CONTENT_FILE)  # atomic


# Allowed image uploads (mime -> extension) and a 3 MB cap.
ALLOWED_IMG = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/svg+xml": ".svg",
    "image/webp": ".webp", "image/gif": ".gif",
}
MAX_UPLOAD = 3 * 1024 * 1024


def save_upload(name, data_url):
    """Decode a base64 data URL, validate, and store under data/uploads/.

    Returns the public relative path (e.g. "data/uploads/logo-ab12cd34.png")
    or None if the payload is invalid / disallowed / too large.
    """
    if not isinstance(data_url, str) or not data_url.startswith("data:"):
        return None
    header, _, b64 = data_url.partition(",")
    mime = header[5:].split(";")[0].strip().lower()
    ext = ALLOWED_IMG.get(mime)
    if not ext or not b64:
        return None
    try:
        raw = base64.b64decode(b64, validate=True)
    except Exception:
        return None
    if not raw or len(raw) > MAX_UPLOAD:
        return None
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    stem = re.sub(r"[^A-Za-z0-9._-]", "", os.path.basename(name or ""))
    stem = os.path.splitext(stem)[0][:40] or "logo"
    fname = "%s-%s%s" % (stem, secrets.token_hex(4), ext)
    with open(os.path.join(UPLOAD_DIR, fname), "wb") as f:
        f.write(raw)
    return "data/uploads/" + fname


# ----------------------------- contact submissions -----------------------------
SUB_LOCK = threading.Lock()
# Fields captured from the contact form (id/ts are added server-side).
SUB_FIELDS = ["fname", "lname", "email", "business", "service", "budget", "message"]


def read_submissions():
    if os.path.exists(SUBMISSIONS_FILE):
        try:
            with open(SUBMISSIONS_FILE, "r", encoding="utf-8") as f:
                arr = json.load(f)
                return arr if isinstance(arr, list) else []
        except Exception:
            return []
    return []


def _write_submissions(arr):
    os.makedirs(DATA_DIR, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(arr, f, ensure_ascii=False, indent=2)
    os.replace(tmp, SUBMISSIONS_FILE)


def clean_quote(q):
    """Validate + normalize a quote object sent from the calculator.

    Returns {currency, items:[{name,unit,price,qty,total}], total} or None.
    """
    if not isinstance(q, dict):
        return None
    raw_items = q.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        return None
    items = []
    for it in raw_items[:50]:
        if not isinstance(it, dict):
            continue
        try:
            qty = int(float(it.get("qty", 0)))
            price = float(it.get("price", 0))
        except (ValueError, TypeError):
            continue
        if qty <= 0 or price < 0:
            continue
        items.append({
            "name": str(it.get("name", "") or "")[:120],
            "unit": str(it.get("unit", "") or "")[:60],
            "price": round(price, 2),
            "qty": qty,
            "total": round(price * qty, 2),
        })
    if not items:
        return None
    try:
        total = float(q.get("total", 0))
    except (ValueError, TypeError):
        total = 0
    if total <= 0:
        total = sum(i["total"] for i in items)
    return {"currency": str(q.get("currency", "$") or "$")[:4], "items": items, "total": round(total, 2)}


def save_submission(data):
    sub = {"id": secrets.token_hex(6), "ts": int(time.time())}
    for k in SUB_FIELDS:
        sub[k] = str(data.get(k, "") or "")[:2000]
    q = clean_quote(data.get("quote"))
    if q:
        sub["quote"] = q
    with SUB_LOCK:
        arr = read_submissions()
        arr.append(sub)
        _write_submissions(arr)
    return sub


def delete_submission(sub_id):
    with SUB_LOCK:
        arr = read_submissions()
        kept = [s for s in arr if s.get("id") != sub_id]
        if len(kept) != len(arr):
            _write_submissions(kept)
    return True


def send_contact_email(sub):
    """Best-effort email of a submission. Returns True on success.

    Configured via env vars (set them in the WSGI file, like ADMIN_PASSWORD):
      SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS,
      CONTACT_TO (recipient; defaults to SMTP_USER), CONTACT_FROM (defaults to SMTP_USER).
    If SMTP isn't configured, this silently returns False (submission is still stored).
    """
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    pw = os.environ.get("SMTP_PASS")
    to = os.environ.get("CONTACT_TO") or user
    if not (host and user and pw and to):
        return False
    port = int(os.environ.get("SMTP_PORT", "587"))
    frm = os.environ.get("CONTACT_FROM") or user
    name = (sub.get("fname", "") + " " + sub.get("lname", "")).strip() or "Website visitor"
    lines = [
        "New audit request from your AstroSync website:", "",
        "Name:     " + name,
        "Email:    " + sub.get("email", ""),
        "Business: " + sub.get("business", ""),
        "Service:  " + sub.get("service", ""),
        "Budget:   " + sub.get("budget", ""),
        "", "Message:", sub.get("message", ""),
    ]
    q = sub.get("quote")
    if q and q.get("items"):
        cur = q.get("currency", "$")
        money = lambda n: ("%g" % n)
        lines.append("")
        lines.append("Requested quote (from the calculator):")
        for it in q["items"]:
            lines.append("  - %d x %s (%s%s %s) = %s%s" % (
                it["qty"], it["name"], cur, money(it["price"]), it.get("unit", ""), cur, money(it["total"])))
        lines.append("  Total: %s%s" % (cur, money(q["total"])))
    lines += [
        "", "Received: " + time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(sub.get("ts", time.time()))),
    ]
    msg = EmailMessage()
    msg["Subject"] = "New audit request — " + name
    msg["From"] = frm
    msg["To"] = to
    if sub.get("email"):
        msg["Reply-To"] = sub["email"]
    msg.set_content("\n".join(lines))
    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.starttls()
            s.login(user, pw)
            s.send_message(msg)
        return True
    except Exception as e:
        print("[contact] email send failed:", e)
        return False


def handle_contact(data):
    """Validate + store + email a contact submission. Returns (status, body)."""
    if not isinstance(data, dict):
        return 400, {"error": "expected object"}
    # Honeypot: real users never fill the hidden 'website' field — silently accept bots.
    if str(data.get("website", "") or "").strip():
        return 200, {"ok": True}
    if not str(data.get("email", "") or "").strip() or not str(data.get("fname", "") or "").strip():
        return 400, {"error": "name and email are required"}
    sub = save_submission(data)
    try:
        send_contact_email(sub)
    except Exception as e:
        print("[contact] email error:", e)
    return 200, {"ok": True}


# ----------------------------- HTTP handler -----------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "AstroSync/1.0"

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    # --- helpers ---
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def authed(self):
        h = self.headers.get("Authorization", "")
        token = h[7:] if h.startswith("Bearer ") else ""
        return valid_token(token)

    def read_body(self):
        n = int(self.headers.get("Content-Length", "0") or 0)
        return self.rfile.read(n) if n else b""

    # --- routes ---
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/health":
            return self.send_json({"ok": True})
        if path == "/api/content":
            c = read_content()
            return self.send_json(c, 200) if c is not None else self.send_json({"error": "no content"}, 404)
        if path == "/api/submissions":
            if not self.authed():
                return self.send_json({"error": "unauthorized"}, 401)
            return self.send_json({"submissions": read_submissions()})
        return self.serve_static(path)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/login":
            try:
                data = json.loads(self.read_body() or b"{}")
            except Exception:
                return self.send_json({"error": "bad json"}, 400)
            if check_password(str(data.get("password", ""))):
                return self.send_json({"token": make_token(), "expiresIn": TOKEN_TTL})
            return self.send_json({"error": "invalid password"}, 401)
        if path == "/api/upload":
            if not self.authed():
                return self.send_json({"error": "unauthorized"}, 401)
            try:
                data = json.loads(self.read_body() or b"{}")
            except Exception:
                return self.send_json({"error": "bad json"}, 400)
            src = save_upload(data.get("name", ""), data.get("dataUrl", ""))
            if not src:
                return self.send_json({"error": "invalid image (png/jpg/svg/webp/gif, max 3MB)"}, 400)
            return self.send_json({"ok": True, "src": src})
        if path == "/api/contact":
            try:
                data = json.loads(self.read_body() or b"{}")
            except Exception:
                return self.send_json({"error": "bad json"}, 400)
            status, body = handle_contact(data)
            return self.send_json(body, status)
        if path == "/api/submission-delete":
            if not self.authed():
                return self.send_json({"error": "unauthorized"}, 401)
            try:
                data = json.loads(self.read_body() or b"{}")
            except Exception:
                return self.send_json({"error": "bad json"}, 400)
            delete_submission(str(data.get("id", "")))
            return self.send_json({"ok": True})
        return self.send_json({"error": "not found"}, 404)

    def do_PUT(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/content":
            if not self.authed():
                return self.send_json({"error": "unauthorized"}, 401)
            try:
                data = json.loads(self.read_body() or b"{}")
            except Exception:
                return self.send_json({"error": "bad json"}, 400)
            if not isinstance(data, dict):
                return self.send_json({"error": "expected object"}, 400)
            write_content(data)
            return self.send_json({"ok": True, "saved": True})
        return self.send_json({"error": "not found"}, 404)

    # --- static files ---
    def serve_static(self, path):
        rel = path.lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel += "index.html"
        # normalize and prevent path traversal
        full = os.path.normpath(os.path.join(BASE_DIR, rel))
        if not full.startswith(BASE_DIR) or os.path.isdir(full):
            return self.send_json({"error": "not found"}, 404)
        if not os.path.exists(full):
            return self.send_json({"error": "not found"}, 404)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        try:
            with open(full, "rb") as f:
                body = f.read()
        except OSError:
            return self.send_json({"error": "not found"}, 404)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        if "/assets/fonts/" in path or path.endswith((".woff2", ".svg", ".jpg", ".png")):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)


def main():
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print("AstroSync running →  http://%s:%d" % (HOST, PORT))
    print("Admin panel       →  http://%s:%d/admin.html" % (HOST, PORT))
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
