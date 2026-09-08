// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import migration from '../../supabase/migrations/202609080001_unify_study_cards.sql?raw'
import schema from '../../supabase/schema.sql?raw'

const legacySchema = `
create role anon;
create table study_cards (
  id text primary key,
  mode text not null check (mode in ('translation', 'excerpt', 'word')),
  position integer not null check (position >= 0),
  source text, en text, ja text, title text, author text, dynasty text, text text,
  word text, explanation text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((mode = 'translation' and source is not null and en is not null and ja is not null)
    or (mode = 'excerpt' and title is not null and author is not null and dynasty is not null and text is not null)
    or (mode = 'word' and word is not null and explanation is not null)),
  unique(mode, position)
);
alter table study_cards enable row level security;
create policy "Anyone can read study cards" on study_cards for select to anon using (true);
insert into study_cards(id,mode,position,source,en,ja) values ('translation:0','translation',0,'你好','Hello','こんにちは');
insert into study_cards(id,mode,position,title,author,dynasty,text) values ('excerpt:0','excerpt',0,'春晓','孟浩然','唐','春眠不觉晓');
insert into study_cards(id,mode,position,word,explanation) values ('word-001','word',0,'verbatim','Exact words.');
`

it('migrates and reruns without losing content, IDs, timestamps or access policy', async () => {
  const db = new PGlite()
  try {
    await db.exec(legacySchema)
    const timestamps = await db.query('select id, created_at, updated_at from study_cards order by id')
    await db.exec(migration)
    const result = await db.query('select id, title, content from study_cards order by id')
    expect(result.rows).toEqual([
      { id: 'excerpt:0', title: '春晓', content: '唐 · 孟浩然\n\n春眠不觉晓' },
      { id: 'translation:0', title: '你好', content: 'Hello\n\nこんにちは' },
      { id: 'word-001', title: 'verbatim', content: 'Exact words.' },
    ])
    await db.exec(migration)
    expect((await db.query('select id, title, content from study_cards order by id')).rows).toEqual(result.rows)
    expect((await db.query('select id, created_at, updated_at from study_cards order by id')).rows).toEqual(timestamps.rows)
    const columns = await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'study_cards'")
    expect(columns.rows.map((row) => row.column_name).sort()).toEqual(['content', 'created_at', 'id', 'position', 'title', 'updated_at'])
    expect((await db.query("select * from pg_policies where tablename = 'study_cards'")).rows).toHaveLength(1)
    const created = await db.query<{ id: string; position: number }>("insert into study_cards(title,content) values ('New','Content'),('Next','Content') returning id,position")
    expect(created.rows.map((row) => row.position)).toEqual([3, 4])
    expect(created.rows[0].id).not.toBe(created.rows[1].id)
  } finally { await db.close() }
}, 20000)

it('rolls back incomplete data instead of dropping the original fields', async () => {
  const db = new PGlite()
  try {
    await db.exec(legacySchema)
    await db.exec("update study_cards set en = '', ja = '' where id = 'translation:0'")
    await expect(db.exec(migration)).rejects.toThrow('Incomplete study card')
    await db.exec('rollback')
    expect((await db.query("select source from study_cards where id = 'translation:0'")).rows).toEqual([{ source: '你好' }])
    expect((await db.query("select column_name from information_schema.columns where table_name = 'study_cards' and column_name = 'content'")).rows).toHaveLength(0)
  } finally { await db.close() }
}, 20000)

it('creates a fresh schema with the same unified shape', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon')
    await db.exec(schema)
    const result = await db.query<{ position: number }>("insert into study_cards(title,content) values ('Title','Content') returning position")
    expect(result.rows[0].position).toBe(0)
    await expect(db.exec("insert into study_cards(title,content) values ('','Content')")).rejects.toThrow()
  } finally { await db.close() }
}, 20000)
