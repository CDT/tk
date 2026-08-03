export type StudyMode = 'translation' | 'excerpt'
export type TargetLanguage = 'en' | 'ja'

export interface TranslationText {
  text: string
  hints: string[]
}

export interface TranslationCard {
  id: string
  source: string
  note: string
  translations: Record<TargetLanguage, TranslationText>
}

export interface ExcerptCard {
  id: string
  title: string
  author: string
  dynasty: string
  keywords: string[]
  lines: string[]
  note: string
}

export interface TranslationCollection {
  id: string
  title: string
  subtitle: string
  description: string
  levels: string[]
  cards: TranslationCard[]
}

export interface ExcerptCollection {
  id: string
  title: string
  subtitle: string
  description: string
  cards: ExcerptCard[]
}

export interface StudyData {
  translationCollections: TranslationCollection[]
  excerptCollections: ExcerptCollection[]
}

export interface Progress {
  reviewed: string[]
  remembered: string[]
}
