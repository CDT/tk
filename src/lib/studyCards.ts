import { createClient } from '@supabase/supabase-js'
import type { StudyData } from '../types'
import { piano } from '../data/piano'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

interface StudyCardRow {
  id: string
  mode: 'translation' | 'excerpt' | 'word'
  position: number
  source: string | null
  en: string | null
  ja: string | null
  title: string | null
  author: string | null
  dynasty: string | null
  text: string | null
  word: string | null
  explanation: string | null
}

export async function loadStudyCards(): Promise<StudyData> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  }

  const { data, error } = await supabase
    .from('study_cards')
    .select('id, mode, position, source, en, ja, title, author, dynasty, text, word, explanation')
    .order('position')

  if (error) throw new Error('Could not load study cards from Supabase.', { cause: error })
  if (!data) throw new Error('Supabase returned no study card data.')

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
  const words = cards
    .filter((card) => card.mode === 'word')
    .map(({ id, word, explanation }) => ({
      id,
      word: word ?? '',
      explanation: explanation ?? '',
    }))

  if (translations.length === 0 || excerpts.length === 0) {
    throw new Error('Supabase must contain both translation and excerpt study cards.')
  }

  return { translations, excerpts, words, piano }
}
