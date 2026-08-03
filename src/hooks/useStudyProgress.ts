import { useCallback, useState } from 'react'
import type { Progress } from '../types'

const STORAGE_KEY = 'tk-study-progress'
const EMPTY_PROGRESS: Progress = { reviewed: [], remembered: [] }

function readProgress(): Progress {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as Progress) : EMPTY_PROGRESS
  } catch {
    return EMPTY_PROGRESS
  }
}

export function useStudyProgress() {
  const [progress, setProgress] = useState<Progress>(readProgress)

  const rate = useCallback((id: string, remembered: boolean) => {
    setProgress((current) => {
      const next = {
        reviewed: [...new Set([...current.reviewed, id])],
        remembered: remembered
          ? [...new Set([...current.remembered, id])]
          : current.remembered.filter((cardId) => cardId !== id),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setProgress(EMPTY_PROGRESS)
  }, [])

  return { progress, rate, reset }
}

