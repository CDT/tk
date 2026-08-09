export type StudyMode = 'translation' | 'excerpt' | 'word'
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

export interface WordCard {
  id: string
  word: string
  explanation: string
}

export interface StudyData {
  translations: TranslationCard[]
  excerpts: ExcerptCard[]
  words: WordCard[]
}

export interface Progress {
  reviewed: string[]
  remembered: string[]
}

export interface CardPreferences {
  favorites: string[]
  ignored: string[]
}
