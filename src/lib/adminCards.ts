import { createClient } from '@supabase/supabase-js'
import type { ExcerptCard, StudyMode, TranslationCard, WordCard } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

const adminSessionKey = 'tk-admin-session'
let legacyAdminPassword = ''

interface AdminSession {
  token: string
  expiresAt: number
}

function getAdminSession(): AdminSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(adminSessionKey) ?? 'null') as AdminSession | null
    if (session?.token && session.expiresAt > Date.now()) return session
    localStorage.removeItem(adminSessionKey)
  } catch {
    localStorage.removeItem(adminSessionKey)
  }
  return null
}

export function hasValidAdminSession() {
  return getAdminSession() !== null
}

export type EditableCard = TranslationCard | ExcerptCard | WordCard

export async function manageStudyCards(
  action: 'verify' | 'create' | 'update' | 'delete',
  password: string,
  card?: EditableCard,
  mode?: StudyMode,
): Promise<EditableCard | null> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const session = getAdminSession()

  const { data, error } = await supabase.functions.invoke('manage-study-cards', {
    body: {
      action,
      password: action === 'verify' ? password : legacyAdminPassword || undefined,
      token: session?.token,
      card,
      mode,
    },
  })

  if (error) {
    if (session) localStorage.removeItem(adminSessionKey)
    legacyAdminPassword = ''
    throw error
  }
  if (action === 'verify' && data?.token && data?.expiresAt) {
    localStorage.setItem(adminSessionKey, JSON.stringify({ token: data.token, expiresAt: data.expiresAt }))
    legacyAdminPassword = ''
  } else if (action === 'verify') {
    // Older deployed functions authenticate each write with the password instead
    // of issuing a session token. Keep it in memory only for that compatibility
    // path; refreshing the page requires unlocking the editor again.
    legacyAdminPassword = password
  }
  return data?.card ?? null
}
