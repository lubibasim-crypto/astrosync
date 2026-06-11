"""
WSGI entry point for hosts that run WSGI apps (e.g. PythonAnywhere) rather
than a long-running process. Reuses all the logic in server.py.

Local development still uses `python server.py`. On PythonAnywhere, point the
web app's WSGI config at `application` below (see README → Deploy).
"""
import json
import mimetypes
import os
import re

import server  # reuses helpers (read_content/write_content/auth) + runs init_auth on import


def _read_json(environ):
    try:
        n = int(environ.get("CONTENT_LENGTH") or 0)
    except (ValueError, TypeError):
        n = 0
    if not n:
        return {}
    try:
        return json.loads(environ["wsgi.input"].read(n) or b"{}")
    except Exception:
        return None


def _json(start_response, obj, status="200 OK"):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    start_response(status, [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store"),
    ])
    return [body]


def _serve_static(path, environ, start_response):
    rel = path.lstrip("/")
    if rel == "" or rel.endswith("/"):
        rel += "index.html"
    full = os.path.normpath(os.path.join(server.BASE_DIR, rel))
    if not full.startswith(server.BASE_DIR) or os.path.isdir(full) or not os.path.exists(full):
        return _json(start_response, {"error": "not found"}, "404 Not Found")
    ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
    try:
        size = os.path.getsize(full)
    except OSError:
        return _json(start_response, {"error": "not found"}, "404 Not Found")

    # Honour HTTP Range requests (needed for <video> seeking + Safari/iOS playback).
    rng = environ.get("HTTP_RANGE")
    start, end, partial = 0, size - 1, False
    if rng:
        m = re.match(r"bytes=(\d*)-(\d*)", rng.strip())
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2)))
            if start >= size or start > end:
                start_response("416 Requested Range Not Satisfiable", [("Content-Range", "bytes */%d" % size)])
                return [b""]
            end = min(end, size - 1)
            partial = True

    length = end - start + 1
    try:
        with open(full, "rb") as f:
            f.seek(start)
            body = f.read(length)
    except OSError:
        return _json(start_response, {"error": "not found"}, "404 Not Found")
    headers = [("Content-Type", ctype), ("Content-Length", str(length)), ("Accept-Ranges", "bytes")]
    if partial:
        headers.append(("Content-Range", "bytes %d-%d/%d" % (start, end, size)))
    if path.endswith((".woff2", ".svg", ".jpg", ".png", ".mp4", ".webm")):
        headers.append(("Cache-Control", "public, max-age=86400"))
    start_response("206 Partial Content" if partial else "200 OK", headers)
    return [body]


def application(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")
    path = environ.get("PATH_INFO", "/") or "/"

    if path == "/api/health":
        return _json(start_response, {"ok": True})

    if path == "/api/submissions" and method == "GET":
        auth = environ.get("HTTP_AUTHORIZATION", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if not server.valid_token(token):
            return _json(start_response, {"error": "unauthorized"}, "401 Unauthorized")
        return _json(start_response, {"submissions": server.read_submissions()})

    if path == "/api/contact" and method == "POST":
        data = _read_json(environ)
        status, body = server.handle_contact(data if data is not None else {})
        st = "200 OK" if status == 200 else ("400 Bad Request" if status == 400 else "500 Internal Server Error")
        return _json(start_response, body, st)

    if path == "/api/submission-delete" and method == "POST":
        auth = environ.get("HTTP_AUTHORIZATION", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if not server.valid_token(token):
            return _json(start_response, {"error": "unauthorized"}, "401 Unauthorized")
        data = _read_json(environ) or {}
        server.delete_submission(str(data.get("id", "")))
        return _json(start_response, {"ok": True})

    if path == "/api/content":
        if method == "GET":
            c = server.read_content()
            return _json(start_response, c) if c is not None else _json(start_response, {"error": "no content"}, "404 Not Found")
        if method == "PUT":
            auth = environ.get("HTTP_AUTHORIZATION", "")
            token = auth[7:] if auth.startswith("Bearer ") else ""
            if not server.valid_token(token):
                return _json(start_response, {"error": "unauthorized"}, "401 Unauthorized")
            data = _read_json(environ)
            if not isinstance(data, dict):
                return _json(start_response, {"error": "expected object"}, "400 Bad Request")
            server.write_content(data)
            return _json(start_response, {"ok": True, "saved": True})

    if path == "/api/login" and method == "POST":
        data = _read_json(environ)
        if server.check_password(str((data or {}).get("password", ""))):
            return _json(start_response, {"token": server.make_token(), "expiresIn": server.TOKEN_TTL})
        return _json(start_response, {"error": "invalid password"}, "401 Unauthorized")

    if path == "/api/upload" and method == "POST":
        auth = environ.get("HTTP_AUTHORIZATION", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if not server.valid_token(token):
            return _json(start_response, {"error": "unauthorized"}, "401 Unauthorized")
        data = _read_json(environ) or {}
        src = server.save_upload(data.get("name", ""), data.get("dataUrl", ""))
        if not src:
            return _json(start_response, {"error": "invalid file (image png/jpg/svg/webp/gif <= 3MB, or video mp4/webm/ogg/mov <= 50MB)"}, "400 Bad Request")
        return _json(start_response, {"ok": True, "src": src})

    return _serve_static(path, environ, start_response)
