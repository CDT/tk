import { createClient } from '@supabase/supabase-js'
import type { ExcerptCard, StudyMode, TranslationCard, WordCard } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export type EditableCard = TranslationCard | ExcerptCard | WordCard

export async function manageStudyCards(
  action: 'verify' | 'create' | 'update' | 'delete',
  password: string,
  card?: EditableCard,
  mode?: StudyMode,
): Promise<EditableCard | null> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.functions.invoke('manage-study-cards', {
    body: { action, password, card, mode },
  })

  if (error) throw error
  return data?.card ?? null
}
