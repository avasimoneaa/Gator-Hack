// Browser speech engines can lose a new utterance immediately after cancel(),
// and some stop long utterances without firing onend. Replace speech reliably,
// wait briefly for voices to load, and speak long text in bounded chunks.
export function createSpeechController(getRate) {
  let generation = 0
  let chunks = []
  let active = null
  let paused = false
  let startTimer = 0
  let watchdog = 0
  let voiceWaitTimer = 0
  let voiceChangeHandler = null
  let voiceWaitGeneration = 0

  function engine() { return typeof window !== 'undefined' ? window.speechSynthesis : null }

  function clearTimers() {
    window.clearTimeout(startTimer); window.clearTimeout(watchdog); window.clearTimeout(voiceWaitTimer)
    startTimer = watchdog = voiceWaitTimer = 0
    if (voiceChangeHandler) { engine()?.removeEventListener?.('voiceschanged', voiceChangeHandler); voiceChangeHandler = null }
  }

  function splitText(value, limit = 220) {
    const result = []
    let remaining = String(value || '').replace(/\s+/g, ' ').trim()
    while (remaining.length > limit) {
      let cut = Math.max(remaining.lastIndexOf('. ', limit), remaining.lastIndexOf('? ', limit), remaining.lastIndexOf('! ', limit), remaining.lastIndexOf('; ', limit))
      if (cut < limit * 0.55) cut = remaining.lastIndexOf(' ', limit)
      if (cut < 1) cut = limit
      result.push(remaining.slice(0, cut + 1).trim())
      remaining = remaining.slice(cut + 1).trim()
    }
    if (remaining) result.push(remaining)
    return result
  }

  function scheduleNext(id, delay = 110) {
    if (id !== generation || paused || !chunks.length || active) return
    window.clearTimeout(startTimer)
    startTimer = window.setTimeout(() => { startTimer = 0; startChunk(id) }, delay)
  }

  function failChunk(id, utterance, error) {
    if (id !== generation || active !== utterance) return
    window.clearTimeout(watchdog); watchdog = 0; active = null
    console.warn('Text-to-speech chunk failed; continuing with the next announcement segment:', error || 'unknown speech error')
    if (chunks.length) chunks.shift()
    engine()?.cancel()
    scheduleNext(id, 220)
  }

  function finishChunk(id, utterance) {
    if (id !== generation || active !== utterance) return
    window.clearTimeout(watchdog); watchdog = 0; active = null; chunks.shift(); scheduleNext(id, 90)
  }

  function startChunk(id) {
    if (id !== generation || paused || active || !chunks.length) return
    const synth = engine()
    const Utterance = window.SpeechSynthesisUtterance
    if (!synth || !Utterance) return
    if (!synth.getVoices().length && synth.addEventListener && voiceWaitGeneration !== id) {
      voiceWaitGeneration = id
      let settled = false
      const ready = () => {
        if (settled) return
        settled = true; window.clearTimeout(voiceWaitTimer); voiceWaitTimer = 0
        if (voiceChangeHandler) synth.removeEventListener('voiceschanged', voiceChangeHandler)
        voiceChangeHandler = null; scheduleNext(id, 100)
      }
      voiceChangeHandler = ready; synth.addEventListener('voiceschanged', ready, { once: true })
      voiceWaitTimer = window.setTimeout(ready, 650)
      return
    }
    const utterance = new Utterance(chunks[0])
    const rate = Number(getRate?.())
    utterance.rate = Number.isFinite(rate) ? Math.max(0.5, Math.min(2, rate)) : 1
    active = utterance
    utterance.onend = () => finishChunk(id, utterance)
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') { finishChunk(id, utterance); return }
      failChunk(id, utterance, event.error)
    }
    try {
      synth.speak(utterance)
      watchdog = window.setTimeout(() => {
        if (id !== generation || active !== utterance) return
        active = null; chunks.shift(); synth.cancel(); scheduleNext(id, 140)
      }, Math.max(30000, chunks[0].length * 180 + 8000))
    } catch (error) { failChunk(id, utterance, error?.message || error) }
  }

  function speak(text) {
    const synth = engine()
    if (!synth || !window.SpeechSynthesisUtterance) return
    const next = splitText(text)
    if (!next.length) return
    const id = ++generation
    clearTimers(); chunks = next; active = null
    synth.cancel()
    if (!paused) scheduleNext(id, 140)
  }

  function pause() { paused = true; engine()?.pause() }
  function resume() {
    paused = false
    const synth = engine()
    if (synth?.paused) synth.resume()
    if (!active && chunks.length) scheduleNext(generation, 100)
  }
  function cancel() {
    generation += 1; clearTimers(); chunks = []; active = null; paused = false; engine()?.cancel()
  }
  return { speak, pause, resume, cancel, isPaused: () => paused }
}
