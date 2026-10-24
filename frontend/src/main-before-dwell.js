import './style.css'
const webgazer = window.webgazer

document.querySelector('#app').innerHTML = `
  <main>
    <h1>Accessible Task Control</h1>
    <p>Start gaze tracking, then look around the screen.</p>

    <button id="start-camera">Start gaze tracking</button>
    <p id="status" role="status" aria-live="polite">Camera is off.</p>
    <p id="gaze" role="status" aria-live="polite">Gaze position: waiting.</p>

    <section class="controls" aria-label="Task controls">
      <button data-command="Read">Read</button>
      <button data-command="Pause">Pause</button>
      <button data-command="Confirm">Confirm</button>
    </section>

    <p id="feedback" role="status" aria-live="polite">
      No command selected yet.
    </p>
  </main>
`

const status = document.querySelector('#status')
const gaze = document.querySelector('#gaze')
const feedback = document.querySelector('#feedback')
const startButton = document.querySelector('#start-camera')

startButton.addEventListener('click', async () => {
  startButton.disabled = true
  status.textContent = 'Starting camera and gaze tracking…'

  try {
    webgazer.showVideo(true)
    webgazer.showFaceOverlay(true)
    webgazer.showFaceFeedbackBox(true)
    webgazer.showPredictionPoints(true)
    webgazer.saveDataAcrossSessions(true)

    webgazer.setGazeListener((data) => {
      if (!data) return
      gaze.textContent =
        `Gaze position: x ${Math.round(data.x)}, y ${Math.round(data.y)}`
    })

    await webgazer.begin()
    status.textContent = 'Gaze tracking is on.'
  } catch (error) {
    console.error(error)
    status.textContent = `Could not start gaze tracking: ${error.message}`
    startButton.disabled = false
  }
})

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    feedback.textContent = `${button.dataset.command} selected.`
  })
})