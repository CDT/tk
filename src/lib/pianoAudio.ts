import type { PianoNote } from '../types'

let audioContext: AudioContext | null = null
let piano: ReturnType<(typeof import('smplr'))['SplendidGrandPiano']> | null = null
let stops: Array<() => void> = []
let loopTimer: number | null = null

const PIANO_NOTES = Array.from({ length: 73 }, (_, index) => 26 + index)
const LOAD_TIMEOUT_MS = 20_000

function withTimeout(promise: Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Piano samples timed out.')), LOAD_TIMEOUT_MS)
    promise.then(
      () => { window.clearTimeout(timeout); resolve() },
      (error: unknown) => { window.clearTimeout(timeout); reject(error) },
    )
  })
}

export function stopPianoPlayback() {
  stops.forEach((stop) => stop())
  stops = []
  if (loopTimer !== null) window.clearTimeout(loopTimer)
  loopTimer = null
}

export interface PianoPlaybackOptions {
  hand: 'both' | 'left' | 'right'
  speed: number
  loop: boolean
}

export async function playPianoSequence(sequence: PianoNote[], options: PianoPlaybackOptions = { hand: 'both', speed: 1, loop: false }) {
  stopPianoPlayback()
  audioContext ??= new AudioContext()
  if (!piano) {
    const { SplendidGrandPiano } = await import('smplr')
    piano = SplendidGrandPiano(audioContext, { notesToLoad: { notes: PIANO_NOTES, velocityRange: [35, 90] } })
  }
  await audioContext.resume()
  try {
    await withTimeout(piano.ready)
  } catch (error) {
    piano = null
    throw error
  }

  const filtered = sequence.filter((event) => options.hand === 'both' || event.hand === options.hand)
  if (filtered.length === 0) return
  const firstTime = Math.min(...filtered.map((event) => event.time ?? event.start))
  const schedule = () => {
    if (!audioContext || !piano) return
    const now = audioContext.currentTime + 0.08
    filtered.forEach((event) => {
      const eventTime = ((event.time ?? event.start) - firstTime) / options.speed
      const length = Math.max(0.05, (event.length ?? event.duration) / options.speed)
      stops.push(piano!.start({ note: event.note, velocity: event.velocity, time: now + eventTime, duration: length }))
    })
    if (options.loop) {
      const total = Math.max(...filtered.map((event) => (event.time ?? event.start) - firstTime + (event.length ?? event.duration))) / options.speed
      loopTimer = window.setTimeout(schedule, (total + 0.35) * 1000)
    }
  }
  schedule()
}
