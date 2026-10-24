# Backend

A small Python server that sits between the ReVoice app and Twinly. It:

- is the **only** place the Twinly API key is used (Twinly refuses requests sent straight from a browser),
- handles **logins** for caregivers and patients,
- stores profiles, dashboard settings, contacts, quick phrases, and task history in a **database file**.

Twinly's docs: https://www.twinly.tech/docs/developer-api

## Files

| File | What it does |
|---|---|
| `app.py` | The server. The app calls its `/api/...` routes. |
| `auth.py` | Logins: hashed passwords, login tokens, caregiver-only rules. |
| `db.py` | The database (SQLite, saved as `revoice.db`). Tables are created automatically. |
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
| `PUT /api/profile` 🔒 | Change settings | any of `name`, `dwell_ms` (500–5000), `voice` (`female`/`male`/`personal`), `voice_speed` (0.5–2), `text_size` (`medium`/`large`/`extra-large`), `tiles` (1–4 of `call`, `text`, `phrases`, `appointments`) |
| `GET /api/contacts` | List contacts | — |
| `POST /api/contacts` 🔒 | Add a contact | `{"name": "Mom", "phone": "+13525550100"}` |
| `DELETE /api/contacts/<id>` 🔒 | Remove a contact | — |
| `GET /api/phrases` | List quick phrases | — |
| `POST /api/phrases` 🔒 | Add a phrase | `{"text": "I'm thirsty"}` |
| `DELETE /api/phrases/<id>` 🔒 | Remove a phrase | — |
| `GET /api/history` | Last 50 things Twinly was asked to do | — |
| `GET /api/status` | Is the Mac online? What can the key do? | — |
| `GET /api/usage` | Prompts / usage left | — |
| `POST /api/tasks` | Do something on the Mac ("read my newest email") | `{"prompt": "..."}` |
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

## Good to know

- **The database is one file, `backend/revoice.db`.** It's in `.gitignore`, so people's data is never uploaded. Delete it to start fresh.
- **Free plan: 5 prompts a day**, shared with the Twinly app, then extra usage credit. Checking status is free.
- **Calls** need extra setup on the Mac (Google Voice in Chrome, BlackHole 2ch, Screen Recording, a recorded voice). Texts and tasks are easier to demo.
- **Speaking in the user's voice** needs a recorded voice in the Twinly app first.
- Twinly's Mac must be on, awake, and running Twinly, or jobs fail with `twinly_offline`.
- Before putting this server on the public internet (e.g. Fly.io), set a real `SECRET_KEY`.
