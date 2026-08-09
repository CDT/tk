import translations from './translations.json'
import excerpts from './excerpts.json'
import words from './words.json'
import type { ExcerptCard, StudyData, TranslationCard, WordCard } from '../types'

const studyData: StudyData = {
  translations: translations.map((card, position) => ({
    ...card,
    id: `translation:${position}`,
  })) as TranslationCard[],
  excerpts: excerpts.map((card, position) => ({
    ...card,
    id: `excerpt:${position}`,
  })) as ExcerptCard[],
  words: words.map((card, position) => ({
    ...card,
    id: `word-${String(position + 1).padStart(3, '0')}`,
  })) as WordCard[],
}

export { studyData }
export default studyData
