import { createClient } from '@supabase/supabase-js'
import type { StudyData } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function loadStudyCards(): Promise<StudyData> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  }

  const { data, error } = await supabase
    .from('study_cards')
    .select('id, title, content')
    .order('position')

  if (error) throw new Error('Could not load study cards from Supabase.', { cause: error })
  if (!data) throw new Error('Supabase returned no study card data.')

  return data as StudyData
}
