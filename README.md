# iSpeak

**iSpeak is an accessibility-focused communication app built for Gator Hack 2026.** It lets people with limited movement or speech use eye gaze, head movement, touch, and spoken feedback to navigate a computer, prepare messages, and work with a connected desktop assistant.

> **Hackathon prototype:** iSpeak is not a medical device or a validated assistive communication product. Eye and face tracking may be inaccurate, and the app must not be relied on for emergencies or other critical care.

## What it can do

- Navigate large, configurable buttons using webcam eye gaze, a head pointer, or touch/mouse.
- Calibrate eye tracking with a 17-point calibration flow.
- Read interface updates aloud and provide browser speech input where supported.
- Create and review messages, use saved phrases, and access conversation suggestions.
- Keep an app calendar separate from Twinly's connected, read-only calendar, and prepare event reminders to share with a caregiver.
- Prepare supported tasks through Twinly and require an on-screen confirmation before actions such as sending or submitting.
- Offer optional face sign-in and an experimental gaze-mode assist. These features are convenience/prototype features, not security or clinical validation.

## Project layout

| Path | Purpose |
| --- | --- |
| `frontend/` | Vite web app, accessibility controls, calibration, and browser-side features |
| `backend/` | Flask API, account handling, local database, and Twinly integration |
| `backend/ml/` | Experimental gaze-mode model, dataset notes, and reproduction scripts |
| `.env.example` | Environment-variable template. Copy this to `.env` for local use. |

## Run it locally

You need a recent Node.js release, Python 3, and a Twinly API key. Some AI-assisted features also need Ollama with the configured Gemma model. The webcam works on `localhost` or an HTTPS site, subject to browser camera permissions.

### 1. Configure the backend

From the repository root, copy `.env.example` to `.env`, then set `TWINLY_API_KEY` and replace `SECRET_KEY` with a random value. Copy the template with:

```sh
# macOS/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Generate a secret with:

```sh
python -c "import secrets; print(secrets.token_hex(32))"
```

Keep `.env` private; it is ignored by Git.

Create a Python environment and install the backend packages:

```sh
python -m venv .venv
```

Activate it, then install and run the backend:

```sh
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

python -m pip install -r backend/requirements.txt
python backend/app.py
```

The API listens at `http://localhost:5001` by default.

### 2. Start the frontend

In a second terminal, from the repository root:

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build instead, run `npm run build` from `frontend/`.

### 3. Start local Gemma (when using Gemma-powered features)

Install Ollama, then download and start the configured model:

```sh
ollama run gemma4:e2b
```

The backend expects Ollama at `http://127.0.0.1:11434` and uses `gemma4:e2b` by default. You can change these with `GEMMA_BASE_URL` and `GEMMA_MODEL` in `.env`. Keep Ollama running while using those features.

Twinly-powered tasks also require the Twinly desktop app to be running and connected on the computer that can perform the task. See [`backend/README.md`](backend/README.md) for backend setup and API details.

## First use

1. Open iSpeak and sign in or create a caregiver account.
2. Choose eye tracking and complete calibration, choose the head pointer and center it, or continue with touch/mouse.
3. Grant camera permission if using gaze, head, or face features.
4. Configure contacts and preferences in caregiver settings.
5. Review every proposed message or task. iSpeak requires confirmation before supported external actions are started.

For the detailed screen guide, navigation options, and feature behavior, see [`frontend/README.md`](frontend/README.md).

## Experimental gaze model

The optional gaze-mode assist uses a small classifier trained from public gaze datasets. It can adjust ordinary dwell timing; it does not select controls or confirm actions. Its offline evaluation is limited and does not establish better iSpeak accuracy, webcam reliability, or suitability for people with ALS. Keep it optional and treat it as experimental.

Dataset attribution, evaluation results, limitations, and training steps are in [`backend/ml/README.md`](backend/ml/README.md).

## Privacy and safety notes

- The browser does not receive the Twinly API key; the backend reads it from `.env`.
- Face templates and gaze calibration are stored in the browser on the current device. Face sign-in is not strong identity verification.
- Speech recognition may use an online browser service; dictated transcripts are sent to the backend when used for AI suggestions.
- Do not expose the development backend or Ollama directly to the public internet. A public deployment needs a proper security review and deployment configuration.
- The emergency screen is a simulation. It does not contact emergency services. Do not use this prototype for emergency response or medical decisions.

## Team

- Aditya Chhabria
- Lilly Liu
- Aaron Ghosh
- Ava Aguilar

## License

MIT License. See [`LICENSE`](LICENSE). Third-party datasets and libraries keep their own licenses (see `backend/ml/README.md` for dataset attribution).
