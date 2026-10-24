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


def init_db():
    """Create the tables if they don't exist yet. Safe to run every startup."""
    conn = sqlite3.connect(db_path())
    conn.executescript(SCHEMA)
    conn.close()


def new_join_code():
    """A short code like 'A1B2C3' that family members type to join a profile."""
    return secrets.token_hex(3).upper()
