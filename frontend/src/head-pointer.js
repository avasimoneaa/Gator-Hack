// Head pointer: a second way to move the pointer, by turning or tilting the head.
// It reads face landmarks from the eye tracker's face detector, so it needs no
// gaze calibration, only a short "hold still" step that records the neutral pose.

// MediaPipe face-mesh landmark indices.
const NOSE_TIP = 1
const LEFT_CHEEK = 234
const RIGHT_CHEEK = 454
const FOREHEAD = 10
const CHIN = 152

// How far the nose must move (as a share of face width / height) to reach the
// screen edge. Smaller ranges mean a faster pointer.
export const HEAD_RANGES = {
  slow: { x: 0.16, y: 0.1 },
  normal: { x: 0.11, y: 0.07 },
  fast: { x: 0.07, y: 0.045 },
}

// Where the nose sits inside the face outline. Turning moves it sideways and
// nodding moves it up or down, while moving the whole head barely changes it.
export function headOffset(detection) {
  const points = detection?.allLandmarks
  if (!points || points.length <= RIGHT_CHEEK) return null
  const nose = points[NOSE_TIP]
  const left = points[LEFT_CHEEK]
  const right = points[RIGHT_CHEEK]
  const top = points[FOREHEAD]
  const chin = points[CHIN]
  const width = Math.abs(right.x - left.x)
  const height = Math.abs(chin.y - top.y)
  if (width < 0.02 || height < 0.02) return null
  return { x: (nose.x - (left.x + right.x) / 2) / width, y: (nose.y - (top.y + chin.y) / 2) / height }
}

export function averageOffset(offsets) {
  if (!offsets.length) return null
  return {
    x: offsets.reduce((sum, offset) => sum + offset.x, 0) / offsets.length,
    y: offsets.reduce((sum, offset) => sum + offset.y, 0) / offsets.length,
  }
}

// The camera image is not mirrored, so turning toward the user's left moves the
// nose right in the image; the pointer should move left on screen.
export function headPointerPosition(offset, neutral, speed, width, height) {
  const range = HEAD_RANGES[speed] || HEAD_RANGES.normal
  const x = width / 2 - ((offset.x - neutral.x) / range.x) * (width / 2)
  const y = height / 2 + ((offset.y - neutral.y) / range.y) * (height / 2)
  return { x: Math.min(width - 1, Math.max(0, x)), y: Math.min(height - 1, Math.max(0, y)) }
}
