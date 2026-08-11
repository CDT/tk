export type StudyMode = 'translation' | 'excerpt' | 'word' | 'piano'
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

export interface PianoCard {
  id: string
  title: string
  group: 'Scale' | 'Chord' | 'Arpeggio' | 'Exercise'
  notes: string
  fingering: string
  description: string
  sequence: number[][]
}

export interface StudyData {
  translations: TranslationCard[]
  excerpts: ExcerptCard[]
  words: WordCard[]
  piano: PianoCard[]
}

export interface Progress {
  reviewed: string[]
  remembered: string[]
}

export interface CardPreferences {
  favorites: string[]
  ignored: string[]
}
