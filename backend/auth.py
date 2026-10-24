"""Logins for ReVoice.

- Passwords are hashed (scrambled one-way) before they're saved.
- Logging in gives the app a token. The app sends it on every request as
  `Authorization: Bearer <token>`. Tokens last 7 days.
- Tokens are signed with SECRET_KEY from .env, so they can't be faked.
"""

import functools
import os
import secrets

from flask import g, jsonify, request
from itsdangerous import BadSignature, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db

TOKEN_MAX_AGE = 7 * 24 * 60 * 60  # 7 days, in seconds

_serializer = None


def _get_serializer():
    global _serializer
    if _serializer is None:
        secret = os.environ.get("SECRET_KEY", "").strip()
        if not secret or secret == "make-a-long-random-string":
            secret = secrets.token_hex(32)
            print(
                "⚠ No SECRET_KEY in .env, so a temporary one is being used. "
                "Everyone will be logged out when the server restarts. "
                "See backend/README.md to set one."
            )
        _serializer = URLSafeTimedSerializer(secret, salt="revoice-login")
    return _serializer


def hash_password(password):
    return generate_password_hash(password)


def password_matches(password_hash, password):
    return check_password_hash(password_hash, password)


def create_token(user_id):
    session_id = secrets.token_urlsafe(32)
    db = get_db()
    db.execute("INSERT INTO auth_sessions (id, user_id) VALUES (?, ?)", (session_id, user_id))
    db.commit()
    return _get_serializer().dumps({"uid": user_id, "sid": session_id})


def revoke_session(session_id):
    if not session_id:
        return
    db = get_db()
    db.execute("UPDATE auth_sessions SET active = 0 WHERE id = ?", (session_id,))
    db.commit()


def _user_from_token(token):
    try:
        data = _get_serializer().loads(token, max_age=TOKEN_MAX_AGE)
    except BadSignature:  # also covers expired tokens
        return None
    if not isinstance(data, dict):
        return None
    session_id = data.get("sid")
    if not session_id:
        return None
    if session_id:
        active = get_db().execute(
            "SELECT 1 FROM auth_sessions WHERE id = ? AND user_id = ? AND active = 1",
            (session_id, data.get("uid")),
        ).fetchone()
        if active is None:
            return None
    g.session_id = session_id
    return get_db().execute("SELECT * FROM users WHERE id = ?", (data.get("uid"),)).fetchone()


def _not_allowed(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


def login_required(view):
    """Put @login_required above a route to make it need a logged-in user."""

    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[len("Bearer "):].strip() if header.startswith("Bearer ") else ""
        user = _user_from_token(token) if token else None
        if user is None:
            return _not_allowed("not_logged_in", "Please log in.", 401)
        g.user = user
        return view(*args, **kwargs)

    return wrapped


def caregiver_required(view):
    """Like login_required, but only caregivers may use the route."""

    @functools.wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if g.user["role"] != "caregiver":
            return _not_allowed("caregivers_only", "Only caregivers can change this.", 403)
        return view(*args, **kwargs)

    return wrapped
