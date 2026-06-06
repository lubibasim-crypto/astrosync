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
import os, json, sqlite3, hmac, hashlib, base64, time, secrets, tempfile, mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CONTENT_FILE = os.path.join(DATA_DIR, "content.json")
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
