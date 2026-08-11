import { useEffect, useRef } from 'react'

const sharpNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
const flatNames = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function vexKey(midi: number, preferFlats: boolean) {
  const pitchClass = midi % 12
  const octave = Math.floor(midi / 12) - 1
  return `${(preferFlats ? flatNames : sharpNames)[pitchClass]}/${octave}`
}

export function PianoScore({ sequence, preferFlats, title }: { sequence: number[][]; preferFlats: boolean; title: string }) {
  const scoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = scoreRef.current
    if (!target) return
    let cancelled = false

    void import('vexflow').then(({ Accidental, Formatter, Renderer, Stave, StaveNote, Voice }) => {
      if (cancelled) return
      target.replaceChildren()

      const width = Math.max(420, 85 + sequence.length * 42)
      const renderer = new Renderer(target, Renderer.Backends.SVG)
      renderer.resize(width, 150)
      const context = renderer.getContext()
      const stave = new Stave(12, 20, width - 24).addClef('treble')
      stave.setContext(context).draw()

      const notes = sequence.map((chord) => {
        const keys = chord.map((midi) => vexKey(midi, preferFlats))
        const note = new StaveNote({ keys, duration: 'q' })
        keys.forEach((key, index) => {
          const accidental = key.match(/[a-g](#|b)/)?.[1]
          if (accidental) note.addModifier(new Accidental(accidental), index)
        })
        return note
      })
      const voice = new Voice({ numBeats: sequence.length, beatValue: 4 }).addTickables(notes)
      new Formatter().joinVoices([voice]).format([voice], width - 100)
      voice.draw(context, stave)

      const svg = target.querySelector('svg')
      svg?.setAttribute('viewBox', `0 0 ${width} 150`)
      svg?.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    })

    return () => {
      cancelled = true
    }
  }, [preferFlats, sequence])

  return <div ref={scoreRef} className="piano-score" role="img" aria-label={`Sheet music for ${title}`} />
}
