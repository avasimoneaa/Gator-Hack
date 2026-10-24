"""Small helper for talking to the Twinly Developer API.

Docs: https://www.twinly.tech/docs/developer-api

Every function returns (status_code, body) so the server can pass Twinly's
answer straight back to the app, including Twinly's own error messages.

Nothing here retries a request that creates a job (texts, calls, tasks):
retrying those can send a text twice or place a call twice.
"""

import os

import requests
from dotenv import find_dotenv, load_dotenv

# Load TWINLY_API_KEY and TWINLY_BASE_URL from the .env file in the repo root.
load_dotenv(find_dotenv())

DEFAULT_BASE_URL = "https://advktwnedlgnhswpxokg.supabase.co/functions/v1/twinly-api/v1"
BASE_URL = os.environ.get("TWINLY_BASE_URL", DEFAULT_BASE_URL).rstrip("/")

# Twinly holds a job request open for up to 25 seconds while it waits,
# so the network timeout must be longer than that.
REQUEST_TIMEOUT = 40


class MissingKeyError(RuntimeError):
    """Raised when no real Twinly key is set in .env."""


def _headers():
    key = os.environ.get("TWINLY_API_KEY", "").strip()
    if not key or key == "your-twinly-key-here":
        raise MissingKeyError(
            "No Twinly API key found. Copy .env.example to .env in the repo root "
            "and paste your key after TWINLY_API_KEY="
        )
    return {"Authorization": f"Bearer {key}"}


def _call(method, path, json=None, params=None):
    response = requests.request(
        method,
        f"{BASE_URL}{path}",
        headers=_headers(),
        json=json,
        params=params,
        timeout=REQUEST_TIMEOUT,
    )
    try:
        body = response.json()
    except ValueError:
        body = {"error": {"code": "non_json_response", "message": response.text[:500]}}
    return response.status_code, body


# ---- Account (free, no scope needed) ----

def me():
    """Key info, its scopes, and whether the Mac running Twinly is online."""
    return _call("GET", "/me")


def usage():
    """How much of the plan has been used, and prompts left today."""
    return _call("GET", "/usage")


# ---- Cloud (answers right away; uses the "chat" scope) ----

def chat(messages, **options):
    """OpenAI-style chat with Twinly's model, e.g. to suggest replies."""
    payload = {"model": "twinly-core", "messages": messages}
    payload.update(options)
    return _call("POST", "/chat/completions", json=payload)


# ---- Jobs that run on the owner's Mac ----

def create_task(prompt, output_schema=None):
    """Ask Twinly to do something on the Mac, e.g. read the newest email."""
    payload = {"prompt": prompt}
    if output_schema:
        payload["output_schema"] = output_schema
    return _call("POST", "/tasks", json=payload)


def send_message(to, text):
    """Send a text. It goes out as soon as the job runs; there is no preview."""
    return _call("POST", "/messages", json={"to": to, "text": text})


def read_messages(with_contact, limit=10, wait=20):
    """Recent messages in the conversation with one number or contact."""
    return _call("GET", "/messages", params={"with": with_contact, "limit": limit, "wait": wait})


def place_call(to, goal, say=None):
    """Phone someone in the owner's cloned voice and pursue a goal."""
    payload = {"to": to, "goal": goal}
    if say:
        payload["say"] = say
    return _call("POST", "/calls", json=payload)


def speak(text, wait=25):
    """Turn text into audio in the owner's own recorded voice."""
    return _call("POST", "/voice/speak", json={"text": text}, params={"wait": wait})


def get_job(job_id, wait=0):
    """Check a job. With wait > 0, Twinly holds the request until it changes."""
    return _call("GET", f"/jobs/{job_id}", params={"wait": wait})


def cancel_job(job_id):
    return _call("POST", f"/jobs/{job_id}/cancel")
