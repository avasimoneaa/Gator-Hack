# Backend

Server code that sits between the ReVoice app and Twinly. It:

- keeps the Twinly API key secret (read from `.env`, never sent to the browser),
- starts Twinly jobs when the user picks a task,
- receives Twinly's `job.finished` webhook and passes the result back to the app,
- saves each user's settings, contacts, and quick phrases.

Coming next, once the Twinly job request format is confirmed from their docs.
