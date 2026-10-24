# Frontend

The ReVoice Vite app provides webcam gaze selection, spoken feedback, account login, and a confirmed read-only Twinly task flow.

## Run locally

1. Start the Flask backend from the repository's `backend` folder. It listens on `http://localhost:5001` by default.
2. In this folder, run `npm install` once, then `npm run dev`.
3. Open the local URL Vite prints. Allow camera access, start gaze tracking, then sign in or create a demo caregiver account.
4. On the dashboard, choose **Speak a request to Gemma** and say “Read my newest email.” The browser transcribes your speech, and Gemma maps it to the supported task.
5. Review the prepared request and gaze-select **Confirm and start**. Gemma never starts Twinly tasks by itself.

## Local Gemma setup

1. Install Ollama for Windows and start the Ollama app.
2. In PowerShell, run `ollama run gemma4:e2b` once to download the model. The backend defaults to this model and to Ollama at `http://127.0.0.1:11434`.
3. Keep Ollama running while using ReVoice. Start the Flask backend on the same computer so its `/api/interpret` route can reach the local model.
4. The browser voice input uses the browser's speech-recognition feature; availability and whether transcription uses an online service depend on the browser. The transcript is sent to the ReVoice backend for Gemma interpretation.

For a hosted frontend demo, `VITE_API_BASE_URL` must point to a reachable ReVoice backend. If the backend stays on your computer, it must be reachable through a protected tunnel while the demo runs. Do not expose Ollama's port directly to the internet; the backend calls Ollama locally.

The browser app never receives the Twinly API key. The backend reads it from the ignored `.env` file in the repository root. Set `VITE_API_BASE_URL` only when the backend is running at a different address.

The current MVP task is read-only. It does not send messages, place calls, or book appointments.
