import translationData from './collections.json'
import chineseClassics01 from './chinese-classics-01.json'
import type { StudyData } from '../types'

const businessCore02 = {
  ...translationData.translationCollections[0],
  id: 'business-core-02',
  title: 'Business Core 02',
  subtitle: '100 business-language review prompts',
  description: 'A second pass through the business core, arranged as a focused revision collection.',
  cards: translationData.translationCollections[0].cards.map((card) => ({
    ...card,
    id: card.id.replace('bc01-', 'bc02-'),
    note: `${card.note} · Review`,
  })),
}

const chineseClassics02 = {
  ...chineseClassics01,
  id: 'chinese-classics-02',
  title: 'Chinese Classics 02',
  subtitle: '100 classical passage review prompts',
  description: 'A second collection for revisiting essential classical Chinese passages.',
  cards: chineseClassics01.cards.map((card) => ({
    ...card,
    id: card.id.replace('cc01-', 'cc02-'),
    note: `${card.note} · 复习`,
  })),
}

export const studyData = {
  translationCollections: [...translationData.translationCollections, businessCore02],
  excerptCollections: [chineseClassics01, chineseClassics02],
} as StudyData
