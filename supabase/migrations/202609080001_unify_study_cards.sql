-- Merge existing rows in place. IDs, timestamps, favorites and links survive.
-- Run during the coordinated backend/frontend release, with editor writes paused.
begin;
lock table public.study_cards in access exclusive mode;

alter table public.study_cards add column if not exists content text;

-- Piano was bundled locally; also remove any piano rows if an installation added them.
delete from public.study_cards c where to_jsonb(c)->>'mode' = 'piano';

-- to_jsonb allows this migration to be rerun after the legacy columns are removed.
-- Prefer generic edits if a previous frontend stored them in word/explanation.
update public.study_cards c set
  title = case
    when to_jsonb(c)->>'word' is not null and to_jsonb(c)->>'explanation' is not null then to_jsonb(c)->>'word'
    when to_jsonb(c)->>'source' is not null then to_jsonb(c)->>'source'
    else c.title
  end,
  content = case
    when to_jsonb(c)->>'word' is not null and to_jsonb(c)->>'explanation' is not null then to_jsonb(c)->>'explanation'
    when to_jsonb(c)->>'source' is not null then concat_ws(E'\n\n', nullif(to_jsonb(c)->>'en', ''), nullif(to_jsonb(c)->>'ja', ''))
    else concat_ws(E'\n\n', nullif(concat_ws(' · ', nullif(to_jsonb(c)->>'dynasty', ''), nullif(to_jsonb(c)->>'author', '')), ''), nullif(to_jsonb(c)->>'text', ''))
  end
where c.content is null;

-- Abort atomically instead of dropping source fields from an incomplete card.
do $$
begin
  if exists (select 1 from public.study_cards where title is null or length(trim(title)) = 0 or content is null or length(trim(content)) = 0) then
    raise exception 'Incomplete study card: fix its title/content before migrating';
  end if;
end $$;

alter table public.study_cards drop constraint if exists study_cards_id_check;
alter table public.study_cards drop constraint if exists study_cards_mode_position_key;
alter table public.study_cards drop constraint if exists study_cards_position_key;

-- Give all former collections one globally unique order.
with ranked as (
  select id, row_number() over (order by position, id) - 1 as next_position
  from public.study_cards
)
update public.study_cards c set position = ranked.next_position from ranked where c.id = ranked.id;

alter table public.study_cards
  drop column if exists mode,
  drop column if exists source,
  drop column if exists en,
  drop column if exists ja,
  drop column if exists author,
  drop column if exists dynasty,
  drop column if exists text,
  drop column if exists word,
  drop column if exists explanation,
  drop column if exists details,
  drop column if exists prefix,
  drop column if exists postfix,
  drop column if exists root,
  drop column if exists etymology,
  drop column if exists example;

create sequence if not exists public.study_cards_position_seq minvalue 0 start with 0;
alter sequence public.study_cards_position_seq owned by public.study_cards.position;
select setval('public.study_cards_position_seq', coalesce((select max(position) + 1 from public.study_cards), 0), false);
alter table public.study_cards
  alter column id set default gen_random_uuid()::text,
  alter column title set not null,
  alter column content set not null,
  alter column position set default nextval('public.study_cards_position_seq'),
  add constraint study_cards_position_key unique (position);
alter table public.study_cards drop constraint if exists study_cards_title_check;
alter table public.study_cards drop constraint if exists study_cards_content_check;
alter table public.study_cards add constraint study_cards_title_check check (length(trim(title)) > 0);
alter table public.study_cards add constraint study_cards_content_check check (length(trim(content)) > 0);
notify pgrst, 'reload schema';
commit;
