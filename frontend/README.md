# Frontend

The iSpeak Vite app provides webcam gaze selection (or a head pointer, or touch-only use), spoken feedback, a tiled Home screen, Messages (texts, email, calls and activity), an app calendar with caregiver reminders, Twinly’s separate read-only calendar, website tasks, rides, caregiver-managed contacts, quick phrases, safe help alerts, conversation replies, fatigue support, an eye-gaze keyboard, and confirmed Twinly tasks, calls, and personal-voice audio. The screens follow the team's Figma Make design; that export lives in the git-ignored `figma-make/` folder as a reference only.

## Run locally

1. Start the Flask backend from the repository's `backend` folder. It listens on `http://localhost:5001` by default.
2. In this folder, run `npm install` once, then `npm run dev`.
3. Open the local URL Vite prints. Choose **Caregiver sign in** (under the face login) and sign in or create a demo caregiver account.
4. On the **Eye tracking** step, choose **Calibrate my eyes**, **Use last calibration**, **Head pointer**, or **Touch only**.
5. On Home, open **Messages → Emails → Ask by voice** and say “Read my newest email.” The browser transcribes your speech, and Gemma maps it to the supported task.
6. Review the prepared request and select **Confirm and start**. Gemma never starts Twinly tasks by itself.

## Screens and navigation

Home shows large tiles: Messages, Talk, Health, Calendar, Rides, Internet, Routines, Errand, Settings, Accessibility, saved workflows, Create workflow, Help, and Log out. The side controls hold **Pause eyes** (or **Turn on eyes** in touch-only mode), Back, Home, and **Get help**.

**Settings** changes the display for this browser: page buttons or scrolling navigation, showing or hiding demo features, 4/6/9/16 buttons per page, blue/dark/warm/high-contrast theme (applied to every screen and Home layout), spacing, text size, Home layout (side controls, classic, illustrated), and head pointer speed. With **page buttons**, Home and menus show one page at a time with Previous/Next, and long lists get ↑ ↓ buttons. With **scrolling**, every tile and list is on one page; look at the top 200 pixels or bottom 100 pixels for 3 seconds to scroll (a button under your gaze always wins), or use a mouse wheel or touch.

A few menus still run on sample data and reach no service: Routines, the Errand menu, insurance, and the medical emergency simulation. Their notices say “Demo only” instead of claiming an action. **Settings → hide demo features** removes them; **show demo features** brings them back.

**Internet** and saved workflows are website tasks: Twinly uses the connected browser to research or prepare the request, shows the result, and stops before sending, submitting, booking, or paying. **Create workflow** saves a task as a Home tile. Selecting a workflow tile offers **start workflow** (reviewed first), **turn off** (hides it from Home but keeps it), or **delete** (asks to confirm). **Settings → manage workflows** lists every workflow, including turned-off ones.

**Calendar** reads up to ten upcoming events from the connected calendar through Twinly after you confirm, and shows them as an Upcoming list or on day, week, and month views. It never creates, changes, or deletes events.

**Rides** prepares an Uber or Lyft trip with the provider a caregiver chose in Caregiver settings. Twinly stops before ordering; you review pickup, destination, time, vehicle, payment method, and total fare, then confirm separately. After an appointment is booked, **Book a ride there** starts the same flow.

## Eye tracking step

After face login (when no pointer is set up yet this session) and after caregiver sign-in, iSpeak asks how to point:

- **Calibrate my eyes** opens the 17-point calibration page.
- **Use last calibration** restores the calibration saved after this person's previous run. It's stored only in this browser, per profile and person (patient or caregiver), and removed on caregiver sign-out. Calibrations are tied to screen size, so the tile warns when the window size has changed. If the saved calibration doesn't work, iSpeak deletes it and asks you to calibrate.
- **Head pointer** moves the pointer by turning or tilting your head; hold still on a button to select it. Before using it, iSpeak centers your resting head position for about two seconds. Choose slow, normal, or fast pointer speed. Switching back to eye tracking requires a fresh eye calibration; switching to head pointer requires centering again.
- **Touch only** skips calibration. Everything works by touch or mouse; turn eyes on later from **Accessibility** or the side controls. The calibration page also has a **Skip calibration · use touch only** button.

Caregiver settings also offer an optional **experimental ML dwell assist**. It uses a small gaze-mode model trained on the recent MCFW-Gaze dataset. If enabled, it may add up to 500 ms to an ordinary dwell selection when recent eye gaze resembles free viewing. It does not apply to the head pointer, does not change confirmation timing, and does not authorize actions. The dataset result is not validated for webcam accuracy or for people with ALS; see `backend/ml/README.md` for reproduction steps and limits.

## Messages, Talk, and help

**Messages** has three tabs:

- **Texts** lists saved contacts. Choose one to read recent texts with them, then **Reply with Gemma** (three draft options, using the last message as context), **Write a reply** (quick reply, Say what I mean, eye-gaze keyboard, or sentence builder), or **Call** them.
- **Emails** loads your newest emails through Twinly after confirmation. Choose one to **Summarize with Twinly** or **Reply with Gemma**; an email reply is sent only after you review the exact text and confirm.
- **Calls & activity** lists calls, texts, and tasks started in iSpeak, with **Read status** for each Twinly job. Twinly's API doesn't share its incoming-call history here.

**New message** chooses a saved contact first. Every text, email reply, and call goes through a review screen and a three-second gaze confirmation before Twinly acts.

**Talk** holds **Quick phrases**, **Conversation replies**, and the eye-gaze keyboard for speaking aloud. Caregivers can save or remove phrases. Patients can select a phrase for browser speech or request audio from their configured Twinly voice. Conversation replies can listen for the other person or accept a transcript typed with the eye-gaze keyboard, then ask Twinly for three short suggestions. Browser speech recognition may use an online service, and the transcript is sent to Twinly.

**Get help** offers **Alert my help contacts** and **Medical emergency (simulation)**. Caregivers add contacts and set their help order in **Settings → Caregiver settings**. The patient can hear alert status updates and cancel a false alarm. Live alerts require the Twinly API and desktop app. Keep iSpeak open and signed in while waiting for replies or escalation; the browser polls alert status and drives the two-minute escalation.

Fatigue support records gaze selections, near-misses, corrections, and selection time in two-minute batches while fatigue mode is enabled. Choose **Accessibility → check fatigue** to view an assessment. It compares up to 20 recent minutes with the signed-in user's rolling 14-day baseline when enough history exists, and otherwise says it is still learning. A longer dwell and 4 larger Home buttons apply only after the user accepts them and last for the browser session. Caregivers can set a persistent dwell time and toggle fatigue support in **Caregiver settings**.

## App connections

Caregiver: sign into Mail, Calendar, Messages, browser sites, and Uber or Lyft on the computer running Twinly. iSpeak asks Twinly to use those accounts and never collects their passwords. Check connection status in Twinly; its API does not report app connection status to iSpeak. See the [Twinly setup and API information](https://www.twinly.tech/docs/developer-api).

## Local Gemma setup

1. Install Ollama for your operating system and start Ollama.
2. In Terminal (macOS/Linux) or PowerShell (Windows), run `ollama run gemma4:e2b` once to download the model. The backend defaults to this model and to Ollama at `http://127.0.0.1:11434`.
3. Keep Ollama running while using iSpeak. Start the Flask backend on the same computer so its `/api/interpret` route can reach the local model.
4. The browser voice input uses the browser's speech-recognition feature; availability and whether transcription uses an online service depend on the browser. The transcript is sent to the iSpeak backend for Gemma interpretation.

For a hosted frontend demo, `VITE_API_BASE_URL` must point to a reachable iSpeak backend. If the backend stays on your computer, it must be reachable through a protected tunnel while the demo runs. Do not expose Ollama's port directly to the internet; the backend calls Ollama locally.

The browser app never receives the Twinly API key. The backend reads it from the ignored `.env` file in the repository root. Set `VITE_API_BASE_URL` only when the backend is running at a different address.

## Caregiver setup and face sign-in

1. Choose **Caregiver sign in** under the face login, and sign in or create the caregiver account. Pick an option on the Eye tracking step.
2. Enroll the patient, caregiver, or both (you're prompted when no face is enrolled, and **Caregiver settings → Enroll a face** adds more). Face matching runs in the browser; its face measurements are stored in this browser on this device. Camera images and templates are not sent to the iSpeak backend. Re-enroll on each device/browser that needs face access.
3. **Log out** on Home returns to the face login screen. **Caregiver sign out** is in **Caregiver settings**; it asks for the caregiver password, removes the local face profiles and saved calibrations, and revokes that browser session at the backend.

Face matching is an accessibility convenience for this hackathon demo, not strong identity verification. The local face template and session are accessible to someone with control of the browser/device, and face matching can be fooled or reject a real user. Keep the caregiver password sign-in available. Do not use this demo to protect sensitive or medical records.

## Medical emergency demo

**Get help → Medical emergency (simulation)** reads the request aloud, requires an explicit confirmation, and displays a simulated outcome. This prototype does not call 911, contact authorities, send a text, or activate any emergency service. The screens describe a possible future workflow only.

**Health → appointments → new appointment** asks for the appointment type, urgency, and preferred time with tiles (plus optional typed details). **Health → medications → request refill** asks for refill details. Both first ask Twinly to prepare a request and stop before the final submission. iSpeak then displays the returned summary and requires a separate three-second gaze confirmation before it asks Twinly to submit the staged request. The computer running Twinly must be available; Twinly may also pause for its own desktop approval. Do not include credentials, payment information, or sensitive identifiers in request details. Calls and texts are separate actions and require on-screen review and confirmation. Twinly personal-voice speech requires a voice configured in the Twinly app. Calibration presents a face-positioning preview and 17 gaze points; the camera is required for gaze selection but not for touch-only use.


**My calendar** stores events in the app, separately from Twinly’s connected calendar. Events can be shared with a saved caregiver contact through Messages; the recipient and text are reviewed before sending. Twinly calendar remains read-only.
