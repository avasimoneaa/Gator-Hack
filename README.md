# ReVoice

An eye-gaze assistant that lets people with ALS and other severe mobility limitations get things done on a computer — make calls, send texts, book appointments, and speak saved phrases — using only their eyes. ReVoice sends tasks to Twinly, a desktop AI agent, and reads its progress and results aloud, so the user doesn't even need to see the screen.

Built for **Gator Hack 2026**.

## How it works

1. **Look to choose.** The user rests their gaze on one of a few large tiles. A ring fills up, then the tile is selected (dwell selection).
2. **Twinly does the work.** ReVoice sends the task to Twinly, which carries it out on the computer.
3. **Hear what's happening.** Each step and the final result are spoken aloud.
4. **Stay in control.** Anything important — sending, booking, calling, submitting — needs the user's confirmation first. Pause and Cancel are always available.

Caregivers and family can customize the dashboard (up to 4 tiles at a time), contacts, quick phrases, and voice.

## Project structure

| Folder | What goes there |
|---|---|
| `frontend/` | The app screens: dashboard, dwell selection, confirmations, settings |
| `backend/` | The server code that holds the Twinly API key and talks to Twinly |

## Tech

- **Twinly** — desktop AI agent that performs tasks on the user's computer
- **Figma Make** — interface design and prototype
- **Gemma 4 E2B** — locally run language model that maps spoken requests to the app's allowlisted tasks; users review and confirm by gaze before Twinly runs one
- **WebGazer** — webcam-based gaze estimation and dwell selection
- **Browser speech recognition and text-to-speech** — spoken requests and accessible progress updates

## Running locally

1. Copy `.env.example` to a new file named `.env`.
2. Put your own Twinly API key in `.env`. **Never commit `.env`** — it's already listed in `.gitignore`.

More setup steps will be added as the frontend and backend are built.

## Team

- Ava Aguilar
## Shared-device face sign-in

The caregiver account signs into the backend first. ReVoice then runs gaze calibration and lets the caregiver enroll a patient face, caregiver face, or both. After enrollment, either person can use the camera to return to the portal. Patient sign-out returns to face sign-in while keeping this browser session available. The caregiver sign-out control requires the caregiver password and revokes that browser session.

Face measurements are kept in the browser on this device and are not uploaded. This is a hackathon convenience flow, not production-grade identity security: browser storage can be changed by someone with device access, and webcam face matching can be fooled or fail. The patient and caregiver use the caregiver's backend permissions while in the portal. ReVoice includes password sign-in as fallback.
