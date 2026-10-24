import * as HumanModule from '@vladmandic/human'

// Recognition runs in the browser. Only the mathematical face template is
// stored locally; camera frames and templates are never sent to the backend.
const human = new HumanModule.Human({
  modelBasePath: '/models/',
  face: {
    enabled: true,
    detector: { rotation: true, maxDetected: 2, minConfidence: 0.6 },
    description: { enabled: true },
    antispoof: { enabled: true },
    liveness: { enabled: true },
    iris: { enabled: false },
    emotion: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
})

let readyPromise

export async function prepareFaceRecognition() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await human.load()
      await human.warmup()
    })()
  }
  return readyPromise
}

export async function captureFaceTemplate(video, count, onProgress) {
  await prepareFaceRecognition()
  const samples = []
  let attempts = 0
  while (samples.length < count && attempts < count * 12) {
    attempts += 1
    if (video.readyState < 2) {
      await new Promise(resolve => window.setTimeout(resolve, 200))
      continue
    }
    const result = await human.detect(video)
    const faces = result.face || []
    const face = faces[0]
    const liveEnough = face && Number(face.real) >= 0.55 && Number(face.live) >= 0.55
    if (faces.length === 1 && face.embedding?.length && liveEnough) {
      samples.push(Array.from(face.embedding))
      onProgress?.(samples.length, count, 'Face sample ' + samples.length + ' of ' + count + ' captured.')
      await new Promise(resolve => window.setTimeout(resolve, 700))
    } else {
      onProgress?.(samples.length, count, faces.length > 1
        ? 'More than one face is visible. Please have only the person enrolling in the frame.'
        : face
          ? 'The camera could not confirm a live face. Adjust the lighting or use caregiver password sign-in.'
          : 'Center one face in the camera and keep it well lit.')
      await new Promise(resolve => window.setTimeout(resolve, 250))
    }
  }
  if (samples.length !== count) {
    throw new Error('Could not capture enough clear face samples. Adjust the camera and try again.')
  }
  return samples
}

export async function matchFaceTemplates(video, templates, onProgress) {
  const samples = await captureFaceTemplate(video, 3, onProgress)
  let successfulSamples = 0
  for (const sample of samples) {
    const best = Math.max(...templates.map(template => human.match.similarity(sample, template)))
    if (best >= 0.55) successfulSamples += 1
  }
  return successfulSamples >= 2
}
