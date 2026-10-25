# ReVoice

ReVoice is a gaze-controlled appointment booking flow powered by Twinly. It ports the supplied design's blue full-screen tile UI, status header, four-button side rail, and appointment labels into the existing app. After sign-in and 17-point calibration, users can start a new appointment request or manage requests saved to their profile. The user selects an appointment type, urgency, preferred time, and transportation need. Twinly searches the connected provider account and stages an available appointment without booking it. ReVoice shows the exact provider, date, time, and location; a separate, deliberate confirmation is required before Twinly submits the booking. The backend validates selections, scopes each request to the signed-in profile, prevents duplicate submissions, and labels unclear outcomes for manual checking instead of claiming success.

## Run locally

1. Create the repository root `.env` from `.env.example` and set `TWINLY_API_KEY` and `SECRET_KEY`.
2. Start the backend in Terminal 1:

   ```sh
   cd ~/Projects/Gator-Hack
   python3 -m venv .venv  # skip if it already exists
   source .venv/bin/activate
   python -m pip install -r backend/requirements.txt
   cd backend
   python3 app.py
   ```

3. Start the frontend in Terminal 2:

   ```sh
   cd ~/Projects/Gator-Hack/frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL in Chrome, sign in, start gaze tracking, and complete the 17-point calibration.

## Demo

Choose **new appointments** and make the four gaze selections. Twinly needs to be running on the connected Mac and have access to the provider account. The first job only searches and stages an appointment. Review the exact result, then hold gaze on **confirm** for three seconds to submit it. Twinly may pause for approval under its own settings. Use a live account only when you intend to make a real booking.
