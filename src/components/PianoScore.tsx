import { useEffect, useRef } from 'react'
import type { PianoNote } from '../types'

const sharpNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
const flatNames = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']
const GRID = 0.25

function vexKey(midi: number, preferFlats: boolean) {
  return `${(preferFlats ? flatNames : sharpNames)[midi % 12]}/${Math.floor(midi / 12) - 1}`
}

function quantize(beats: number) {
  return Math.round(beats / GRID) * GRID
}

function durationName(beats: number) {
  if (beats === 4) return 'w'
  if (beats === 2) return 'h'
  if (beats === 1) return 'q'
  if (beats === 0.5) return '8'
  return '16'
}

function splitDuration(beats: number) {
  const result: number[] = []
  let remaining = quantize(beats)
  for (const value of [4, 2, 1, 0.5, 0.25]) {
    while (remaining >= value - 0.001) {
      result.push(value)
      remaining = quantize(remaining - value)
    }
  }
  return result
}

export function PianoScore({ sequence, preferFlats, title, hand }: { sequence: PianoNote[]; preferFlats: boolean; title: string; hand: 'both' | 'left' | 'right' }) {
  const scoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = scoreRef.current
    if (!target) return
    let cancelled = false

    void import('vexflow').then(({ Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice }) => {
      if (cancelled) return
      target.replaceChildren()

      const hands = hand === 'both' ? ['right', 'left'] as const : [hand]
      const measureCount = Math.max(1, Math.ceil(Math.max(0, ...sequence.map((note) => note.start + note.duration)) / 4))
      const measureWidth = 350
      const width = 24 + measureCount * measureWidth
      const height = hands.length === 2 ? 270 : 155
      const renderer = new Renderer(target, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const context = renderer.getContext()

      for (let measure = 0; measure < measureCount; measure += 1) {
        const measureStart = measure * 4
        const x = 12 + measure * measureWidth
        const staves = hands.map((shownHand, index) => {
          const stave = new Stave(x, 18 + index * 115, measureWidth)
          if (measure === 0) stave.addClef(shownHand === 'right' ? 'treble' : 'bass').addTimeSignature('4/4')
          stave.setContext(context).draw()
          return stave
        })

        if (staves.length === 2) {
          new StaveConnector(staves[0], staves[1]).setType(measure === 0 ? StaveConnector.type.BRACE : StaveConnector.type.SINGLE_LEFT).setContext(context).draw()
          new StaveConnector(staves[0], staves[1]).setType(StaveConnector.type.SINGLE_RIGHT).setContext(context).draw()
        }

        hands.forEach((shownHand, staveIndex) => {
          const byStart = new Map<number, PianoNote[]>()
          sequence
            .filter((event) => event.hand === shownHand && event.start >= measureStart - 0.001 && event.start < measureStart + 4 - 0.001)
            .forEach((event) => {
              const localStart = Math.min(3.75, Math.max(0, quantize(event.start - measureStart)))
              byStart.set(localStart, [...(byStart.get(localStart) ?? []), event])
            })

          const starts = [...byStart.keys()].sort((a, b) => a - b)
          const tickables: InstanceType<typeof StaveNote>[] = []
          let cursor = 0

          starts.forEach((start, index) => {
            if (start > cursor) {
              splitDuration(start - cursor).forEach((duration) => tickables.push(new StaveNote({ keys: ['b/4'], duration: `${durationName(duration)}r`, clef: shownHand === 'right' ? 'treble' : 'bass' })))
            }
            const nextStart = starts[index + 1] ?? 4
            const duration = Math.max(GRID, quantize(nextStart - start))
            const events = byStart.get(start) ?? []
            const keys = [...new Set(events.map((event) => vexKey(event.note, preferFlats)))]
            splitDuration(duration).forEach((part, partIndex) => {
              const note = new StaveNote({ keys, duration: durationName(part), clef: shownHand === 'right' ? 'treble' : 'bass' })
              if (partIndex === 0) keys.forEach((key, keyIndex) => {
                const accidental = key.match(/[a-g](#|b)/)?.[1]
                if (accidental) note.addModifier(new Accidental(accidental), keyIndex)
              })
              tickables.push(note)
            })
            cursor = nextStart
          })

          if (cursor < 4) splitDuration(4 - cursor).forEach((duration) => tickables.push(new StaveNote({ keys: ['b/4'], duration: `${durationName(duration)}r`, clef: shownHand === 'right' ? 'treble' : 'bass' })))
          const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(tickables)
          new Formatter().joinVoices([voice]).format([voice], measureWidth - (measure === 0 ? 100 : 40))
          voice.draw(context, staves[staveIndex])
        })
      }

      const svg = target.querySelector('svg')
      svg?.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg?.setAttribute('preserveAspectRatio', 'xMinYMid meet')
    })

    return () => { cancelled = true }
  }, [hand, preferFlats, sequence])

  return <div ref={scoreRef} className="piano-score" role="img" aria-label={`Sheet music for ${title}`} />
}
