import midi from './canonMidi.json'
import type { PianoNote } from '../types'

type RawNote = [number, number, number, number, number, number, 'l' | 'r']

export const canonNotes: PianoNote[] = (midi.notes as RawNote[]).map(([note, start, duration, time, length, velocity, hand]) => ({
  note,
  start,
  duration,
  time,
  length,
  velocity,
  hand: hand === 'l' ? 'left' : 'right',
}))

export const canonDurationBeats = midi.durationBeats
