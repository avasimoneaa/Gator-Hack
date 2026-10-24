"""Fatigue mode.

The app reports simple gaze stats every few minutes. This compares the
last ~20 minutes against the user's OWN usual numbers (their baseline),
so it adapts to each person instead of using one rule for everyone. It also
learns which hours of the day are usually hardest for them.

It only suggests changes. The app asks the user before applying them.
"""

import time

RECENT_MINUTES = 20
BASELINE_DAYS = 14
MIN_RECENT_SELECTIONS = 8      # not enough activity -> don't guess
MIN_BASELINE_SELECTIONS = 40   # until then, use general rules


def _totals(rows):
    selections = sum(r["selections"] for r in rows)
    near_misses = sum(r["near_misses"] for r in rows)
    corrections = sum(r["corrections"] for r in rows)
    weighted_ms = sum(r["avg_select_ms"] * r["selections"] for r in rows)
    return {
        "selections": selections,
        "near_miss_rate": near_misses / (selections + near_misses) if selections + near_misses else 0.0,
        "correction_rate": corrections / selections if selections else 0.0,
        "avg_select_ms": weighted_ms / selections if selections else 0.0,
    }


def _tiring_hours(rows):
    """Hours of the day when this user is usually slowest (top quarter)."""
    by_hour = {}
    for r in rows:
        if r["selections"]:
            entry = by_hour.setdefault(r["local_hour"], [0, 0.0])
            entry[0] += r["selections"]
            entry[1] += r["avg_select_ms"] * r["selections"]
    averages = {hour: total_ms / count for hour, (count, total_ms) in by_hour.items() if count >= 10}
    if len(averages) < 4:
        return []
    ranked = sorted(averages, key=averages.get, reverse=True)
    return sorted(ranked[: max(1, len(ranked) // 4)])


def record(db, user, data):
    db.execute(
        """INSERT INTO gaze_stats (profile_id, user_id, recorded_at, local_hour, minutes,
               selections, near_misses, corrections, avg_select_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user["profile_id"], user["id"], time.time(), data["local_hour"], data["minutes"],
            data["selections"], data["near_misses"], data["corrections"], data["avg_select_ms"],
        ),
    )
    db.commit()


def assess(db, profile, user_id, local_hour):
    now = time.time()
    rows = db.execute(
        "SELECT * FROM gaze_stats WHERE profile_id = ? AND user_id = ? AND recorded_at >= ?",
        (profile["id"], user_id, now - BASELINE_DAYS * 86400),
    ).fetchall()
    recent_rows = [r for r in rows if r["recorded_at"] >= now - RECENT_MINUTES * 60]
    baseline_rows = [r for r in rows if r["recorded_at"] < now - RECENT_MINUTES * 60]
    recent, baseline = _totals(recent_rows), _totals(baseline_rows)
    tiring_hours = _tiring_hours(baseline_rows)

    result = {
        "fatigue_mode": bool(profile["fatigue_mode"]),
        "level": "normal",
        "reasons": [],
        "usual_tiring_hours": tiring_hours,
        "recent": recent,
        "baseline": baseline if baseline["selections"] else None,
        "suggest": None,
        "say": None,
        "learning": True,
    }
    if not profile["fatigue_mode"] or recent["selections"] < MIN_RECENT_SELECTIONS:
        return result

    score, reasons = 0, []
    personal = baseline["selections"] >= MIN_BASELINE_SELECTIONS
    if personal:
        # Compare with this person's own normal.
        if recent["avg_select_ms"] > baseline["avg_select_ms"] * 1.6:
            score, reasons = score + 2, reasons + ["Choosing is taking much longer than usual"]
        elif recent["avg_select_ms"] > baseline["avg_select_ms"] * 1.3:
            score, reasons = score + 1, reasons + ["Choosing is taking longer than usual"]
        if recent["near_miss_rate"] > baseline["near_miss_rate"] + 0.30:
            score, reasons = score + 2, reasons + ["Many more near-misses than usual"]
        elif recent["near_miss_rate"] > baseline["near_miss_rate"] + 0.15:
            score, reasons = score + 1, reasons + ["More near-misses than usual"]
        if recent["correction_rate"] > baseline["correction_rate"] + 0.15:
            score, reasons = score + 1, reasons + ["More undos and corrections than usual"]
    else:
        # Still learning this person: use general rules.
        if recent["near_miss_rate"] > 0.5:
            score, reasons = score + 2, reasons + ["Many near-misses"]
        if recent["correction_rate"] > 0.3:
            score, reasons = score + 1, reasons + ["Many undos and corrections"]
    if score and local_hour in tiring_hours:
        score, reasons = score + 1, reasons + ["This is usually a tiring time of day"]

    dwell = profile["dwell_ms"]
    if score >= 4:
        result["level"] = "very_tired"
        result["suggest"] = {"dwell_ms": min(5000, round(dwell * 1.6)), "max_tiles": 2, "offer_rest": True}
        result["say"] = "You seem really tired. Would you like to rest, or switch to bigger buttons?"
    elif score >= 2:
        result["level"] = "tired"
        result["suggest"] = {"dwell_ms": min(5000, round(dwell * 1.3)), "max_tiles": 3, "offer_rest": False}
        result["say"] = "You seem a little tired. Want me to make the buttons bigger and slower?"
    result["reasons"] = reasons
    result["learning"] = not personal
    return result
