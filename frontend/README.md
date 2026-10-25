# ReVoice frontend

The authenticated app uses the supplied UI's blue full-screen, six-tile pages and Pause eyes / Back / Home / Get help rail. The first Home page keeps the caregiver-selected tiles and adds **Routines** and **More features**; the paged feature menu exposes messages, intent-based errands, appointment history, general Twinly tasks, health, calls, phrases, the eye-gaze keyboard, conversation replies, email, fatigue support, settings, calibration, help alerts, and sign out. Routines and health group related tasks so the Home screen remains scannable.

The guided appointment flow uses large gaze-selectable tiles for appointment type, urgency, time of day, and transportation. Twinly stages an available appointment and stops before booking. ReVoice displays the exact staged result and requires a separate three-second gaze confirmation before the backend allows one submission. **Calendar & appointments** opens the signed-in profile's real appointment request history; the reference folder's calendar events and inbox content are static demo data, so this app does not present those examples as real records. General Twinly task capture shows a live transcript and listens until the user says “stop” or selects **Stop and send**.

## Run

Start the backend from the repository root in Terminal 1:

```sh
cd ~/Projects/Gator-Hack
python3 -m venv .venv  # skip if it already exists
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
python3 app.py
```

Start Vite in Terminal 2:

```sh
cd ~/Projects/Gator-Hack/frontend
npm install
npm run dev
```

Open the Vite URL in Chrome. Sign in, turn on gaze tracking, and complete the 17-point calibration. Choose **new appointments** and select the four appointment options. Twinly searches and stages the request; it does not book it yet. Confirm the exact proposed provider, date, time, location, and any fare with the separate **confirm** control. Choose **manage appointments** to see requests saved to the signed-in profile; active requests refresh automatically. If Twinly cannot verify a booking result, check Twinly history and the provider account before closing the warning or starting another request. Twinly’s own account permissions and approvals still apply.
