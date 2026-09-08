# TK

TK is a quiet recall app with one shuffled list of study cards. Every card has
just a title and a content area: tap to reveal, tap again to hide.

Translations, classical excerpts, and vocabulary share the same interface and
editor. English and Japanese translations appear together in a single reveal;
excerpt authorship appears with the passage. Piano practice has been removed.

## Study controls

- Tap the answer area or press Space to reveal content.
- Swipe horizontally or use arrow buttons/keys to move between cards.
- Pull down to shuffle while keeping the current card selected.
- Favorite or ignore entries; preferences stay in this browser.
- Open Manage entries to unlock the editor. New and existing entries require
  only Title and Content.

## Unified data

Production loads `id`, `title`, and `content` from Supabase. All study content,
including the 215 bundled fixtures in `src/data/cards.json`, uses this one
shape. There are no category or language-specific database columns.

The table also keeps a globally unique `position` and creation/update timestamps.
New IDs are UUIDs; existing IDs stay unchanged so favorites and links survive.
PostgreSQL assigns sequence positions atomically, including concurrent creates.

## Upgrade an existing installation

1. Back up `study_cards` before the release and pause editor writes.
2. Run `supabase/migrations/202609080001_unify_study_cards.sql`. It combines
   English and Japanese with a blank line, moves excerpt authorship into content,
   removes piano rows (if present), and drops the obsolete category fields.
   Incomplete cards abort the transaction instead of losing source data.
3. Deploy `supabase/functions/manage-study-cards` to the same Supabase project.
4. Publish this frontend to GitHub Pages. Coordinate these steps: the previous
   frontend and Edge Function require columns that the migration removes.
5. Verify reading, adding, editing, and deleting a temporary entry, then reopen
   editor access. Existing favorites and card URLs use their original IDs.

The migration can be rerun without duplicating content. Database policies and
existing timestamps stay intact. Rollback requires restoring the table backup
and the previous Edge Function/frontend together; the old columns are removed.

Fresh installations use `supabase/schema.sql` instead of the migration. Load
`src/data/cards.json` if starter cards are wanted. Both backend secrets and
frontend environment variables remain configured as before.

## Development

Use Node.js 20.19 or newer:

```bash
npm ci
npm run dev
```

The app uses `/tk/` as its base path. Configure Supabase using `.env.example`.

```bash
npm run lint
npm test
npm run build
```

## Deployment

Pushes to `main` build and deploy through the included GitHub Pages workflow.
The build uses the repository's Supabase variables and retains the PWA setup.

Public URL: [cdt.github.io/tk](https://cdt.github.io/tk/).
