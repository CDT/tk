import { canonDurationBeats, canonNotes } from './canonMidi'
import type { PianoCard } from '../types'

const phraseLength = 8
const phraseCount = Math.ceil(canonDurationBeats / phraseLength)

function slice(startBeat: number, endBeat: number) {
  const sourceStart = canonNotes.find((note) => note.start >= startBeat)?.time ?? 0
  return canonNotes
    .filter((note) => note.start < endBeat && note.start + note.duration > startBeat)
    .map((note) => ({
      ...note,
      start: Math.max(0, note.start - startBeat),
      duration: Math.min(note.start + note.duration, endBeat) - Math.max(note.start, startBeat),
      time: Math.max(0, (note.time ?? 0) - sourceStart),
    }))
}

const analysis: PianoCard[] = [
  {
    id: 'canon-analysis-form',
    title: 'Canon in D · Form',
    group: 'Musical analysis',
    description: 'Johann Pachelbel’s Canon in D, in this BreezePiano arrangement, grows by variation over a repeating harmonic ground. The bass pattern remains the structural anchor while the upper voices become progressively more active, reach a climax, and relax into the final cadence.',
  },
  {
    id: 'canon-analysis-harmony',
    title: 'Canon in D · Harmonic ground',
    group: 'Musical analysis',
    description: 'In this BreezePiano arrangement of Pachelbel’s Canon in D, the recurring progression is D–A–Bm–F♯m–G–D–G–A. In D major its functions are I–V–vi–iii–IV–I–IV–V. Reciting this cycle gives every phrase a dependable memory map.',
  },
  {
    id: 'canon-analysis-texture',
    title: 'Canon in D · Texture and motion',
    group: 'Musical analysis',
    description: 'In this arrangement of Canon in D, the opening is spacious. Later phrases shorten note values and pass sequential figures through changing registers. Hear each fast passage as a small pattern moving through the same harmonic cycle rather than as a long string of unrelated notes.',
  },
  {
    id: 'canon-analysis-phrasing',
    title: 'Canon in D · Phrasing',
    group: 'Musical analysis',
    description: 'This BreezePiano version of Canon in D is divided here into short two-measure parts. Each part should have one direction and one arrival. Join neighboring parts only after both can begin independently from memory.',
  },
  {
    id: 'canon-analysis-memory',
    title: 'Canon in D · Memory landmarks',
    group: 'Musical analysis',
    description: 'Remember this Canon in D arrangement as opening, first answer, expanding sequences, running-note middle, high-register climax, descent, and final resolution. Practice starting at each landmark so memory does not depend on always beginning at the first bar.',
  },
]

const landmarks = [
  'Opening statement', 'Bass pattern settles', 'First melodic answer', 'Sequence begins',
  'Texture expands', 'Ascending motion', 'First arrival', 'New variation',
  'Running notes begin', 'Imitation', 'Register opens', 'Midpoint cadence',
  'Second-half return', 'Denser variation', 'Climbing sequence', 'High-register arrival',
  'Release and answer', 'New rhythmic figure', 'Final build begins', 'Broad melodic peak',
  'Descent', 'Return toward tonic', 'Closing variation', 'Final cadence preparation',
  'Coda', 'Last resolution', 'Release',
]

const sheetParts: PianoCard[] = Array.from({ length: phraseCount }, (_, index) => {
  const startBeat = index * phraseLength
  const endBeat = Math.min(canonDurationBeats, startBeat + phraseLength)
  return {
    id: `canon-sheet-part-${String(index + 1).padStart(2, '0')}`,
    title: `Part ${index + 1}: ${landmarks[index] ?? 'Continuation'}`,
    group: 'Sheet part',
    description: `Practice this two-measure phrase by itself. Hear where it begins in the repeating D-major progression, shape it toward its final note, then connect it to Part ${Math.min(index + 2, phraseCount)}.`,
    sequence: slice(startBeat, endBeat),
    part: index + 1,
  }
})

export const piano: PianoCard[] = [...analysis, ...sheetParts]
