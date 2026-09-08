import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App, { shuffleItems } from './App'
import { studyData } from './data'
import { manageStudyCards } from './lib/adminCards'

vi.mock('./lib/studyCards', async () => {
  const { studyData: remoteStudyData } = await import('./data')
  return { loadStudyCards: vi.fn().mockResolvedValue(remoteStudyData) }
})

vi.mock('./lib/adminCards', () => ({
  manageStudyCards: vi.fn(),
  hasValidAdminSession: vi.fn(() => false),
}))

describe('study data', () => {
  it('merges every non-piano card without losing IDs or content', () => {
    expect(studyData).toHaveLength(215)
    expect(new Set(studyData.map((card) => card.id)).size).toBe(215)
    expect(studyData.filter((card) => card.id.startsWith('translation:'))).toHaveLength(100)
    expect(studyData.filter((card) => card.id.startsWith('excerpt:'))).toHaveLength(100)
    studyData.forEach((card) => {
      expect(card.title).not.toBe('')
      expect(card.content).not.toBe('')
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

function swipeBy(distance: number) {
  const shell = document.querySelector('.app-shell') as HTMLElement
  fireEvent.pointerDown(shell, { ...touch, clientX: 200, clientY: 300 })
  fireEvent.pointerMove(shell, { ...touch, clientX: 200 + distance, clientY: 300 })
  fireEvent.pointerUp(shell, { ...touch, clientX: 200 + distance, clientY: 300 })
}

async function renderApp() {
  render(<App />)
  await screen.findByText(/在会议开始之前/)
}

describe('TK study flow', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/tk/')
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
  })

  afterEach(() => vi.restoreAllMocks())

  it('shuffles cards without changing the source data', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    const cards = studyData
    const shuffled = shuffleItems(cards)

    expect(shuffled).not.toEqual(cards)
    expect(new Set(shuffled)).toEqual(new Set(cards))
    expect(studyData).toBe(cards)
  })

  it('reveals a complete translation', async () => {
    await renderApp()

    expect(screen.getByText(/在会议开始之前/)).toBeInTheDocument()
    expect(screen.getByTestId('card-answer')).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByTestId('card-answer'))

    expect(screen.getByTestId('card-answer')).toHaveTextContent(
      "Before the meeting begins, we need to clarify today's primary objective",
    )
    expect(screen.getByTestId('card-answer')).toHaveTextContent('本日の最優先事項を明確にし')
    expect(screen.getByRole('button', { name: 'Favorite' })).toBeVisible()

    fireEvent.click(screen.getByTestId('card-answer'))
    expect(screen.getByTestId('card-answer')).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports the N1 Japanese target and navigates to the next entry', async () => {
    await renderApp()

    fireEvent.click(screen.getByTestId('card-answer'))
    expect(screen.getByTestId('card-answer')).toHaveTextContent('本日の最優先事項を明確にし')

    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getByText(/某个议题并不紧急/)).toBeVisible()
    expect(window.location.search).toBe('?id=translation%3A1')
  })

  it('has one card list without category or language switches', async () => {
    await renderApp()
    expect(screen.queryByLabelText('Study modes')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Translation language')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Piano' })).not.toBeInTheDocument()
  })

  it('restores the entry identified in the URL', async () => {
    window.history.replaceState(null, '', '/tk/?id=excerpt%3A2')

    render(<App />)

    expect(await screen.findByText('登鹳雀楼')).toBeVisible()
    expect(screen.getAllByText('103 / 215')[0]).toBeVisible()
  })

  it('navigates between entries with horizontal swipes', async () => {
    await renderApp()

    swipeBy(-80)
    expect(screen.getAllByText('2 / 215')[0]).toBeVisible()

    swipeBy(80)
    expect(screen.getAllByText('1 / 215')[0]).toBeVisible()
  })

  it('reveals an excerpt through the same control', async () => {
    window.history.replaceState(null, '', '/tk/?id=excerpt%3A0')
    render(<App />)
    await screen.findByText('春晓')
    expect(screen.queryByText(/春眠不觉晓/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal content' }))
    expect(screen.getByTestId('card-answer')).toHaveTextContent('春眠不觉晓，处处闻啼鸟。')
  })

  it('stores favorite and ignored entries locally', async () => {
    await renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
    expect(screen.getByRole('button', { name: 'Favorited' })).toBeVisible()
    expect(localStorage.getItem('tk-card-preferences')).toContain('translation:0')

    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }))
    expect(screen.getByText(/在会议开始之前/)).toBeVisible()
    expect(localStorage.getItem('tk-card-preferences')).toContain('ignored')
  })

  it('keeps the current entry selected when reshuffling the session', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getAllByText('2 / 215')[0]).toBeVisible()

    pullBy(80)

    expect(screen.getAllByText('2 / 215')[0]).toBeVisible()
    expect(window.location.search).toBe('?id=translation%3A1')
  })

  it('leaves the session alone when the pull stops short of the threshold', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))

    pullBy(40)

    expect(screen.getAllByText('2 / 215')[0]).toBeVisible()
  })

  it('keeps taps working while the pull gesture is armed', async () => {
    await renderApp()
    const answer = screen.getByTestId('card-answer')

    // A tap is a pointer sequence with no travel; it must still reach the button.
    fireEvent.pointerDown(answer, { ...touch, clientY: 300 })
    fireEvent.pointerUp(answer, { ...touch, clientY: 300 })
    fireEvent.click(answer)

    expect(answer).toHaveAttribute('aria-expanded', 'true')
  })

  it('swallows the click a pull leaves behind on the card', async () => {
    await renderApp()
    const answer = screen.getByTestId('card-answer')

    fireEvent.pointerDown(answer, { ...touch, clientY: 300 })
    fireEvent.pointerMove(answer, { ...touch, clientY: 380 })
    fireEvent.pointerUp(answer, { ...touch, clientY: 380 })
    fireEvent.click(answer)

    expect(screen.getByTestId('card-answer')).toHaveAttribute('aria-expanded', 'false')
  })

  it('ignores mouse drags so desktop selection never refreshes the session', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    const shell = document.querySelector('.app-shell') as HTMLElement

    fireEvent.pointerDown(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 0 })
    fireEvent.pointerMove(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 80 })
    fireEvent.pointerUp(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 80 })

    expect(screen.getAllByText('2 / 215')[0]).toBeVisible()
  })

  it('filters cards to favorites from Study options', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
    fireEvent.click(screen.getByRole('button', { name: /Options/ }))
    fireEvent.click(screen.getByLabelText('Favorites only'))
    expect(screen.getByRole('dialog', { name: 'Study options' })).toBeVisible()
    expect(screen.getAllByText(/1 \/ 1/)[0]).toBeVisible()
  })

  it('reveals a word through the same control', async () => {
    window.history.replaceState(null, '', '/tk/?id=word-001')
    render(<App />)
    await screen.findByText('verbatim')
    fireEvent.click(screen.getByRole('button', { name: 'Reveal content' }))
    expect(screen.getByTestId('card-answer')).toHaveTextContent('Definition: Using exactly the same words as the original')
  })

  it('shows a newly created entry immediately', async () => {
    vi.mocked(manageStudyCards)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'new-translation',
        title: '新添加的句子',
        content: 'A newly added sentence\n\n新しく追加された文',
      })
    await renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Manage entries' }))
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock editor' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add entry' }))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '新添加的句子' } })
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'A newly added sentence' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Manage study entries' })).not.toBeInTheDocument())
    expect(screen.getByText('新添加的句子')).toBeVisible()
    expect(window.location.search).toBe('?id=new-translation')
  })
})
