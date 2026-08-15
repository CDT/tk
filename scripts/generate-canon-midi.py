"""Convert the repository's Canon MIDI into deterministic TypeScript note data."""
from pathlib import Path
from collections import defaultdict
import json

SOURCE = Path(__file__).parents[1] / 'midi' / 'canon-in-d-by-johann-pachelbel-breezepiano.mid'
TARGET = Path(__file__).parents[1] / 'src' / 'data' / 'canonMidi.json'

def vlq(data, index):
    value = 0
    while True:
        byte = data[index]
        index += 1
        value = (value << 7) | (byte & 0x7f)
        if byte < 0x80:
            return value, index

data = SOURCE.read_bytes()
division = int.from_bytes(data[12:14], 'big')
position = 14
notes = []
tempos = []

for track in range(int.from_bytes(data[10:12], 'big')):
    size = int.from_bytes(data[position + 4:position + 8], 'big')
    chunk = data[position + 8:position + 8 + size]
    position += 8 + size
    index = tick = 0
    running = 0
    active = defaultdict(list)
    while index < len(chunk):
        delta, index = vlq(chunk, index)
        tick += delta
        status = chunk[index]
        if status < 0x80:
            status = running
        else:
            index += 1
            running = status
        kind = status & 0xf0
        if status == 0xff:
            meta = chunk[index]
            index += 1
            length, index = vlq(chunk, index)
            payload = chunk[index:index + length]
            index += length
            if meta == 0x51:
                tempos.append((tick / division, int.from_bytes(payload, 'big')))
            continue
        if status in (0xf0, 0xf7):
            length, index = vlq(chunk, index)
            index += length
            continue
        length = 1 if kind in (0xc0, 0xd0) else 2
        values = chunk[index:index + length]
        index += length
        if kind == 0x90 and values[1] > 0:
            active[values[0]].append((tick, values[1]))
        elif kind == 0x80 or (kind == 0x90 and values[1] == 0):
            if active[values[0]]:
                start, velocity = active[values[0]].pop(0)
                notes.append((values[0], start / division, (tick - start) / division, velocity, 'right' if track == 0 else 'left'))

notes.sort(key=lambda item: (item[1], item[4], item[0]))
tempos.sort()

def seconds_at(beat):
    seconds = 0
    previous_beat = 0
    microseconds = tempos[0][1]
    for change_beat, next_microseconds in tempos[1:]:
        if change_beat >= beat:
            break
        seconds += (change_beat - previous_beat) * microseconds / 1_000_000
        previous_beat = change_beat
        microseconds = next_microseconds
    return seconds + (beat - previous_beat) * microseconds / 1_000_000
output_notes = []
for note, start, duration, velocity, hand in notes:
    time = seconds_at(start)
    length = seconds_at(start + duration) - time
    output_notes.append([note, round(start, 4), round(duration, 4), round(time, 4), round(length, 4), velocity, hand[0]])
TARGET.write_text(json.dumps({
    'notes': output_notes,
    'durationBeats': round(max(start + duration for _, start, duration, _, _ in notes), 4),
}, separators=(',', ':')), encoding='utf-8')
