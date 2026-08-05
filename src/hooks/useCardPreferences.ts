import { useCallback, useState } from 'react'
import type { CardPreferences } from '../types'

const STORAGE_KEY = 'tk-card-preferences'
const EMPTY_PREFERENCES: CardPreferences = { favorites: [], ignored: [] }

function readPreferences(): CardPreferences {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? { ...EMPTY_PREFERENCES, ...(JSON.parse(value) as CardPreferences) } : EMPTY_PREFERENCES
  } catch {
    return EMPTY_PREFERENCES
  }
}

function toggleItem(items: string[], id: string) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
}

export function useCardPreferences() {
  const [preferences, setPreferences] = useState<CardPreferences>(readPreferences)

  const toggleFavorite = useCallback((id: string) => {
    setPreferences((current) => {
      const next = { ...current, favorites: toggleItem(current.favorites, id) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const toggleIgnored = useCallback((id: string) => {
    setPreferences((current) => {
      const next = { ...current, ignored: toggleItem(current.ignored, id) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { preferences, toggleFavorite, toggleIgnored }
}
