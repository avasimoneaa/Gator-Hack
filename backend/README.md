# Backend

A small Python server that sits between the ReVoice app and Twinly. It's the **only** place the Twinly API key is used — Twinly refuses requests sent straight from a browser, so the app must go through here.

Twinly's docs: https://www.twinly.tech/docs/developer-api

## Files

| File | What it does |
|---|---|
| `app.py` | The server. The app calls its `/api/...` routes. |
| `twinly.py` | Talks to Twinly using the key from `.env`. |
| `test_twinly.py` | Checks your key and whether your Mac is online. Free — uses no prompts. |
| `requirements.txt` | The Python packages to install. |

## Set up (in your Codespace terminal)

1. **Add your key.** In the repo's main folder, make a copy of `.env.example` named `.env`:
   ```
   cp .env.example .env
   ```
   Open `.env`, replace `your-twinly-key-here` with your real key, and save. `.env` is in `.gitignore`, so it never gets uploaded.

2. **Install the packages:**
   ```
   cd backend
   pip install -r requirements.txt
   ```

3. **Open the Twinly app on your Mac** and make sure "Let keys text, call and run tasks as you" is on.

4. **Test the connection:**
   ```
   python test_twinly.py
   ```
   You should see `✓ Your key works.` and `Mac online: yes`.

5. **Start the server:**
   ```
   python app.py
   ```
   It runs on port **5001**. Check the **Ports** tab for its address.

## Routes the app can call

| Route | Does | Body |
|---|---|---|
| `GET /api/health` | Is this server running? | — |
| `GET /api/status` | Is the Mac online? What can the key do? | — |
| `GET /api/usage` | Prompts / usage left | — |
| `POST /api/tasks` | Do something on the Mac ("read my newest email") | `{"prompt": "..."}` |
| `POST /api/messages` | Send a text | `{"to": "Mom", "text": "...", "confirmed": true}` |
| `POST /api/calls` | Phone someone in the user's voice | `{"to": "...", "goal": "...", "confirmed": true}` |
| `POST /api/speak` | Say a phrase in the user's own voice | `{"text": "..."}` |
| `GET /api/jobs/<id>?wait=25` | Check on a job (waits up to 25s for a change) | — |
| `POST /api/jobs/<id>/cancel` | Cancel a job (the Cancel button) | — |

Texts and calls are refused unless the app sends `"confirmed": true`, because they go out immediately. Always show the user a confirmation screen first.

### How a task works

1. The app sends `POST /api/tasks` and gets back a **job** with an `id` and `status: "queued"`.
2. The app calls `GET /api/jobs/<id>?wait=25` again and again. Each reply is a status change: `running`, `needs_approval`, then `done`, `failed`, `canceled`, or `expired`.
3. When it's `done`, the answer is in `result.answer` — read it aloud.

## Good to know

- **Free plan: 5 prompts a day**, shared with the Twinly app. Redeem a hackathon promo code in Twinly → Settings → Developer API for more.
- **Calls** need extra setup on the Mac (Google Voice in Chrome, BlackHole 2ch, Screen Recording, a recorded voice). Texts and tasks are easier to demo.
- **Speaking in the user's voice** needs a recorded voice in the Twinly app first.
- Twinly's Mac must be on, awake, and running Twinly, or jobs fail with `twinly_offline`.
