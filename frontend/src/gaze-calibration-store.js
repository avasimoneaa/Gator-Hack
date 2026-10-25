import { TrackerState } from '@realeye-io/webcam-eyetracker-light-open'

// The eye tracker has no save/load API. A finished calibration is fully
// described by its ridge-regression coefficients and the mean head pose, so
// those numbers are kept in this browser to skip calibrating next time.
// This reads the library's internal fields (checked against 1.1.0); if they
// ever change, loading fails and the user simply calibrates again.
const PREFIX = 'revoice.gaze-calibration.'

function isNumberList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(Number.isFinite)
}

function isHeadPose(value) {
  return value === null || (value && ['yaw', 'pitch', 'roll'].every(key => Number.isFinite(value[key])))
}

export function calibrationKey(profileId, person) {
  return PREFIX + String(profileId) + '.' + String(person || 'Patient')
}

export function saveCalibration(tracker, key) {
  const { coefficientsX, coefficientsY, calibrationMeanHeadPose } = tracker || {}
  if (!key || !isNumberList(coefficientsX) || !isNumberList(coefficientsY)) return false
  try {
    localStorage.setItem(key, JSON.stringify({
      coefficientsX, coefficientsY,
      calibrationMeanHeadPose: calibrationMeanHeadPose || null,
      width: window.innerWidth, height: window.innerHeight, savedAt: Date.now(),
    }))
    return true
  } catch {
    return false
  }
}

export function loadCalibration(key) {
  if (!key) return null
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (!saved || !isNumberList(saved.coefficientsX) || !isNumberList(saved.coefficientsY) ||
        saved.coefficientsX.length !== saved.coefficientsY.length || !isHeadPose(saved.calibrationMeanHeadPose)) return null
    return saved
  } catch {
    return null
  }
}

export function restoreCalibration(tracker, saved) {
  if (!tracker || !saved || !tracker.isReady?.() || !('coefficientsX' in tracker) || !('calibrationMeanHeadPose' in tracker)) return false
  tracker.coefficientsX = saved.coefficientsX.slice()
  tracker.coefficientsY = saved.coefficientsY.slice()
  tracker.calibrationMeanHeadPose = saved.calibrationMeanHeadPose ? { ...saved.calibrationMeanHeadPose } : null
  tracker.state = TrackerState.Calibrated
  return tracker.isCalibrated()
}

export function removeCalibration(key) {
  try { localStorage.removeItem(key) } catch {}
}

export function clearCalibrations(profileId) {
  try {
    const prefix = PREFIX + String(profileId) + '.'
    Object.keys(localStorage).filter(key => key.startsWith(prefix)).forEach(key => localStorage.removeItem(key))
  } catch {}
}

// Gaze targets are screen pixels, so a different window size lowers accuracy.
export function calibrationWindowChanged(saved) {
  if (!saved?.width || !saved?.height) return false
  return Math.abs(saved.width - window.innerWidth) / saved.width > 0.1 || Math.abs(saved.height - window.innerHeight) / saved.height > 0.1
}
