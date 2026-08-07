export type StudyMode = 'translation' | 'excerpt'
export type TargetLanguage = 'en' | 'ja'

export interface TranslationCard {
  id: string
  source: string
  en: string
  ja: string
}

export interface ExcerptCard {
  id: string
  title: string
  author: string
  dynasty: string
  text: string
}

export interface StudyData {
  translations: TranslationCard[]
  excerpts: ExcerptCard[]
}

export interface Progress {
  reviewed: string[]
  remembered: string[]
}

export interface CardPreferences {
  favorites: string[]
  ignored: string[]
}
