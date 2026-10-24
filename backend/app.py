"""ReVoice backend: the only place the Twinly API key is used.

The app (frontend) calls these /api/... routes, and this server forwards them
to Twinly with the secret key. Twinly refuses requests made directly from a
browser, so this server is required.

Run it with:  python app.py   (then it listens on port 5001)
"""

import os
import re

import requests
from flask import Flask, jsonify, request

import twinly

app = Flask(__name__)


@app.after_request
def allow_frontend(response):
    # Lets the frontend, which runs on a different port, call this server.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

JOB_ID_PATTERN = re.compile(r"^[A-Za-z0-9-]{1,100}$")


def error(code, message, status=400):
    return jsonify({"error": {"code": code, "message": message}}), status


def forward(result):
    status, body = result
    return jsonify(body), status


def body_json():
    return request.get_json(silent=True) or {}


def text_field(data, name):
    value = data.get(name)
    return value.strip() if isinstance(value, str) else ""


@app.errorhandler(twinly.MissingKeyError)
def missing_key(exc):
    return error("missing_api_key", str(exc), 500)


@app.errorhandler(requests.RequestException)
def twinly_unreachable(exc):
    return error("twinly_unreachable", f"Could not reach Twinly: {exc}", 502)


@app.get("/api/health")
def health():
    """Quick check that this server is running. Doesn't contact Twinly."""
    return jsonify({"ok": True})


@app.get("/api/status")
def status():
    """Is the Mac with Twinly online, and what is this key allowed to do?"""
    return forward(twinly.me())


@app.get("/api/usage")
def usage():
    return forward(twinly.usage())


@app.post("/api/tasks")
def create_task():
    """Start a task, e.g. {"prompt": "Read me the subject of my newest email"}."""
    data = body_json()
    prompt = text_field(data, "prompt")
    if not prompt:
        return error("missing_prompt", "Send a 'prompt' describing the task.")
    return forward(twinly.create_task(prompt, data.get("output_schema")))


@app.post("/api/messages")
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
    return forward(twinly.send_message(to, text))


@app.post("/api/calls")
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
    return forward(twinly.place_call(to, goal, text_field(data, "say") or None))


@app.post("/api/speak")
def speak():
    """Say a phrase in the user's own voice. Returns a job with audio when done."""
    text = text_field(body_json(), "text")
    if not text:
        return error("missing_text", "Send the 'text' to speak.")
    return forward(twinly.speak(text))


@app.get("/api/jobs/<job_id>")
def get_job(job_id):
    """Check on a job. Add ?wait=25 to wait for it to change (max 25 seconds)."""
    if not JOB_ID_PATTERN.match(job_id):
        return error("invalid_job_id", "That doesn't look like a job id.")
    try:
        wait = min(max(float(request.args.get("wait", 0)), 0), 25)
    except ValueError:
        wait = 0
    return forward(twinly.get_job(job_id, wait))


@app.post("/api/jobs/<job_id>/cancel")
def cancel_job(job_id):
    if not JOB_ID_PATTERN.match(job_id):
        return error("invalid_job_id", "That doesn't look like a job id.")
    return forward(twinly.cancel_job(job_id))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
