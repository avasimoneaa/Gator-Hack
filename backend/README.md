# Backend

A small Python server that sits between the ReVoice app and Twinly. It:

- is the **only** place the Twinly API key is used (Twinly refuses requests sent straight from a browser),
- handles **logins** for caregivers and patients,
- stores profiles, dashboard settings, contacts, quick phrases, and task history in a **database file**,
- powers the **conversation co-pilot**, **safe help alerts**, and **fatigue mode**.

Twinly's docs: https://www.twinly.tech/docs/developer-api

## Files

| File | What it does |
|---|---|
| `app.py` | The server. The app calls its `/api/...` routes. |
| `auth.py` | Logins: hashed passwords, login tokens, caregiver-only rules. |
| `db.py` | The database (SQLite, saved as `revoice.db`). Tables are created automatically. |
| `replies.py` | Conversation co-pilot: suggests whole replies from what the other person said. |
| `help_alerts.py` | Help button: texts help contacts in order, waits for a real reply, escalates. |
| `fatigue.py` | Fatigue mode: compares recent gaze stats with the user's own usual numbers. |
| `twinly.py` | Talks to Twinly using the key from `.env`. |
| `test_twinly.py` | Checks your key and whether your Mac is online. Free — uses no prompts. |
| `requirements.txt` | The Python packages to install. |

## Set up (in your Codespace terminal)

1. **Make your `.env` file** in the repo's main folder (skip if you already have one):
   ```
   cp .env.example .env
   ```
   In `.env`, put your Twinly key after `TWINLY_API_KEY=`.

2. **Add a secret for logins.** Run this, copy what it prints, and put it after `SECRET_KEY=` in `.env`:
   ```
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   Without it, the server still runs but everyone gets logged out whenever it restarts.

3. **Install the packages:**
   ```
   cd backend
   pip install -r requirements.txt
   ```

4. **Open the Twinly app on your Mac** with "Let keys text, call and run tasks as you" switched on, then test:
   ```
   python test_twinly.py
   ```

5. **Start the server:**
   ```
   python app.py
   ```
   It runs on port **5001** and creates `revoice.db` the first time. Check the **Ports** tab for its address.

## How logins work

1. A **caregiver signs up** and starts a patient profile → gets back a **join code** (like `7ED156`).
2. The **patient and other family** sign up with that join code, so everyone shares one profile.
3. Signing up or logging in returns a **token**. The app sends it with every request as a header:
   `Authorization: Bearer <token>`. Tokens last 7 days.
4. **Caregivers** can change the dashboard, contacts and phrases. **Patients** can see them and run tasks.

## Routes

**Accounts** (no login needed for these two)

| Route | Body |
|---|---|
| `POST /api/auth/signup` | `{"email", "password", "name", "role": "caregiver" or "patient", "profile_name": "Maya"}` — or `"join_code"` instead of `"profile_name"` to join |
| `POST /api/auth/login` | `{"email", "password"}` |

**Everything below needs the login token.** 🔒 = caregivers only.

| Route | Does | Body |
|---|---|---|
| `GET /api/auth/me` | Who's logged in + their profile | — |
| `GET /api/profile` | Dashboard tiles and settings | — |
| `PUT /api/profile` 🔒 | Change settings | any of `name`, `dwell_ms` (500–5000), `voice` (`female`/`male`/`personal`), `voice_speed` (0.5–2), `text_size` (`medium`/`large`/`extra-large`), `fatigue_mode` (true/false), `tiles` (1–4 of `call`, `text`, `phrases`, `appointments`, `keyboard`, `conversation`, `email`, `refills`) |
| `GET /api/contacts` | List contacts | — |
| `POST /api/contacts` 🔒 | Add a contact | `{"name": "Mom", "phone": "+13525550100", "help_order": 1}` — `help_order` is optional |
| `PUT /api/contacts/<id>` 🔒 | Edit a contact | any of `name`, `phone`, `help_order` (1–10, or `null` to remove from the help list) |
| `DELETE /api/contacts/<id>` 🔒 | Remove a contact | — |
| `GET /api/phrases` | List quick phrases | — |
| `POST /api/phrases` 🔒 | Add a phrase | `{"text": "I'm thirsty"}` |
| `DELETE /api/phrases/<id>` 🔒 | Remove a phrase | — |
| `GET /api/history` | Last 50 things Twinly was asked to do | — |
| `POST /api/replies` | Conversation co-pilot: suggested replies | `{"heard": "what they said", "conversation": [{"speaker": "them"/"me", "text": "..."}], "typed": "I think", "count": 3}` — all optional except one of `heard`/`typed` |
| `POST /api/help` | Help button: start an alert | — |
| `GET /api/help/<id>` | Check the alert (call every 10–20s, read `say` aloud when it changes) | — |
| `POST /api/help/<id>/cancel` | False alarm — tells everyone already texted | — |
| `POST /api/gaze-stats` | Report gaze stats (every few minutes of use) | `{"local_hour": 0-23, "minutes", "selections", "near_misses", "corrections", "avg_select_ms"}` |
| `GET /api/fatigue?local_hour=20` | How tired does the user seem? Suggested settings | — |
| `GET /api/status` | Is the Mac online? What can the key do? | — |
| `GET /api/usage` | Prompts / usage left | — |
| `POST /api/tasks` | Ask Twinly to read email/calendar or work in the browser | `{"prompt": "..."}` |
| `POST /api/messages` | Send a text | `{"to": "Mom", "text": "...", "confirmed": true}` |
| `POST /api/calls` | Phone someone in the user's voice | `{"to": "...", "goal": "...", "confirmed": true}` |
| `POST /api/speak` | Say a phrase in the user's own voice | `{"text": "..."}` |
| `GET /api/jobs/<id>?wait=25` | Check on a job (waits up to 25s for a change) | — |
| `POST /api/jobs/<id>/cancel` | Cancel a job (the Cancel button) | — |
| `GET /api/health` | Is this server running? (no login needed) | — |

Texts and calls are refused unless the app sends `"confirmed": true`, because they go out immediately. Always show the user a confirmation screen first.

### How a task works

1. The app sends `POST /api/tasks` and gets back a **job** with an `id` and `status: "queued"`.
2. The app calls `GET /api/jobs/<id>?wait=25` again and again. Each reply is a status change: `running`, `needs_approval`, then `done`, `failed`, `canceled`, or `expired`.
3. When it's `done`, the answer is in `result.answer` — read it aloud.

## How the new features work

### Conversation co-pilot
The app listens to the other person (the browser's speech-to-text), sends what they said to `POST /api/replies`, and shows the 3 replies as big gaze buttons. Picking one speaks it. If the user starts typing, the suggestions continue their words. It uses Twinly's chat model with thinking turned off so it answers fast, and it matches the style of the user's saved phrases. What people say is sent to Twinly to make suggestions.

### Help alerts
A caregiver marks help contacts with `help_order` (1 = first). The Help button is **always on screen** — it isn't one of the 4 tiles, so it can't be removed.
1. `POST /api/help` texts the first help contact. The app says **"Alert sent to Mom. Waiting for a reply."** It never says help is coming until someone actually answers.
2. The app calls `GET /api/help/<id>` every 10–20 seconds and reads `say` aloud whenever it changes. The server checks for a reply at most every 20 seconds (each check reads messages, about $0.02).
3. When someone replies: **"Mom replied: on my way."**
4. No reply after 2 minutes (`HELP_ESCALATE_SECONDS` in `.env` to change) → the next help contact is texted. If a text fails, it moves on right away.
5. `POST /api/help/<id>/cancel` for a false alarm — everyone already texted is told the user is OK.

Statuses: `waiting`, `acknowledged`, `no_response` (everyone texted, nobody answered — it keeps checking), `failed` (no text could be sent), `canceled`.

### Fatigue mode
Every few minutes the app sends `POST /api/gaze-stats`:
- **selections** — finished dwell selections
- **near_misses** — the dwell ring started but the gaze left before it finished
- **corrections** — Back / Undo / Cancel
- **avg_select_ms** — average time to make a selection

`GET /api/fatigue` compares the last 20 minutes with **this user's own usual numbers** from the past 2 weeks, and learns which hours of the day are usually hardest for them. It returns a `level` (`normal`, `tired`, `very_tired`), the `reasons`, `suggest`ed settings (longer dwell, fewer tiles, offer a rest), and a sentence to `say`. Until it has enough history (`learning: true`) it uses general rules. **The app should ask the user before changing anything.** Caregivers can switch it off with `fatigue_mode: false`.

## Good to know

- **The database is one file, `backend/revoice.db`.** It's in `.gitignore`, so people's data is never uploaded. Delete it to start fresh.
- **Free plan: 5 prompts a day**, shared with the Twinly app, then extra usage credit. Checking status is free.
- **Calls** need extra setup on the Mac (Google Voice in Chrome, BlackHole 2ch, Screen Recording, a recorded voice). Texts and tasks are easier to demo.
- **Speaking in the user's voice** needs a recorded voice in the Twinly app first.
- Twinly's Mac must be on, awake, and running Twinly, or jobs fail with `twinly_offline`.
- Before putting this server on the public internet (e.g. Fly.io), set a real `SECRET_KEY`.


Caregivers connect accounts in Twinly on the computer where it runs; ReVoice does not collect their app passwords. The dashboard can show Twinly-read email and calendar information, recent messages for saved contacts, and ReVoice-started call/task history. The current API does not expose a complete external incoming-call feed. Uber/Lyft requests use the caregiver-selected provider and require a staged trip summary plus patient confirmation before Twinly orders anything.
