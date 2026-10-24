"""Safe help alerts.

1. One glance texts the first help contact.
2. The app says "Alert sent to Mom. Waiting for a reply." -- never
   "help is coming" until a person actually answers.
3. The server checks for a reply. When one arrives, the app reads it aloud:
   "Mom replied: on my way."
4. If nobody replies in time, it texts the next help contact, and so on.
5. A false alarm can be canceled, and everyone already texted is told.
"""

import json
import os
import time
from datetime import datetime

import requests

import twinly

ESCALATE_AFTER_SECONDS = int(os.environ.get("HELP_ESCALATE_SECONDS", "120"))
CHECK_EVERY_SECONDS = 20       # reading messages costs a little, so don't check constantly
CLOCK_SLACK_SECONDS = 60       # allow for small clock differences between devices

DONE_STATUSES = {"acknowledged", "canceled", "failed"}


def _now():
    return time.time()


def _message_job_ok(status, body):
    if status not in (200, 202) or not isinstance(body, dict):
        return False
    job = body.get("job") if isinstance(body.get("job"), dict) else body
    return str(job.get("status", "")).lower() not in ("failed", "canceled", "cancelled", "expired")


def _job_from(body):
    if not isinstance(body, dict):
        return {}
    return body.get("job") if isinstance(body.get("job"), dict) else body


def _job_id(body):
    job = _job_from(body)
    return str(job.get("id") or job.get("job_id") or "")


def _to_unix(value):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _messages_from(status, body):
    """GET /messages may return the list directly or inside a finished job."""
    if status != 200 or not isinstance(body, dict):
        return None
    if isinstance(body.get("messages"), list):
        return body["messages"]
    result = body.get("result")
    if isinstance(result, dict) and isinstance(result.get("messages"), list):
        return result["messages"]
    return None


def _load(row):
    alert = dict(row)
    alert["contacts"] = json.loads(alert["contacts"])
    alert["notified"] = json.loads(alert["notified"])
    return alert


def _save(db, alert):
    db.execute(
        """UPDATE help_alerts SET status = ?, notified = ?, next_index = ?, next_escalation_at = ?,
               last_checked_at = ?, reply_from = ?, reply_text = ? WHERE id = ?""",
        (
            alert["status"], json.dumps(alert["notified"]), alert["next_index"],
            alert["next_escalation_at"], alert["last_checked_at"],
            alert["reply_from"], alert["reply_text"], alert["id"],
        ),
    )
    db.commit()


def _text_next_contact(alert, patient_name):
    """Text help contacts in order until one text goes out (or none are left)."""
    while alert["next_index"] < len(alert["contacts"]):
        contact = alert["contacts"][alert["next_index"]]
        alert["next_index"] += 1
        message = (
            f"ReVoice alert: {patient_name} needs help right now. "
            f"Please reply to this text so {patient_name} knows you're coming."
        )
        sent_at = _now()
        try:
            response_status, body = twinly.send_message(contact["phone"], message)
            accepted = _message_job_ok(response_status, body)
        except requests.RequestException:
            accepted, body = False, {}
        job = _job_from(body)
        job_status = str(job.get("status", "")).lower()
        job_id = _job_id(body)
        if accepted and job_status in {"failed", "canceled", "cancelled", "expired"}:
            accepted = False
        if accepted and job_id and job_status not in {"done", "completed", "succeeded", "success"}:
            alert["notified"].append({**contact, "sent_at": None, "ok": None, "job_id": job_id})
            alert["status"] = "sending"
            alert["next_escalation_at"] = None
            return
        ok = accepted
        alert["notified"].append({**contact, "sent_at": sent_at if ok else None, "ok": ok})
        if ok:
            alert["status"] = "waiting"
            alert["next_escalation_at"] = sent_at + ESCALATE_AFTER_SECONDS
            return
    # Nobody left to text.
    reached = [n for n in alert["notified"] if n["ok"]]
    alert["status"] = "no_response" if reached else "failed"
    alert["next_escalation_at"] = None


def _check_for_reply(alert):
    for person in reversed(alert["notified"]):
        if not person["ok"]:
            continue
        try:
            messages = _messages_from(*twinly.read_messages(person["phone"], limit=10))
        except requests.RequestException:
            messages = None
        for msg in messages or []:
            if not isinstance(msg, dict) or msg.get("from") == "me":
                continue
            at = _to_unix(msg.get("at"))
            if at is not None and at >= person["sent_at"] - CLOCK_SLACK_SECONDS:
                alert["status"] = "acknowledged"
                alert["reply_from"] = person["name"]
                alert["reply_text"] = str(msg.get("text") or "")[:500]
                alert["next_escalation_at"] = None
                return


def start(db, user, patient_name):
    contacts = [
        {"id": row["id"], "name": row["name"], "phone": row["phone"]}
        for row in db.execute(
            "SELECT id, name, phone FROM contacts WHERE profile_id = ? AND help_order IS NOT NULL "
            "ORDER BY help_order, id",
            (user["profile_id"],),
        )
    ]
    if not contacts:
        return None
    cursor = db.execute(
        "INSERT INTO help_alerts (profile_id, user_id, status, contacts, created_at) VALUES (?, ?, 'waiting', ?, ?)",
        (user["profile_id"], user["id"], json.dumps(contacts), _now()),
    )
    alert = _load(db.execute("SELECT * FROM help_alerts WHERE id = ?", (cursor.lastrowid,)).fetchone())
    _text_next_contact(alert, patient_name)
    alert["last_checked_at"] = _now()
    _save(db, alert)
    return alert


def get(db, alert_id, profile_id):
    row = db.execute(
        "SELECT * FROM help_alerts WHERE id = ? AND profile_id = ?", (alert_id, profile_id)
    ).fetchone()
    return _load(row) if row else None


def refresh(db, alert, patient_name):
    """Look for a reply, and text the next person if it's been too long."""
    if alert["status"] in DONE_STATUSES or _now() - alert["last_checked_at"] < CHECK_EVERY_SECONDS:
        return alert
    if alert["status"] == "sending":
        pending = next((p for p in reversed(alert["notified"]) if p.get("ok") is None and p.get("job_id")), None)
        if pending:
            try:
                status, body = twinly.get_job(pending["job_id"], wait=0)
            except requests.RequestException:
                status, body = 0, {}
            job = _job_from(body)
            job_status = str(job.get("status", "")).lower()
            if status == 200 and job_status in {"done", "completed", "succeeded", "success"}:
                pending["ok"] = True
                pending["sent_at"] = _now()
                pending["job_status"] = job_status
                alert["status"] = "waiting"
                alert["next_escalation_at"] = pending["sent_at"] + ESCALATE_AFTER_SECONDS
            elif job_status in {"failed", "canceled", "cancelled", "expired"}:
                pending["ok"] = False
                pending["sent_at"] = None
                pending["job_status"] = job_status
                alert["status"] = "waiting"
                _text_next_contact(alert, patient_name)
            elif job_status:
                pending["job_status"] = job_status
        alert["last_checked_at"] = _now()
        _save(db, alert)
        return alert
    _check_for_reply(alert)
    if alert["status"] == "waiting" and alert["next_escalation_at"] and _now() >= alert["next_escalation_at"]:
        _text_next_contact(alert, patient_name)
    alert["last_checked_at"] = _now()
    _save(db, alert)
    return alert


def cancel(db, alert, patient_name):
    """False alarm: stop, and tell everyone who was texted."""
    if alert["status"] in ("canceled", "failed"):
        return alert
    for person in alert["notified"]:
        if person.get("ok") is None and person.get("job_id"):
            try:
                twinly.cancel_job(person["job_id"])
            except requests.RequestException:
                pass
        elif person.get("ok"):
            try:
                twinly.send_message(person["phone"], f"Update from ReVoice: false alarm, {patient_name} is OK. Thank you!")
            except requests.RequestException:
                pass
    alert["status"] = "canceled"
    alert["next_escalation_at"] = None
    _save(db, alert)
    return alert


def _names(people):
    names = [p["name"] for p in people]
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def to_json(alert):
    reached = [p for p in alert["notified"] if p["ok"]]
    status = alert["status"]
    if status == "acknowledged":
        say = f"{alert['reply_from']} replied: {alert['reply_text']}"
    elif status == "sending":
        pending = next((p for p in reversed(alert["notified"]) if p.get("ok") is None), None)
        if pending and pending.get("job_status") == "needs_approval":
            say = f"Twinly needs approval on its computer before it can send the alert to {pending['name']}. I will confirm when the message is sent."
        else:
            say = f"Twinly is processing the alert for {pending['name']}. I will confirm when the message is sent."
    elif status == "waiting":
        say = f"Alert sent to {_names(reached)}. Waiting for a reply."
    elif status == "no_response":
        say = f"No reply yet from {_names(reached)}. Everyone on your help list has been texted."
    elif status == "failed":
        say = "The alert could not be sent. Check that Twinly is running on the computer."
    else:
        say = "Alert canceled. Everyone who was texted has been told it was a false alarm."
    return {
        "id": alert["id"],
        "status": status,
        "say": say,  # the app reads this aloud
        "texted": [{"name": p["name"], "sent": p["ok"]} for p in alert["notified"]],
        "reply_from": alert["reply_from"],
        "reply_text": alert["reply_text"],
        "approval_required": any(p.get("job_status") == "needs_approval" and p.get("ok") is None for p in alert["notified"]),
        "next_escalation_in_seconds": (
            max(0, round(alert["next_escalation_at"] - _now())) if alert["next_escalation_at"] else None
        ),
    }
