import { fireEvent, render, screen } from '@testing-library/react'
import App, { shuffleItems } from './App'
import { studyData } from './data'

describe('collection data', () => {
  it('contains two complete, valid 100-card translation collections', () => {
    expect(studyData.translationCollections).toHaveLength(2)
    studyData.translationCollections.forEach((collection) => {
      expect(collection.cards).toHaveLength(100)
      expect(new Set(collection.cards.map((card) => card.id)).size).toBe(100)
      collection.cards.forEach((card) => {
        for (const language of ['en', 'ja'] as const) {
          card.translations[language].hints.forEach((hint) => {
            expect(card.translations[language].text).toContain(hint)
          })
        }
      })
    })
  })

  it('contains two complete, valid 100-card excerpt collections', () => {
    expect(studyData.excerptCollections).toHaveLength(2)
    studyData.excerptCollections.forEach((collection) => {
      expect(collection.cards).toHaveLength(100)
      expect(new Set(collection.cards.map((card) => card.id)).size).toBe(100)
      collection.cards.forEach((card) => {
        card.keywords.forEach((keyword) => {
          expect(card.lines.join('')).toContain(keyword)
        })
      })
    })
  })
})

describe('TK study flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
  })

  afterEach(() => vi.restoreAllMocks())

  it('shuffles collection cards without changing the source data', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    const cards = studyData.translationCollections[0].cards
    const shuffled = shuffleItems(cards)

    expect(shuffled.map((card) => card.id)).not.toEqual(cards.map((card) => card.id))
    expect(new Set(shuffled.map((card) => card.id))).toEqual(new Set(cards.map((card) => card.id)))
    expect(studyData.translationCollections[0].cards).toBe(cards)
  })

  it('selects the business collection and reveals its complete translation', () => {
    render(<App />)

    expect(screen.getByRole('combobox', { name: 'Collection' })).toHaveValue('0')
    expect(screen.getByRole('option', { name: 'Business Core 01 · 100' })).toBeVisible()
    expect(screen.getByText(/在会议开始之前/)).toBeInTheDocument()
    expect(screen.getByTestId('translation-answer').querySelector('.masked-translation')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('translation-answer'))

    expect(screen.getByTestId('translation-answer')).toHaveTextContent(
      "Before the meeting begins, we need to clarify today's primary objective",
    )
    expect(screen.getByRole('button', { name: 'Remembered' })).toBeVisible()
  })

  it('supports the N1 Japanese target and advances progress', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '日本語' }))
    fireEvent.click(screen.getByTestId('translation-answer'))
    expect(screen.getByTestId('translation-answer')).toHaveTextContent('本日の最優先事項を明確にし')

    fireEvent.click(screen.getByRole('button', { name: 'Remembered' }))
    expect(screen.getByText(/某个议题并不紧急/)).toBeVisible()
    expect(localStorage.getItem('tk-study-progress')).toContain('business-core-01')
  })

  it('selects the classics collection and reveals an excerpt', () => {
    render(<App />)
    const excerptButtons = screen.getAllByRole('button', { name: 'Excerpts' })
    fireEvent.click(excerptButtons[0])

    expect(screen.getByRole('option', { name: 'Chinese Classics 01 · 100' })).toBeVisible()
    expect(screen.getByText('春眠')).toBeVisible()
    fireEvent.click(screen.getByText('春眠'))
    expect(screen.getByText('春眠不觉晓，处处闻啼鸟。')).toBeVisible()
  })

  it('stores favorite and ignored entries locally', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
    expect(screen.getByRole('button', { name: 'Favorited' })).toBeVisible()
    expect(localStorage.getItem('tk-card-preferences')).toContain('business-core-01')

    fireEvent.click(screen.getByRole('button', { name: 'Ignore entry' }))
    expect(localStorage.getItem('tk-card-preferences')).toContain('ignored')
  })

  it('filters the collection to favorites from Study options', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
    fireEvent.click(screen.getByRole('button', { name: /Options/ }))
    fireEvent.click(screen.getByLabelText('Favorites only'))
    expect(screen.getByRole('dialog', { name: 'Study options' })).toBeVisible()
    expect(screen.getAllByText(/1 \/ 1/)[0]).toBeVisible()
  })
})
