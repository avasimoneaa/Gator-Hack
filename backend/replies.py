"""Conversation co-pilot: suggest whole replies instead of the next word.

The app listens to what the other person says (speech-to-text in the
browser) and sends it here. Twinly's chat model suggests a few short
replies the user might want to say. One glance speaks a whole sentence.

If the user has started typing, every suggestion continues their words.
"""

import json

import twinly

MAX_SUGGESTIONS = 4
MAX_TURNS = 12      # how much earlier conversation to send as context
MAX_TEXT = 1000     # per piece of text


def _clean_turns(conversation):
    turns = []
    if not isinstance(conversation, list):
        return turns
    for turn in conversation[-MAX_TURNS:]:
        if not isinstance(turn, dict):
            continue
        text = turn.get("text")
        if not isinstance(text, str) or not text.strip():
            continue
        speaker = "me" if turn.get("speaker") == "me" else "them"
        turns.append((speaker, text.strip()[:MAX_TEXT]))
    return turns


def build_messages(patient_name, heard, typed, conversation, count, saved_phrases):
    lines = []
    for speaker, text in _clean_turns(conversation):
        who = patient_name if speaker == "me" else "Other person"
        lines.append(f"{who}: {text}")
    if heard:
        lines.append(f"Other person: {heard}")

    rules = [
        f"You help {patient_name} answer in a conversation. {patient_name} has ALS, "
        "cannot speak, and picks replies with their eyes, so every suggestion saves them a lot of effort.",
        f"Suggest exactly {count} replies {patient_name} could say next, in first person, as {patient_name}.",
        "Keep each reply short (under 15 words), natural and warm, like a real person talking, not a robot.",
        "Make them meaningfully different: for example one yes/positive, one no/alternative, "
        "and one that asks a question or adds something.",
        "Never invent facts about their health, plans or feelings; keep suggestions general enough to be true.",
        'Return only JSON like {"replies": ["...", "..."]}.',
    ]
    if typed:
        rules.append(
            f'{patient_name} has already started typing: "{typed}". '
            "Every reply must begin with exactly that text and complete it."
        )
    if saved_phrases:
        rules.append(
            "Phrases they often use, to match their style: "
            + "; ".join(f'"{phrase}"' for phrase in saved_phrases[:15])
        )

    conversation_text = "\n".join(lines) if lines else "(No conversation yet. Suggest good openers.)"
    return [
        {"role": "system", "content": "\n".join(rules)},
        {"role": "user", "content": f"Conversation so far:\n{conversation_text}"},
    ]


def parse_replies(body, count, typed):
    """Pull the list of replies out of Twinly's chat answer."""
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return []
    replies = []
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            data = data.get("replies", [])
        if isinstance(data, list):
            replies = [r for r in data if isinstance(r, str)]
    except (ValueError, TypeError):
        # Not JSON: fall back to one reply per line.
        replies = [line.strip(" -*•\"'0123456789.") for line in str(content).splitlines()]

    cleaned = []
    for reply in replies:
        reply = reply.strip()
        if not reply or reply in cleaned:
            continue
        if typed and not reply.lower().startswith(typed.lower()):
            reply = f"{typed.rstrip()} {reply}"
        cleaned.append(reply[:300])
    return cleaned[:count]


def suggest(patient_name, heard, typed, conversation, count, saved_phrases):
    """Returns (status, body). On success body is {"replies": [...]}."""
    messages = build_messages(patient_name, heard, typed, conversation, count, saved_phrases)
    status, body = twinly.chat(
        messages,
        response_format={"type": "json_object"},
        reasoning_effort="none",  # fast answers; nobody should wait mid-conversation
        temperature=0.7,
        max_tokens=300,
    )
    if status != 200:
        return status, body
    replies = parse_replies(body, count, typed)
    if not replies:
        return 502, {"error": {"code": "no_suggestions", "message": "Couldn't come up with replies. Try the keyboard."}}
    return 200, {"replies": replies}
