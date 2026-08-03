# TK

TK is a quiet, distraction-free web app for advanced English and Japanese
recall practice. Chinese prompts are translated into precise, natural English
and Japanese rather than treated as literary excerpts.

The app opens directly into a study session, requires no account, and stores
all content in local JSON.

## Current collections

**Business Core 01** contains 100 long-form sentences covering frequently used
workplace situations:

- Meetings and written communication
- Projects and negotiation
- Sales and finance
- Operations and people management
- Strategy, international work, and compliance

Each Chinese prompt has an English answer targeting IELTS Band 9-level range
and precision, plus a natural Japanese answer targeting JLPT N1-level grammar
and business vocabulary. These labels describe the learning target; the
sentences are original study material, not official IELTS or JLPT questions.

**Chinese Classics 01** contains 100 compact recall passages drawn from
classical poetry, Song ci, and foundational prose. Each card uses a short
couplet or stanza so the complete exercise fits comfortably in one viewport.

## Features

- **Translation recall:** reconstruct the full English or Japanese sentence
  from a Chinese prompt; the entire answer remains blurred until reveal.
- **Selectable collections:** translation and excerpt libraries have separate
  selectors and progress.
- **100-card contract:** every finished translation or excerpt collection must
  contain exactly 100 cards.
- **Lightweight progress:** mark a card as remembered or needing review;
  progress is saved in the browser.
- **Keyboard controls:** press <kbd>Space</kbd> to reveal and use the arrow keys
  to move between cards.
- **Offline-ready PWA:** includes SVG, PNG, and multi-size ICO app icons.
- **No-scroll study surface:** the active card and controls fit within one
  desktop or mobile viewport.

## Run locally

Requirements: Node.js 20.19 or later and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL after startup. The app is served under `/tk/` to
match its GitHub Pages path.

## Available commands

```bash
npm run dev      # Start the development server
npm run build    # Type-check and build for production
npm run preview  # Preview the production build
npm run lint     # Run the TypeScript checks
npm test         # Validate collection data and study flows
```

## Content format

Business translations live in
[`src/data/collections.json`](src/data/collections.json), while classical
excerpts live in
[`src/data/chinese-classics-01.json`](src/data/chinese-classics-01.json).
A translation collection carries its own metadata and exactly 100 cards:

```json
{
  "id": "business-core-01",
  "title": "Business Core 01",
  "subtitle": "100 high-frequency long sentences",
  "description": "Advanced workplace communication.",
  "levels": ["IELTS Band 9 target", "JLPT N1 target"],
  "cards": []
}
```

Each translation is stored as a complete answer. Hint metadata remains in the
dataset for possible future practice modes, but the current interface masks the
entire answer before reveal:

```json
{
  "id": "bc01-001",
  "source": "在会议开始之前，我们需要明确今天的首要目标。",
  "note": "Meetings · Setting priorities",
  "translations": {
    "en": {
      "text": "Before the meeting begins, we need to clarify today's primary objective.",
      "hints": ["primary objective"]
    },
    "ja": {
      "text": "会議を始める前に、本日の最優先事項を明確にする必要があります。",
      "hints": ["最優先事項"]
    }
  }
}
```

Every collection and card `id` must be unique. The automated tests enforce both
100-card contracts, unique IDs, valid translation metadata, and excerpt
keywords that occur in the revealed passage.

## Deployment

Pushes to `main` run the included GitHub Actions workflow and publish `dist/`
to GitHub Pages. In the repository settings, set **Pages → Source** to
**GitHub Actions**.

The configured public URL is [cdt.github.io/tk](https://cdt.github.io/tk/).

## Tech stack

React, TypeScript, Tailwind CSS, Vite, Vitest, and `vite-plugin-pwa`.
