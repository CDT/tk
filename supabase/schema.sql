-- Run this in the Supabase SQL Editor before deploying.
-- The table is publicly readable so the study app can load cards; all writes remain dashboard-only.
create table if not exists public.study_cards (
  id text primary key check (id ~ '^((translation|excerpt):[0-9]+|(translation|excerpt|word)-[0-9]+)$'),
  mode text not null check (mode in ('translation', 'excerpt', 'word')),
  position integer not null check (position >= 0),
  source text,
  en text,
  ja text,
  title text,
  author text,
  dynasty text,
  text text,
  word text,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (mode = 'translation' and source is not null and en is not null and ja is not null)
    or
    (mode = 'excerpt' and title is not null and author is not null and dynasty is not null and text is not null)
    or
    (mode = 'word' and word is not null and explanation is not null)
  ),
  unique (mode, position)
);

-- Upgrade an existing installation created before the words collection existed.
alter table public.study_cards add column if not exists word text;
alter table public.study_cards add column if not exists explanation text;
alter table public.study_cards drop constraint if exists study_cards_id_check;
alter table public.study_cards drop constraint if exists study_cards_mode_check;
alter table public.study_cards drop constraint if exists study_cards_check;
alter table public.study_cards drop constraint if exists study_cards_content_check;
alter table public.study_cards add constraint study_cards_id_check check (id ~ '^((translation|excerpt):[0-9]+|(translation|excerpt|word)-[0-9]+)$');
alter table public.study_cards add constraint study_cards_mode_check check (mode in ('translation', 'excerpt', 'word'));

insert into public.study_cards (id, mode, position, word, explanation)
values
  ('word-001', 'word', 0, 'verbatim', E'Definition: Using exactly the same words as the original.\nPrefix: No modern prefix; ver- belongs to the Latin base verbum.\nPostfix: -atim, a Latin adverb-forming ending indicating a manner of action.\nRoot: verb- / verbum, meaning “word”.\nEtymology: From Medieval Latin verbatim, formed from Latin verbum (“word”) and the adverbial ending -atim; literally “word for word”.\nExample: The witness repeated the statement verbatim during the hearing.'),
  ('word-002', 'word', 1, 'incentive', E'Definition: Something that motivates or encourages a person to act.\nPrefix: in-, historically meaning “in” or “toward”.\nPostfix: -ive, forming adjectives and nouns associated with an action or tendency.\nRoot: can- / cant-, meaning “sing” or “play”; its form shifted in Latin incinere and incentivum.\nEtymology: From Late Latin incentivum (“something that sets the tune”), from Latin incinere (“to play or sing”), later developing the sense of something that spurs action.\nExample: The company offered a performance bonus as an incentive to finish the project early.'),
  ('word-003', 'word', 2, 'orca', E'Definition: A large black-and-white toothed whale, also called a killer whale.\nPrefix: No prefix.\nPostfix: No postfix.\nRoot: orca, the complete inherited base.\nEtymology: From Latin orca, a term for a large sea creature or whale, possibly related to a word for a large-bellied jar because of the animal’s shape.\nExample: The orca surfaced beside the research vessel before returning to deeper water.'),
  ('word-004', 'word', 3, 'obfuscate', E'Definition: To make something unclear, confusing, or difficult to understand.\nPrefix: ob-, meaning “over, against, or toward”.\nPostfix: -ate, forming a verb.\nRoot: fusc-, from Latin fuscus, meaning “dark”.\nEtymology: From Late Latin obfuscare, literally “to darken”.\nExample: The report used technical jargon to obfuscate the true cost of the proposal.'),
  ('word-005', 'word', 4, 'equivocate', E'Definition: To speak ambiguously in order to avoid committing to a clear position.\nPrefix: equi-, meaning “equal”.\nPostfix: -ate, forming a verb.\nRoot: voc-, from Latin vox, meaning “voice” or “word”.\nEtymology: From Late Latin aequivocare, based on aequivocus, “of equal or ambiguous meaning”.\nExample: When asked whether the deadline was realistic, the director began to equivocate.'),
  ('word-006', 'word', 5, 'perfunctory', E'Definition: Done with minimal effort or interest, merely to satisfy a requirement.\nPrefix: per-, meaning “through” or “completely”.\nPostfix: -ory, forming an adjective.\nRoot: funct-, from Latin fungi, meaning “to perform or discharge”.\nEtymology: From Late Latin perfunctorius, describing something performed as a routine duty.\nExample: She gave the document only a perfunctory glance before signing it.'),
  ('word-007', 'word', 6, 'inchoate', E'Definition: Only partly formed or developed; still at an early stage.\nPrefix: The initial in- is inherited from Latin but is not the usual English negative prefix.\nPostfix: -ate, forming an adjective.\nRoot: incho-, from Latin inchoare, meaning “to begin”.\nEtymology: From Latin inchoatus, the past participle of inchoare, “to begin”.\nExample: The committee had an inchoate plan but no budget or timetable.'),
  ('word-008', 'word', 7, 'laconic', E'Definition: Using very few words, often in a strikingly concise way.\nPrefix: No prefix.\nPostfix: -ic, meaning “characteristic of”.\nRoot: Lacon-, referring to Laconia, the region of ancient Sparta.\nEtymology: Spartans were traditionally renowned for their terse speech, giving rise to Greek Lakonikos and later English laconic.\nExample: His laconic reply—“Not yet”—ended the discussion.'),
  ('word-009', 'word', 8, 'ubiquitous', E'Definition: Present, appearing, or found everywhere.\nPrefix: No productive English prefix.\nPostfix: -ous, meaning “full of” or “having the quality of”.\nRoot: ubiqu-, from Latin ubique, meaning “everywhere”.\nEtymology: Formed from Latin ubique and the English adjectival ending -ous.\nExample: Smartphones have become ubiquitous in modern urban life.'),
  ('word-010', 'word', 9, 'ephemeral', E'Definition: Lasting for only a very short time.\nPrefix: epi-, from Greek, meaning “on” or “for”.\nPostfix: -al, forming an adjective.\nRoot: hemer-, from Greek hemera, meaning “day”.\nEtymology: From Greek ephemeros, literally “lasting only a day”.\nExample: Online popularity can be intense but ephemeral.'),
  ('word-011', 'word', 10, 'parsimonious', E'Definition: Extremely unwilling to spend money or use resources; excessively frugal.\nPrefix: No prefix.\nPostfix: -ous, forming an adjective.\nRoot: parsimon-, from Latin parsimonia, meaning “thrift” or “economy”.\nEtymology: From Latin parsimonia through English parsimony, with the adjectival ending -ous.\nExample: The parsimonious manager refused even inexpensive improvements to workplace safety.'),
  ('word-012', 'word', 11, 'recalcitrant', E'Definition: Stubbornly resistant to authority, control, or correction.\nPrefix: re-, meaning “back” or “again”.\nPostfix: -ant, indicating a person or thing performing an action.\nRoot: calcitr-, from Latin calcitrare, meaning “to kick with the heels”.\nEtymology: From Latin recalcitrare, literally “to kick back”.\nExample: The recalcitrant witness repeatedly ignored the judge’s instructions.'),
  ('word-013', 'word', 12, 'sycophant', E'Definition: A person who uses excessive flattery to gain favor from someone influential.\nPrefix: No English prefix.\nPostfix: -ant is part of the inherited form rather than a productive suffix here.\nRoot: sycophant-, from Greek sykophantes.\nEtymology: From Greek sykophantes, literally “fig-shower”; how that expression developed into “informer” and later “servile flatterer” is uncertain.\nExample: The executive surrounded himself with sycophants who never challenged his decisions.'),
  ('word-014', 'word', 13, 'ameliorate', E'Definition: To make a bad or unsatisfactory situation better.\nPrefix: a- belongs to the borrowed French form and is not a productive English prefix here.\nPostfix: -ate, forming a verb.\nRoot: melior-, from Latin melior, meaning “better”.\nEtymology: Borrowed from French améliorer, ultimately based on Latin melior.\nExample: The new ventilation system should ameliorate conditions in the workshop.'),
  ('word-015', 'word', 14, 'vicissitude', E'Definition: A change in circumstances, especially one that is unwelcome or part of life’s fluctuations.\nPrefix: No prefix.\nPostfix: -tude, forming an abstract noun.\nRoot: viciss-, from Latin vicis, meaning “change” or “alternation”.\nEtymology: From Latin vicissitudo, meaning “change, alternation, or succession”.\nExample: The old institution survived every political and economic vicissitude.')
on conflict (id) do update set
  word = excluded.word,
  explanation = excluded.explanation,
  updated_at = now();

alter table public.study_cards add constraint study_cards_content_check check (
  (mode = 'translation' and source is not null and en is not null and ja is not null)
  or (mode = 'excerpt' and title is not null and author is not null and dynasty is not null and text is not null)
  or (mode = 'word' and word is not null and explanation is not null)
);

alter table public.study_cards drop column if exists details;
alter table public.study_cards drop column if exists prefix;
alter table public.study_cards drop column if exists postfix;
alter table public.study_cards drop column if exists root;
alter table public.study_cards drop column if exists etymology;
alter table public.study_cards drop column if exists example;

alter table public.study_cards enable row level security;

drop policy if exists "Anyone can read study cards" on public.study_cards;
create policy "Anyone can read study cards"
  on public.study_cards for select to anon using (true);

-- Edit cards in Supabase's Table Editor. Do not add anonymous write policies.
