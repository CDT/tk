import { createClient } from '@supabase/supabase-js'
import type { ExcerptCard, StudyData, TranslationCard } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

interface StudyCardRow {
  id: string
  mode: 'translation' | 'excerpt'
  position: number
  source: string | null
  en: string | null
  ja: string | null
  title: string | null
  author: string | null
  dynasty: string | null
  text: string | null
}

export async function loadStudyCards(): Promise<StudyData | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('study_cards')
    .select('id, mode, position, source, en, ja, title, author, dynasty, text')
    .order('position')

  if (error || !data) {
    console.warn('Could not load study cards from Supabase.', error)
    return null
  }

  const cards = data as StudyCardRow[]
  const translations = cards
    .filter((card) => card.mode === 'translation')
    .map(({ id, source, en, ja }) => ({ id, source: source ?? '', en: en ?? '', ja: ja ?? '' }))
  const excerpts = cards
    .filter((card) => card.mode === 'excerpt')
    .map(({ id, title, author, dynasty, text }) => ({
      id,
      title: title ?? '',
      author: author ?? '',
      dynasty: dynasty ?? '',
      text: text ?? '',
    }))

  return translations.length > 0 && excerpts.length > 0
    ? { translations, excerpts }
    : null
}
