-- Run this in the Supabase SQL Editor before deploying.
-- The table is publicly readable so the study app can load cards; all writes remain dashboard-only.
create table if not exists public.study_cards (
  id text primary key check (id ~ '^(translation|excerpt):[0-9]+$'),
  mode text not null check (mode in ('translation', 'excerpt')),
  position integer not null check (position >= 0),
  source text,
  en text,
  ja text,
  title text,
  author text,
  dynasty text,
  text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (mode = 'translation' and source is not null and en is not null and ja is not null)
    or
    (mode = 'excerpt' and title is not null and author is not null and dynasty is not null and text is not null)
  ),
  unique (mode, position)
);

alter table public.study_cards enable row level security;

drop policy if exists "Anyone can read study cards" on public.study_cards;
create policy "Anyone can read study cards"
  on public.study_cards for select to anon using (true);

-- Edit cards in Supabase's Table Editor. Do not add anonymous write policies.
