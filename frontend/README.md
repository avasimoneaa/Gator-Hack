# Frontend

The ReVoice Vite app provides webcam gaze selection, spoken feedback, caregiver-managed dashboard tiles and contacts, quick phrases, safe help alerts, conversation replies, fatigue support, an eye-gaze keyboard, and confirmed Twinly tasks, calls, and personal-voice audio.

## Run locally

1. Start the Flask backend from the repository's `backend` folder. It listens on `http://localhost:5001` by default.
2. In this folder, run `npm install` once, then `npm run dev`.
3. Open the local URL Vite prints. Allow camera access, start gaze tracking, then sign in or create a demo caregiver account.
4. On the dashboard, choose **Speak a request to Gemma** and say “Read my newest email.” The browser transcribes your speech, and Gemma maps it to the supported task.
5. Review the prepared request and gaze-select **Confirm and start**. Gemma never starts Twinly tasks by itself.

Caregiver accounts can open **Quick phrases** from the dashboard to save or remove phrases. Patients can select a phrase for browser speech or request audio from their configured Twinly voice. The conversation copilot also offers both browser speech and Twinly voice output for each suggested reply.

Caregivers can add contacts and set their help order in **Caregiver settings**. The patient can start an alert from the dashboard, hear status updates, and cancel a false alarm. Live alerts require the Twinly API and desktop app. Keep ReVoice open and signed in while waiting for replies or escalation; the browser polls alert status and drives the two-minute escalation.

The **Conversation replies** tile can listen for the other person or accept a transcript typed with the eye-gaze keyboard, then ask Twinly for three short suggestions. A user can also start a reply with the eye-gaze keyboard; Twinly uses that unfinished reply as context for suggestions. Selecting a suggestion speaks it aloud. Browser speech recognition may use an online service, and the transcript is sent to Twinly.

The tracker also offers an optional experimental ML dwell assist. It uses a small gaze-mode model trained on the recent MCFW-Gaze dataset. If enabled, it may add up to 500 ms to an ordinary dwell selection when recent gaze resembles free viewing. It does not change confirmation timing or authorize actions. The dataset result is not validated for webcam accuracy or for people with ALS; see `backend/ml/README.md` for reproduction steps and limits.

Fatigue support records gaze selections, near-misses, corrections, and selection time in two-minute batches while fatigue mode is enabled. Choose **Check fatigue support** on the dashboard to view an assessment. It compares up to 20 recent minutes with the signed-in user's rolling 14-day baseline when enough history exists, and otherwise says it is still learning. Longer dwell and fewer, larger dashboard choices apply only after the user accepts them and last for the browser session. The rest screen hides dashboard tasks and presents a gaze-selectable resume action. Caregivers can set a persistent dwell time, toggle fatigue support, and choose up to four dashboard tiles in **Caregiver settings**.

## Local Gemma setup

1. Install Ollama for your operating system and start Ollama.
2. In Terminal (macOS/Linux) or PowerShell (Windows), run `ollama run gemma4:e2b` once to download the model. The backend defaults to this model and to Ollama at `http://127.0.0.1:11434`.
3. Keep Ollama running while using ReVoice. Start the Flask backend on the same computer so its `/api/interpret` route can reach the local model.
4. The browser voice input uses the browser's speech-recognition feature; availability and whether transcription uses an online service depend on the browser. The transcript is sent to the ReVoice backend for Gemma interpretation.

For a hosted frontend demo, `VITE_API_BASE_URL` must point to a reachable ReVoice backend. If the backend stays on your computer, it must be reachable through a protected tunnel while the demo runs. Do not expose Ollama's port directly to the internet; the backend calls Ollama locally.

The browser app never receives the Twinly API key. The backend reads it from the ignored `.env` file in the repository root. Set `VITE_API_BASE_URL` only when the backend is running at a different address.

## Caregiver setup and face sign-in

1. Sign in or create the caregiver account. Start gaze tracking, then complete the 17-point calibration.
2. Enroll the patient, caregiver, or both. Face matching runs in the browser; its face measurements are stored in this browser on this device. Camera images and templates are not sent to the ReVoice backend. Re-enroll on each device/browser that needs face access.
3. In the portal, **Patient sign out** returns to the face sign-in screen. **Caregiver sign out** is in the upper corner; it asks for the caregiver password, removes the local face profiles, and revokes that browser session at the backend.

Face matching is an accessibility convenience for this hackathon demo, not strong identity verification. The local face template and session are accessible to someone with control of the browser/device, and face matching can be fooled or reject a real user. Keep the caregiver password sign-in available. Do not use this demo to protect sensitive or medical records.

## Medical emergency demo

The dashboard includes a gaze-selectable **Medical emergency (simulation)** flow. It reads the request aloud, requires an explicit confirmation, and displays a simulated outcome. This prototype does not call 911, contact authorities, send a text, or activate any emergency service. The screens describe a possible future workflow only.

Appointment and refill tiles first ask Twinly to prepare a request and stop before the final submission. ReVoice then displays the returned summary and requires a separate three-second gaze confirmation before it asks Twinly to submit the staged request. The computer running Twinly must be available; Twinly may also pause for its own desktop approval. Do not include credentials, payment information, or sensitive identifiers in request details. Calls and texts are separate actions and require on-screen review and confirmation. Twinly personal-voice speech requires a voice configured in the Twinly app. Calibration presents a face-positioning preview and 17 gaze points; the camera remains required for gaze selection.

