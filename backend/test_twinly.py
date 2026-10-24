"""Check that your Twinly key and Mac connection work.

This only uses free endpoints (/me and /usage), so it doesn't use up any
of your daily prompts. Run it with:  python test_twinly.py
"""

import twinly


def main():
    try:
        status, me = twinly.me()
    except twinly.MissingKeyError as exc:
        print(f"✗ {exc}")
        return

    if status != 200:
        err = me.get("error", {})
        print(f"✗ Twinly said {status}: {err.get('code')} — {err.get('message')}")
        return

    mac = me.get("mac") or {}
    print("✓ Your key works.")
    print(f"  Key name:  {me.get('name')}")
    print(f"  Scopes:    {', '.join(me.get('scopes') or [])}")
    print(f"  Mac online: {'yes' if mac.get('online') else 'NO — open Twinly on your Mac'}")
    if mac.get("app_version"):
        print(f"  Twinly version: {mac.get('app_version')}")
    setup = mac.get("setup") or {}
    for feature, ready in setup.items():
        print(f"  {feature}: {'ready' if ready is True else ready}")

    status, usage = twinly.usage()
    if status == 200:
        left = usage.get("prompts_left_today")
        if left is not None:
            print(f"  Free prompts left today: {left}")


if __name__ == "__main__":
    main()
