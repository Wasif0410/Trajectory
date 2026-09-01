/**
 * Synthesised audio. No files, no fetches, no licensing.
 *
 * Effects are short and dry so they read as hardware rather than notification
 * chimes. The ambient bed is generative: a slow chord cycle with occasional
 * sparse bell notes, so it never loops audibly.
 *
 * Browsers refuse to start audio without a user gesture, so the context is
 * created lazily on the first call and resumed on every subsequent one.
 */

let ctx: AudioContext | null = null
let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

let sfxOn = true
let musicTimers: ReturnType<typeof setInterval>[] = []

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null

    ctx = new Ctor()

    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.5
    sfxBus.connect(ctx.destination)

    musicBus = ctx.createGain()
    musicBus.gain.value = 0
    musicBus.connect(ctx.destination)
  }

  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** One second of white noise, reused for every transient. */
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

export function setSfxEnabled(on: boolean) {
  sfxOn = on
}

// --- music preference -------------------------------------------
// Backed by localStorage and exposed as an external store, so the toggle can
// read it without a setState-in-effect and without a hydration mismatch.

const MUSIC_KEY = 'trajectory:music'
const prefListeners = new Set<() => void>()

export function subscribeMusicPref(onChange: () => void) {
  prefListeners.add(onChange)
  return () => prefListeners.delete(onChange)
}

/** On by default. Only an explicit opt-out is remembered. */
export function getMusicPref(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(MUSIC_KEY) !== 'off'
  } catch {
    return true
  }
}

export function getMusicPrefServer(): boolean {
  return true
}

export function setMusicPref(on: boolean) {
  try {
    window.localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off')
  } catch {
    // Private mode or storage disabled; the session still honours the toggle.
  }
  prefListeners.forEach((fn) => fn())
}

// --- effects ----------------------------------------------------

/** A dry mechanical tick. Filtered noise, gone in 40ms. */
export function playClick() {
  if (!sfxOn) return
  const c = audio()
  if (!c || !sfxBus) return

  const src = c.createBufferSource()
  src.buffer = noise(c)

  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 2100
  band.Q.value = 1.4

  const env = c.createGain()
  const t = c.currentTime
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.22, t + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)

  src.connect(band).connect(env).connect(sfxBus)
  src.start(t)
  src.stop(t + 0.06)
}

/** Two soft tones rising. Used when a window appears. */
export function playOpen() {
  if (!sfxOn) return
  const c = audio()
  if (!c || !sfxBus) return

  const t = c.currentTime
  ;[
    { f: 523.25, at: 0 },
    { f: 783.99, at: 0.055 },
  ].forEach(({ f, at }) => {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f

    const env = c.createGain()
    env.gain.setValueAtTime(0.0001, t + at)
    env.gain.exponentialRampToValueAtTime(0.11, t + at + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.19)

    osc.connect(env).connect(sfxBus!)
    osc.start(t + at)
    osc.stop(t + at + 0.22)
  })
}

/** The same shape, falling. */
export function playClose() {
  if (!sfxOn) return
  const c = audio()
  if (!c || !sfxBus) return

  const t = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(560, t)
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.13)

  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.1, t + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)

  osc.connect(env).connect(sfxBus)
  osc.start(t)
  osc.stop(t + 0.18)
}

// --- ambient bed ------------------------------------------------

/** Am9 → Fmaj7 → Cmaj7 → G6. Slow, unhurried, no resolution. */
const CHORDS = [
  [110.0, 164.81, 261.63, 329.63],
  [87.31, 174.61, 261.63, 329.63],
  [130.81, 196.0, 246.94, 329.63],
  [98.0, 246.94, 293.66, 392.0],
]

/** Pentatonic, so any note lands consonant against any chord above. */
const BELLS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

const CHORD_MS = 7000
let chordIndex = 0

function playPad(c: AudioContext, freqs: number[]) {
  if (!musicBus) return
  const t = c.currentTime
  const dur = (CHORD_MS / 1000) * 1.25

  freqs.forEach((f, i) => {
    const osc = c.createOscillator()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = f
    osc.detune.value = (i - 1.5) * 4

    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(500, t)
    lp.frequency.linearRampToValueAtTime(1150, t + dur * 0.5)
    lp.frequency.linearRampToValueAtTime(500, t + dur)

    const env = c.createGain()
    const peak = i === 0 ? 0.16 : 0.075
    env.gain.setValueAtTime(0.0001, t)
    env.gain.linearRampToValueAtTime(peak, t + dur * 0.35)
    env.gain.linearRampToValueAtTime(0.0001, t + dur)

    osc.connect(lp).connect(env).connect(musicBus!)
    osc.start(t)
    osc.stop(t + dur + 0.1)
  })
}

function playBell(c: AudioContext) {
  if (!musicBus) return
  const t = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = BELLS[Math.floor(Math.random() * BELLS.length)]

  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.05, t + 0.02)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)

  osc.connect(env).connect(musicBus)
  osc.start(t)
  osc.stop(t + 2.5)
}

let armed = false

/**
 * Autoplay policy blocks audio until the page has been interacted with, so if
 * the context is still suspended we wait for the first gesture and try again.
 */
function armOnFirstGesture() {
  if (armed || typeof window === 'undefined') return
  armed = true

  const kick = () => {
    window.removeEventListener('pointerdown', kick)
    window.removeEventListener('keydown', kick)
    armed = false
    startMusic()
  }

  window.addEventListener('pointerdown', kick)
  window.addEventListener('keydown', kick)
}

export function startMusic() {
  const c = audio()
  if (!c || !musicBus || musicTimers.length) return

  if (c.state !== 'running') {
    armOnFirstGesture()
    return
  }

  musicBus.gain.cancelScheduledValues(c.currentTime)
  musicBus.gain.setValueAtTime(musicBus.gain.value, c.currentTime)
  musicBus.gain.linearRampToValueAtTime(0.5, c.currentTime + 2.5)

  playPad(c, CHORDS[chordIndex % CHORDS.length])
  chordIndex += 1

  musicTimers.push(
    setInterval(() => {
      const live = audio()
      if (!live) return
      playPad(live, CHORDS[chordIndex % CHORDS.length])
      chordIndex += 1
    }, CHORD_MS)
  )

  // Sparse, so it reads as composed rather than as a loop.
  musicTimers.push(
    setInterval(() => {
      const live = audio()
      if (live && Math.random() < 0.45) playBell(live)
    }, 3400)
  )
}

export function stopMusic() {
  musicTimers.forEach(clearInterval)
  musicTimers = []

  if (ctx && musicBus) {
    const t = ctx.currentTime
    musicBus.gain.cancelScheduledValues(t)
    musicBus.gain.setValueAtTime(musicBus.gain.value, t)
    musicBus.gain.linearRampToValueAtTime(0, t + 1.2)
  }
}

// --- arcade -----------------------------------------------------

/** A bright blip when the snake eats. Short enough to fire every tick. */
export function playEat() {
  if (!sfxOn) return
  const c = audio()
  if (!c || !sfxBus) return

  const t = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(660, t)
  osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06)

  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.07, t + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)

  osc.connect(env).connect(sfxBus)
  osc.start(t)
  osc.stop(t + 0.1)
}

/** Three falling tones. The only sound here longer than a tenth of a second. */
export function playGameOver() {
  if (!sfxOn) return
  const c = audio()
  if (!c || !sfxBus) return

  const t = c.currentTime
  ;[
    { f: 392.0, at: 0 },
    { f: 311.13, at: 0.11 },
    { f: 196.0, at: 0.22 },
  ].forEach(({ f, at }) => {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f

    const env = c.createGain()
    env.gain.setValueAtTime(0.0001, t + at)
    env.gain.exponentialRampToValueAtTime(0.12, t + at + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.3)

    osc.connect(env).connect(sfxBus!)
    osc.start(t + at)
    osc.stop(t + at + 0.34)
  })
}
