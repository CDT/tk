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

const touch = { pointerId: 1, isPrimary: true, pointerType: 'touch' }

function pullBy(distance: number) {
  const shell = document.querySelector('.app-shell') as HTMLElement
  fireEvent.pointerDown(shell, { ...touch, clientY: 0 })
  fireEvent.pointerMove(shell, { ...touch, clientY: distance })
  fireEvent.pointerUp(shell, { ...touch, clientY: distance })
}

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
    expect(screen.getByRole('button', { name: 'Favorite' })).toBeVisible()

    fireEvent.click(screen.getByTestId('translation-answer'))
    expect(screen.getByTestId('translation-answer').querySelector('.masked-translation')).toBeInTheDocument()
  })

  it('supports the N1 Japanese target and navigates to the next entry', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '日本語' }))
    fireEvent.click(screen.getByTestId('translation-answer'))
    expect(screen.getByTestId('translation-answer')).toHaveTextContent('本日の最優先事項を明確にし')

    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getByText(/某个议题并不紧急/)).toBeVisible()
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

    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }))
    expect(screen.getByText(/在会议开始之前/)).toBeVisible()
    expect(localStorage.getItem('tk-card-preferences')).toContain('ignored')
  })

  it('reshuffles the session when the pull gesture passes the threshold', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()

    pullBy(80)

    expect(screen.getAllByText('1 / 100')[0]).toBeVisible()
  })

  it('leaves the session alone when the pull stops short of the threshold', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))

    pullBy(40)

    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()
  })

  it('keeps taps working while the pull gesture is armed', () => {
    render(<App />)
    const answer = screen.getByTestId('translation-answer')

    // A tap is a pointer sequence with no travel; it must still reach the button.
    fireEvent.pointerDown(answer, { ...touch, clientY: 300 })
    fireEvent.pointerUp(answer, { ...touch, clientY: 300 })
    fireEvent.click(answer)

    expect(answer.querySelector('.masked-translation')).not.toBeInTheDocument()
  })

  it('swallows the click a pull leaves behind on the card', () => {
    render(<App />)
    const answer = screen.getByTestId('translation-answer')

    fireEvent.pointerDown(answer, { ...touch, clientY: 300 })
    fireEvent.pointerMove(answer, { ...touch, clientY: 380 })
    fireEvent.pointerUp(answer, { ...touch, clientY: 380 })
    fireEvent.click(answer)

    expect(screen.getByTestId('translation-answer').querySelector('.masked-translation')).toBeInTheDocument()
  })

  it('ignores mouse drags so desktop selection never refreshes the session', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    const shell = document.querySelector('.app-shell') as HTMLElement

    fireEvent.pointerDown(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 0 })
    fireEvent.pointerMove(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 80 })
    fireEvent.pointerUp(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 80 })

    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()
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
