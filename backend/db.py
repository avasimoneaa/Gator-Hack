"""The ReVoice database.

It's SQLite: the whole database is one file (revoice.db) next to this code.
Python has SQLite built in, so there's nothing to install or sign up for.
The file is listed in .gitignore, so people's data never gets uploaded.
"""

import os
import secrets
import sqlite3

from flask import g

SCHEMA = """
-- One profile per patient. Caregivers and the patient all link to it.
CREATE TABLE IF NOT EXISTS profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    join_code   TEXT    NOT NULL UNIQUE,      -- family members use this to join
    dwell_ms    INTEGER NOT NULL DEFAULT 1500, -- how long to look before selecting
    voice       TEXT    NOT NULL DEFAULT 'female',  -- female, male, or personal
    voice_speed REAL    NOT NULL DEFAULT 1.0,
    text_size   TEXT    NOT NULL DEFAULT 'large',
    tiles       TEXT    NOT NULL DEFAULT '["call", "text", "phrases", "appointments"]',
    ride_provider TEXT  NOT NULL DEFAULT 'none', -- none, uber, or lyft
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,   -- scrambled; the real password is never stored
    name          TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('caregiver', 'patient')),
    profile_id    INTEGER NOT NULL REFERENCES profiles(id),
    created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Signed, revocable browser sessions; caregiver password sign-out disables one session.
CREATE TABLE IF NOT EXISTS auth_sessions (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id),
    name       TEXT    NOT NULL,
    phone      TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phrases (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id),
    text       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Help alerts: who was texted, in what order, and whether anyone replied.
CREATE TABLE IF NOT EXISTS help_alerts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id          INTEGER NOT NULL REFERENCES profiles(id),
    user_id             INTEGER NOT NULL REFERENCES users(id),
    status              TEXT    NOT NULL,  -- waiting, acknowledged, no_response, failed, canceled
    contacts            TEXT    NOT NULL,  -- JSON list of help contacts, in order
    notified            TEXT    NOT NULL DEFAULT '[]',  -- JSON list of who was texted, and when
    next_index          INTEGER NOT NULL DEFAULT 0,     -- next contact to try
    next_escalation_at  REAL,              -- when to text the next contact if no reply
    last_checked_at     REAL    NOT NULL DEFAULT 0,
    reply_from          TEXT,
    reply_text          TEXT,
    created_at          REAL    NOT NULL
);

-- Gaze stats the app reports every few minutes, used by fatigue mode.
CREATE TABLE IF NOT EXISTS gaze_stats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id    INTEGER NOT NULL REFERENCES profiles(id),
    user_id       INTEGER NOT NULL REFERENCES users(id),
    recorded_at   REAL    NOT NULL,   -- unix time
    local_hour    INTEGER NOT NULL,   -- 0-23, the user's own clock
    minutes       REAL    NOT NULL,   -- how long this sample covers
    selections    INTEGER NOT NULL,   -- completed dwell selections
    near_misses   INTEGER NOT NULL,   -- dwell ring started but gaze left before it finished
    corrections   INTEGER NOT NULL,   -- Back / Undo / Cancel presses
    avg_select_ms REAL    NOT NULL    -- average time to make a selection
);

-- A record of what Twinly was asked to do.
CREATE TABLE IF NOT EXISTS task_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,   -- task, message, call, or speak
    summary    TEXT    NOT NULL,
    job_id     TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def db_path():
    default = os.path.join(os.path.dirname(os.path.abspath(__file__)), "revoice.db")
    return os.environ.get("DATABASE_PATH") or default


def get_db():
    """The database connection for the current request (opened once, reused)."""
    if "db" not in g:
        conn = sqlite3.connect(db_path())
        conn.row_factory = sqlite3.Row  # lets us read columns by name
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


def close_db(_error=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


# Columns added after the first version. Older database files get them
# added automatically, so nobody has to delete their data.
NEW_COLUMNS = {
    "profiles": {"fatigue_mode": "INTEGER NOT NULL DEFAULT 1", "ride_provider": "TEXT NOT NULL DEFAULT 'none'"},
    "contacts": {"help_order": "INTEGER"},  # 1 = text first in an emergency; empty = not a help contact
}


def init_db():
    """Create or upgrade the tables. Safe to run every startup."""
    conn = sqlite3.connect(db_path())
    conn.executescript(SCHEMA)
    for table, columns in NEW_COLUMNS.items():
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for column, definition in columns.items():
            if column not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
    conn.commit()
    conn.close()


def new_join_code():
    """A short code like 'A1B2C3' that family members type to join a profile."""
    return secrets.token_hex(3).upper()
