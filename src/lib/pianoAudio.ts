let audioContext: AudioContext | null = null
let piano: ReturnType<(typeof import('smplr'))['SplendidGrandPiano']> | null = null

const PIANO_NOTES = Array.from({ length: 24 }, (_, index) => 53 + index)
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

export async function playPianoSequence(sequence: number[][]) {
  audioContext ??= new AudioContext()
  if (!piano) {
    const { SplendidGrandPiano } = await import('smplr')
    piano = SplendidGrandPiano(audioContext, {
      notesToLoad: {
        notes: PIANO_NOTES,
        velocityRange: [68, 89],
      },
    })
  }
  await audioContext.resume()
  try {
    await withTimeout(piano.ready)
  } catch (error) {
    piano = null
    throw error
  }

  const now = audioContext.currentTime
  const stepLength = sequence.length === 1 ? 1.4 : 0.42
  const duration = sequence.length === 1 ? 1.25 : 0.38
  sequence.forEach((notes, step) => {
    notes.forEach((note) => piano!.start({
      note,
      velocity: 72,
      time: now + step * stepLength,
      duration,
    }))
  })
}
