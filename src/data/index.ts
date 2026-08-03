import translationData from './collections.json'
import chineseClassics01 from './chinese-classics-01.json'
import type { StudyData } from '../types'

export const studyData = {
  ...translationData,
  excerptCollections: [chineseClassics01],
} as StudyData
