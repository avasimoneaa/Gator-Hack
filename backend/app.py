"""ReVoice backend.

- The only place the Twinly API key is used (Twinly refuses browser requests).
- Stores profiles, settings, contacts, phrases and task history in a SQLite
  database file (see db.py).
- Handles logins for caregivers and patients (see auth.py).

Run it with:  python app.py   (then it listens on port 5001)
"""

import json
import os
import re

import requests
from flask import Flask, g, jsonify, request

import fatigue
import help_alerts
import replies
import twinly  # loads .env first, so the settings below can use it
from auth import caregiver_required, create_token, hash_password, login_required, password_matches
from db import close_db, get_db, init_db, new_join_code

app = Flask(__name__)
app.teardown_appcontext(close_db)
init_db()

JOB_ID_PATTERN = re.compile(r"^[A-Za-z0-9-]{1,100}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Tiles caregivers can put on the dashboard. The Help button is always shown
# separately, so it can never be removed by accident.
TILE_OPTIONS = {"call", "text", "phrases", "appointments", "keyboard", "conversation", "email", "refills"}
MAX_TILES = 4
VOICE_OPTIONS = {"female", "male", "personal"}
TEXT_SIZES = {"medium", "large", "extra-large"}


@app.after_request
def allow_frontend(response):
    # Lets the frontend, which runs on a different port, call this server.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


# ---------- small helpers ----------

def error(code, message, status=400):
    return jsonify({"error": {"code": code, "message": message}}), status


def body_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def text_field(data, name, max_length=None):
    value = data.get(name)
    value = value.strip() if isinstance(value, str) else ""
    if max_length is not None:
        value = value[:max_length]
    return value


def user_json(user):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}


def profile_json(profile):
    return {
        "id": profile["id"],
        "name": profile["name"],
        "join_code": profile["join_code"],
        "dwell_ms": profile["dwell_ms"],
        "voice": profile["voice"],
        "voice_speed": profile["voice_speed"],
        "text_size": profile["text_size"],
        "tiles": json.loads(profile["tiles"]),
        "fatigue_mode": bool(profile["fatigue_mode"]),
    }


def current_profile():
    return get_db().execute(
        "SELECT * FROM profiles WHERE id = ?", (g.user["profile_id"],)
    ).fetchone()


def forward(result, kind=None, summary=None):
    """Send Twinly's answer back to the app, and log new jobs to history."""
    status, body = result
    if kind and status in (200, 202) and isinstance(body, dict) and body.get("id"):
        db = get_db()
        db.execute(
            "INSERT INTO task_history (profile_id, user_id, kind, summary, job_id) VALUES (?, ?, ?, ?, ?)",
            (g.user["profile_id"], g.user["id"], kind, summary[:200], body["id"]),
        )
        db.commit()
    return jsonify(body), status


@app.errorhandler(twinly.MissingKeyError)
def missing_key(exc):
    return error("missing_api_key", str(exc), 500)


@app.errorhandler(requests.RequestException)
def twinly_unreachable(exc):
    return error("twinly_unreachable", f"Could not reach Twinly: {exc}", 502)


@app.get("/api/health")
def health():
    """Quick check that this server is running. No login needed."""
    return jsonify({"ok": True})


# ---------- accounts ----------

@app.post("/api/auth/signup")
def signup():
    """Make an account.

    To start a new patient profile:  {"email", "password", "name", "role", "profile_name"}
    To join an existing one:         {"email", "password", "name", "role", "join_code"}
    role is "caregiver" or "patient".
    """
    data = body_json()
    email = text_field(data, "email").lower()
    password = data.get("password") if isinstance(data.get("password"), str) else ""
    name = text_field(data, "name", 80)
    role = text_field(data, "role")
    join_code = text_field(data, "join_code").upper()
    profile_name = text_field(data, "profile_name", 80)

    if not EMAIL_PATTERN.match(email):
        return error("invalid_email", "Enter a valid email address.")
    if len(password) < 8:
        return error("weak_password", "Passwords need at least 8 characters.")
    if not name:
        return error("missing_name", "Enter your name.")
    if role not in ("caregiver", "patient"):
        return error("invalid_role", "Role must be 'caregiver' or 'patient'.")

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return error("email_taken", "There's already an account with that email.", 409)

    if join_code:
        profile = db.execute("SELECT * FROM profiles WHERE join_code = ?", (join_code,)).fetchone()
        if profile is None:
            return error("invalid_join_code", "That join code doesn't match any profile.", 404)
        profile_id = profile["id"]
    elif profile_name:
        cursor = db.execute(
            "INSERT INTO profiles (name, join_code) VALUES (?, ?)", (profile_name, new_join_code())
        )
        profile_id = cursor.lastrowid
    else:
        return error(
            "missing_profile",
            "Send 'profile_name' to start a new patient profile, or 'join_code' to join one.",
        )

    cursor = db.execute(
        "INSERT INTO users (email, password_hash, name, role, profile_id) VALUES (?, ?, ?, ?, ?)",
        (email, hash_password(password), name, role, profile_id),
    )
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    profile = db.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    return jsonify(
        {"token": create_token(user["id"]), "user": user_json(user), "profile": profile_json(profile)}
    ), 201


@app.post("/api/auth/login")
def login():
    """Log in with {"email", "password"}. Returns a token for later requests."""
    data = body_json()
    email = text_field(data, "email").lower()
    password = data.get("password") if isinstance(data.get("password"), str) else ""
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not password_matches(user["password_hash"], password):
        return error("wrong_login", "Email or password is incorrect.", 401)
    profile = db.execute("SELECT * FROM profiles WHERE id = ?", (user["profile_id"],)).fetchone()
    return jsonify(
        {"token": create_token(user["id"]), "user": user_json(user), "profile": profile_json(profile)}
    )


@app.get("/api/auth/me")
@login_required
def me():
    """Who is logged in, and their patient profile."""
    return jsonify({"user": user_json(g.user), "profile": profile_json(current_profile())})


# ---------- profile, dashboard and settings ----------

@app.get("/api/profile")
@login_required
def get_profile():
    return jsonify(profile_json(current_profile()))


@app.put("/api/profile")
@caregiver_required
def update_profile():
    """Change any of: name, dwell_ms, voice, voice_speed, text_size, tiles, fatigue_mode."""
    data = body_json()
    changes = {}

    if "name" in data:
        name = text_field(data, "name", 80)
        if not name:
            return error("invalid_name", "Name can't be empty.")
        changes["name"] = name
    if "dwell_ms" in data:
        value = data["dwell_ms"]
        if not isinstance(value, int) or isinstance(value, bool) or not 500 <= value <= 5000:
            return error("invalid_dwell_ms", "dwell_ms must be a whole number from 500 to 5000.")
        changes["dwell_ms"] = value
    if "voice" in data:
        if data["voice"] not in VOICE_OPTIONS:
            return error("invalid_voice", "voice must be 'female', 'male', or 'personal'.")
        changes["voice"] = data["voice"]
    if "voice_speed" in data:
        value = data["voice_speed"]
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0.5 <= value <= 2.0:
            return error("invalid_voice_speed", "voice_speed must be from 0.5 to 2.0.")
        changes["voice_speed"] = float(value)
    if "text_size" in data:
        if data["text_size"] not in TEXT_SIZES:
            return error("invalid_text_size", "text_size must be 'medium', 'large', or 'extra-large'.")
        changes["text_size"] = data["text_size"]
    if "fatigue_mode" in data:
        if not isinstance(data["fatigue_mode"], bool):
            return error("invalid_fatigue_mode", "fatigue_mode must be true or false.")
        changes["fatigue_mode"] = int(data["fatigue_mode"])
    if "tiles" in data:
        tiles = data["tiles"]
        if (
            not isinstance(tiles, list)
            or not 1 <= len(tiles) <= MAX_TILES
            or len(set(tiles)) != len(tiles)
            or any(tile not in TILE_OPTIONS for tile in tiles)
        ):
            return error(
                "invalid_tiles",
                f"tiles must be 1 to {MAX_TILES} different choices from: "
                + ", ".join(sorted(TILE_OPTIONS)),
            )
        changes["tiles"] = json.dumps(tiles)

    if changes:
        columns = ", ".join(f"{column} = ?" for column in changes)  # names come from the checks above
        db = get_db()
        db.execute(f"UPDATE profiles SET {columns} WHERE id = ?", (*changes.values(), g.user["profile_id"]))
        db.commit()
    return jsonify(profile_json(current_profile()))


# ---------- contacts ----------

def help_order_field(data):
    """help_order: 1 = text first in an emergency, 2 = second... null = not a help contact."""
    value = data.get("help_order")
    if value is None:
        return True, None
    if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 10:
        return False, None
    return True, value


def contact_json(row):
    return {"id": row["id"], "name": row["name"], "phone": row["phone"], "help_order": row["help_order"]}


@app.get("/api/contacts")
@login_required
def list_contacts():
    rows = get_db().execute(
        "SELECT * FROM contacts WHERE profile_id = ? ORDER BY name", (g.user["profile_id"],)
    ).fetchall()
    return jsonify([contact_json(row) for row in rows])


@app.post("/api/contacts")
@caregiver_required
def add_contact():
    """Add {"name": "Mom", "phone": "+13525550100", "help_order": 1}. help_order is optional."""
    data = body_json()
    name, phone = text_field(data, "name", 80), text_field(data, "phone", 40)
    if not name or not phone:
        return error("missing_fields", "Send both 'name' and 'phone'.")
    ok, help_order = help_order_field(data)
    if not ok:
        return error("invalid_help_order", "help_order must be a number from 1 to 10, or null.")
    db = get_db()
    cursor = db.execute(
        "INSERT INTO contacts (profile_id, name, phone, help_order) VALUES (?, ?, ?, ?)",
        (g.user["profile_id"], name, phone, help_order),
    )
    db.commit()
    return jsonify(contact_json(db.execute("SELECT * FROM contacts WHERE id = ?", (cursor.lastrowid,)).fetchone())), 201


@app.put("/api/contacts/<int:contact_id>")
@caregiver_required
def update_contact(contact_id):
    """Change any of: name, phone, help_order."""
    data = body_json()
    db = get_db()
    contact = db.execute(
        "SELECT * FROM contacts WHERE id = ? AND profile_id = ?", (contact_id, g.user["profile_id"])
    ).fetchone()
    if contact is None:
        return error("not_found", "No such contact.", 404)
    name = text_field(data, "name", 80) if "name" in data else contact["name"]
    phone = text_field(data, "phone", 40) if "phone" in data else contact["phone"]
    if not name or not phone:
        return error("missing_fields", "Name and phone can't be empty.")
    help_order = contact["help_order"]
    if "help_order" in data:
        ok, help_order = help_order_field(data)
        if not ok:
            return error("invalid_help_order", "help_order must be a number from 1 to 10, or null.")
    db.execute(
        "UPDATE contacts SET name = ?, phone = ?, help_order = ? WHERE id = ?", (name, phone, help_order, contact_id)
    )
    db.commit()
    return jsonify(contact_json(db.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,)).fetchone()))


@app.delete("/api/contacts/<int:contact_id>")
@caregiver_required
def delete_contact(contact_id):
    db = get_db()
    cursor = db.execute(
        "DELETE FROM contacts WHERE id = ? AND profile_id = ?", (contact_id, g.user["profile_id"])
    )
    db.commit()
    if cursor.rowcount == 0:
        return error("not_found", "No such contact.", 404)
    return jsonify({"deleted": contact_id})


# ---------- quick phrases ----------

@app.get("/api/phrases")
@login_required
def list_phrases():
    rows = get_db().execute(
        "SELECT id, text FROM phrases WHERE profile_id = ? ORDER BY id", (g.user["profile_id"],)
    ).fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/phrases")
@caregiver_required
def add_phrase():
    """Add {"text": "I'm thirsty"}."""
    text = text_field(body_json(), "text", 200)
    if not text:
        return error("missing_text", "Send the phrase 'text'.")
    db = get_db()
    cursor = db.execute("INSERT INTO phrases (profile_id, text) VALUES (?, ?)", (g.user["profile_id"], text))
    db.commit()
    return jsonify({"id": cursor.lastrowid, "text": text}), 201


@app.delete("/api/phrases/<int:phrase_id>")
@caregiver_required
def delete_phrase(phrase_id):
    db = get_db()
    cursor = db.execute(
        "DELETE FROM phrases WHERE id = ? AND profile_id = ?", (phrase_id, g.user["profile_id"])
    )
    db.commit()
    if cursor.rowcount == 0:
        return error("not_found", "No such phrase.", 404)
    return jsonify({"deleted": phrase_id})


# ---------- task history ----------

@app.get("/api/history")
@login_required
def history():
    """The 50 most recent things Twinly was asked to do for this patient."""
    rows = get_db().execute(
        """SELECT task_history.id, kind, summary, job_id, task_history.created_at, users.name AS asked_by
           FROM task_history JOIN users ON users.id = task_history.user_id
           WHERE task_history.profile_id = ?
           ORDER BY task_history.id DESC LIMIT 50""",
        (g.user["profile_id"],),
    ).fetchall()
    return jsonify([dict(row) for row in rows])


# ---------- conversation co-pilot ----------

@app.post("/api/replies")
@login_required
def suggest_replies():
    """Suggest whole replies.

    {"heard": "what the other person just said",
     "conversation": [{"speaker": "them" or "me", "text": "..."}],   (optional, earlier turns)
     "typed": "what the user has started typing",                    (optional)
     "count": 3}                                                     (optional, 1-4)
    """
    data = body_json()
    heard, typed = text_field(data, "heard", 1000), text_field(data, "typed", 300)
    if not heard and not typed and not data.get("conversation"):
        return error("missing_text", "Send 'heard' (what the other person said) or 'typed'.")
    count = data.get("count", 3)
    if not isinstance(count, int) or isinstance(count, bool):
        count = 3
    count = min(max(count, 1), replies.MAX_SUGGESTIONS)
    profile = current_profile()
    phrases = [
        row["text"]
        for row in get_db().execute("SELECT text FROM phrases WHERE profile_id = ? ORDER BY id", (profile["id"],))
    ]
    status, body = replies.suggest(profile["name"], heard, typed, data.get("conversation"), count, phrases)
    return jsonify(body), status


# ---------- help alerts ----------

@app.post("/api/help")
@login_required
def start_help():
    """The Help button: texts help contacts in order until someone replies."""
    profile = current_profile()
    alert = help_alerts.start(get_db(), g.user, profile["name"])
    if alert is None:
        return error(
            "no_help_contacts",
            "No help contacts are set up. A caregiver needs to give at least one contact a help_order.",
        )
    return jsonify(help_alerts.to_json(alert)), 201


@app.get("/api/help/<int:alert_id>")
@login_required
def check_help(alert_id):
    """Check for a reply. Call every 10-20 seconds and read 'say' aloud when it changes."""
    db = get_db()
    alert = help_alerts.get(db, alert_id, g.user["profile_id"])
    if alert is None:
        return error("not_found", "No such alert.", 404)
    alert = help_alerts.refresh(db, alert, current_profile()["name"])
    return jsonify(help_alerts.to_json(alert))


@app.post("/api/help/<int:alert_id>/cancel")
@login_required
def cancel_help(alert_id):
    """False alarm. Everyone already texted is told the user is OK."""
    db = get_db()
    alert = help_alerts.get(db, alert_id, g.user["profile_id"])
    if alert is None:
        return error("not_found", "No such alert.", 404)
    alert = help_alerts.cancel(db, alert, current_profile()["name"])
    return jsonify(help_alerts.to_json(alert))


# ---------- fatigue mode ----------

def whole_number(data, name, low, high):
    value = data.get(name)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
        return None
    return value


@app.post("/api/gaze-stats")
@login_required
def add_gaze_stats():
    """The app sends this every few minutes of use:
    {"local_hour": 0-23, "minutes": 2, "selections": 14, "near_misses": 3,
     "corrections": 1, "avg_select_ms": 1850}
    """
    data = body_json()
    stats = {
        "local_hour": whole_number(data, "local_hour", 0, 23),
        "minutes": whole_number(data, "minutes", 0.1, 120),
        "selections": whole_number(data, "selections", 0, 10000),
        "near_misses": whole_number(data, "near_misses", 0, 10000),
        "corrections": whole_number(data, "corrections", 0, 10000),
        "avg_select_ms": whole_number(data, "avg_select_ms", 0, 120000),
    }
    missing = [name for name, value in stats.items() if value is None]
    if missing:
        return error("invalid_stats", "Missing or out-of-range: " + ", ".join(missing))
    for name in ("local_hour", "selections", "near_misses", "corrections"):
        stats[name] = int(stats[name])
    fatigue.record(get_db(), g.user, stats)
    return jsonify({"saved": True}), 201


@app.get("/api/fatigue")
@login_required
def check_fatigue():
    """How tired does the user seem right now? Add ?local_hour=0-23.
    Returns a level (normal / tired / very_tired), reasons, and suggested
    settings. The app should ASK before applying them."""
    try:
        local_hour = int(request.args.get("local_hour", ""))
    except ValueError:
        local_hour = -1
    return jsonify(fatigue.assess(get_db(), current_profile(), local_hour))


# ---------- Twinly ----------

@app.get("/api/status")
@login_required
def status():
    """Is the Mac with Twinly online, and what is this key allowed to do?"""
    return forward(twinly.me())


@app.get("/api/usage")
@login_required
def usage():
    return forward(twinly.usage())


@app.post("/api/tasks")
@login_required
def create_task():
    """Start a task, e.g. {"prompt": "Read me the subject of my newest email"}."""
    data = body_json()
    prompt = text_field(data, "prompt")
    if not prompt:
        return error("missing_prompt", "Send a 'prompt' describing the task.")
    return forward(twinly.create_task(prompt, data.get("output_schema")), "task", prompt)


@app.post("/api/messages")
@login_required
def send_message():
    """Send a text. The user must have confirmed it on screen first."""
    data = body_json()
    to, text = text_field(data, "to"), text_field(data, "text")
    if not to or not text:
        return error("missing_fields", "Send both 'to' and 'text'.")
    if data.get("confirmed") is not True:
        return error(
            "confirmation_required",
            "Texts send immediately. Show the user a confirmation and pass \"confirmed\": true.",
        )
    return forward(twinly.send_message(to, text), "message", f"Text to {to}: {text}")


@app.post("/api/calls")
@login_required
def place_call():
    """Place a phone call. The user must have confirmed it on screen first."""
    data = body_json()
    to, goal = text_field(data, "to"), text_field(data, "goal")
    if not to or not goal:
        return error("missing_fields", "Send both 'to' and 'goal'.")
    if data.get("confirmed") is not True:
        return error(
            "confirmation_required",
            "Calls start right away. Show the user a confirmation and pass \"confirmed\": true.",
        )
    return forward(
        twinly.place_call(to, goal, text_field(data, "say") or None), "call", f"Call to {to}: {goal}"
    )


@app.post("/api/speak")
@login_required
def speak():
    """Say a phrase in the user's own voice. Returns a job with audio when done."""
    text = text_field(body_json(), "text")
    if not text:
        return error("missing_text", "Send the 'text' to speak.")
    return forward(twinly.speak(text), "speak", text)


@app.get("/api/jobs/<job_id>")
@login_required
def get_job(job_id):
    """Check on a job. Add ?wait=25 to wait for it to change (max 25 seconds)."""
    if not JOB_ID_PATTERN.match(job_id):
        return error("invalid_job_id", "That doesn't look like a job id.")
    # Twinly job IDs are not scoped to an account. Only expose jobs created
    # through this ReVoice profile so another logged-in family can't inspect
    # or cancel a different profile's work by guessing an ID.
    owned = get_db().execute(
        "SELECT 1 FROM task_history WHERE profile_id = ? AND job_id = ?",
        (g.user["profile_id"], job_id),
    ).fetchone()
    if owned is None:
        return error("not_found", "No such job.", 404)
    try:
        wait = min(max(float(request.args.get("wait", 0)), 0), 25)
    except ValueError:
        wait = 0
    return forward(twinly.get_job(job_id, wait))


@app.post("/api/jobs/<job_id>/cancel")
@login_required
def cancel_job(job_id):
    if not JOB_ID_PATTERN.match(job_id):
        return error("invalid_job_id", "That doesn't look like a job id.")
    owned = get_db().execute(
        "SELECT 1 FROM task_history WHERE profile_id = ? AND job_id = ?",
        (g.user["profile_id"], job_id),
    ).fetchone()
    if owned is None:
        return error("not_found", "No such job.", 404)
    return forward(twinly.cancel_job(job_id))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
