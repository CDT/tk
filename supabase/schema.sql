-- Fresh installations only. Existing installations use migrations/202609080001_unify_study_cards.sql.
begin;
create sequence if not exists public.study_cards_position_seq minvalue 0 start with 0;
create table if not exists public.study_cards (
  id text primary key default gen_random_uuid()::text,
  title text not null check (length(trim(title)) > 0),
  content text not null check (length(trim(content)) > 0),
  position integer not null default nextval('public.study_cards_position_seq') unique check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter sequence public.study_cards_position_seq owned by public.study_cards.position;
alter table public.study_cards enable row level security;
drop policy if exists "Anyone can read study cards" on public.study_cards;
create policy "Anyone can read study cards" on public.study_cards for select to anon using (true);
commit;
