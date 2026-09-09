export interface StudyCard {
  id: string
  title: string
  content: string
}

export type StudyData = StudyCard[]

export interface Progress {
  reviewed: string[]
  remembered: string[]
}

export interface CardPreferences {
  favorites: string[]
  ignored: string[]
}
