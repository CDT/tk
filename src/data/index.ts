import translations from './translations.json'
import excerpts from './excerpts.json'
import type { ExcerptCard, StudyData, TranslationCard } from '../types'

const studyData: StudyData = {
  translations: translations.map((card, position) => ({
    ...card,
    id: `translation:${position}`,
  })) as TranslationCard[],
  excerpts: excerpts.map((card, position) => ({
    ...card,
    id: `excerpt:${position}`,
  })) as ExcerptCard[],
}

export { studyData }
export default studyData
