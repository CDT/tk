import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App, { shuffleItems } from './App'
import { studyData } from './data'
import { manageStudyCards } from './lib/adminCards'
import { playPianoSequence } from './lib/pianoAudio'

vi.mock('./lib/studyCards', async () => {
  const { studyData: remoteStudyData } = await import('./data')
  return { loadStudyCards: vi.fn().mockResolvedValue(remoteStudyData) }
})

vi.mock('./lib/adminCards', () => ({
  manageStudyCards: vi.fn(),
  hasValidAdminSession: vi.fn(() => false),
}))

vi.mock('./lib/pianoAudio', () => ({
  playPianoSequence: vi.fn(),
}))

vi.mock('./components/PianoScore', () => ({
  PianoScore: ({ title }: { title: string }) => <div role="img" aria-label={`Sheet music for ${title}`} />,
}))

describe('study data', () => {
  it('contains 100 complete translation cards', () => {
    expect(studyData.translations).toHaveLength(100)
    studyData.translations.forEach((card) => {
      expect(card.source).not.toBe('')
      expect(card.en).not.toBe('')
      expect(card.ja).not.toBe('')
    })
  })

  it('contains 100 complete excerpt cards', () => {
    expect(studyData.excerpts).toHaveLength(100)
    studyData.excerpts.forEach((card) => {
      expect(card.title).not.toBe('')
      expect(card.text).not.toBe('')
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
    const cards = studyData.translations
    const shuffled = shuffleItems(cards)

    expect(shuffled).not.toEqual(cards)
    expect(new Set(shuffled)).toEqual(new Set(cards))
    expect(studyData.translations).toBe(cards)
  })

  it('reveals a complete translation', async () => {
    await renderApp()

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

  it('supports the N1 Japanese target and navigates to the next entry', async () => {
    await renderApp()

    fireEvent.click(screen.getByRole('button', { name: '日本語' }))
    fireEvent.click(screen.getByTestId('translation-answer'))
    expect(screen.getByTestId('translation-answer')).toHaveTextContent('本日の最優先事項を明確にし')

    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getByText(/某个议题并不紧急/)).toBeVisible()
    expect(window.location.search).toBe('?id=translation%3A1')
  })

  it('contains the initial complete word collection', () => {
    expect(studyData.words).toHaveLength(15)
    expect(studyData.words.slice(0, 3).map((card) => card.word)).toEqual(['verbatim', 'incentive', 'orca'])
    studyData.words.forEach((card) => {
      expect(card.explanation).toContain('Definition:')
      expect(card.explanation).toContain('Prefix:')
      expect(card.explanation).toContain('Postfix:')
      expect(card.explanation).toContain('Root:')
      expect(card.explanation).toContain('Etymology:')
      expect(card.explanation).toContain('Example:')
    })
  })

  it('provides a built-in playable piano collection without editing controls', async () => {
    await renderApp()
    fireEvent.click(screen.getAllByRole('button', { name: 'Piano' })[0])

    expect(screen.getByText('C major scale')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Sheet music for C major scale' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manage entries' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(playPianoSequence).toHaveBeenCalledWith(studyData.piano[0].sequence)
  })

  it('recovers when piano samples cannot be loaded', async () => {
    vi.mocked(playPianoSequence).mockRejectedValueOnce(new Error('offline'))
    await renderApp()
    fireEvent.click(screen.getAllByRole('button', { name: 'Piano' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the piano samples')
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
  })

  it('deletes a piano entry and remembers the deletion locally', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await renderApp()
    fireEvent.click(screen.getAllByRole('button', { name: 'Piano' })[0])
    expect(screen.getByText('C major scale')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByText('C major scale')).not.toBeInTheDocument()
    expect(localStorage.getItem('tk-deleted-piano-cards')).toContain('piano-c-major-scale')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('restores the entry identified in the URL', async () => {
    window.history.replaceState(null, '', '/tk/?id=excerpt%3A2')

    render(<App />)

    expect(await screen.findByText('登鹳雀楼')).toBeVisible()
    expect(screen.getAllByText('3 / 100')[0]).toBeVisible()
  })

  it('keeps a newly selected translation language masked until it is tapped', async () => {
    await renderApp()

    fireEvent.click(screen.getByTestId('translation-answer'))
    expect(screen.getByTestId('translation-answer').querySelector('.masked-translation')).not.toBeInTheDocument()

    const japaneseButton = screen.getByRole('button', { name: '日本語' })
    fireEvent.pointerDown(japaneseButton, { ...touch, clientY: 300 })
    fireEvent.click(japaneseButton)

    expect(screen.getByTestId('translation-answer')).toHaveTextContent('本日の最優先事項を明確にし')
    expect(screen.getByTestId('translation-answer').querySelector('.masked-translation')).toBeInTheDocument()
  })

  it('navigates between entries with horizontal swipes', async () => {
    await renderApp()

    swipeBy(-80)
    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()

    swipeBy(80)
    expect(screen.getAllByText('1 / 100')[0]).toBeVisible()
  })

  it('reveals an excerpt', async () => {
    await renderApp()
    const excerptButtons = screen.getAllByRole('button', { name: 'Excerpts' })
    fireEvent.click(excerptButtons[0])

    fireEvent.click(screen.getByRole('button', { name: 'Reveal the complete excerpt' }))
    expect(screen.getByText('春眠不觉晓，处处闻啼鸟。')).toBeVisible()
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
    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()

    pullBy(80)

    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()
    expect(window.location.search).toBe('?id=translation%3A1')
  })

  it('leaves the session alone when the pull stops short of the threshold', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))

    pullBy(40)

    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()
  })

  it('keeps taps working while the pull gesture is armed', async () => {
    await renderApp()
    const answer = screen.getByTestId('translation-answer')

    // A tap is a pointer sequence with no travel; it must still reach the button.
    fireEvent.pointerDown(answer, { ...touch, clientY: 300 })
    fireEvent.pointerUp(answer, { ...touch, clientY: 300 })
    fireEvent.click(answer)

    expect(answer.querySelector('.masked-translation')).not.toBeInTheDocument()
  })

  it('swallows the click a pull leaves behind on the card', async () => {
    await renderApp()
    const answer = screen.getByTestId('translation-answer')

    fireEvent.pointerDown(answer, { ...touch, clientY: 300 })
    fireEvent.pointerMove(answer, { ...touch, clientY: 380 })
    fireEvent.pointerUp(answer, { ...touch, clientY: 380 })
    fireEvent.click(answer)

    expect(screen.getByTestId('translation-answer').querySelector('.masked-translation')).toBeInTheDocument()
  })

  it('ignores mouse drags so desktop selection never refreshes the session', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    const shell = document.querySelector('.app-shell') as HTMLElement

    fireEvent.pointerDown(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 0 })
    fireEvent.pointerMove(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 80 })
    fireEvent.pointerUp(shell, { pointerId: 1, isPrimary: true, pointerType: 'mouse', clientY: 80 })

    expect(screen.getAllByText('2 / 100')[0]).toBeVisible()
  })

  it('filters cards to favorites from Study options', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
    fireEvent.click(screen.getByRole('button', { name: /Options/ }))
    fireEvent.click(screen.getByLabelText('Favorites only'))
    expect(screen.getByRole('dialog', { name: 'Study options' })).toBeVisible()
    expect(screen.getAllByText(/1 \/ 1/)[0]).toBeVisible()
  })

  it('reveals a word explanation and its components', async () => {
    await renderApp()
    fireEvent.click(screen.getAllByRole('button', { name: /Words/ })[0])

    expect(screen.getByText('verbatim')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal the word explanation' }))

    expect(screen.getByText(/Definition: Using exactly the same words as the original/)).toBeVisible()
    expect(screen.getByText(/Etymology:/)).toBeVisible()
    expect(screen.getByText(/The witness repeated/)).toBeVisible()
  })

  it('shows a newly created entry immediately', async () => {
    vi.mocked(manageStudyCards)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'new-translation',
        source: '新添加的句子',
        en: 'A newly added sentence',
        ja: '新しく追加された文',
      })
    await renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Manage entries' }))
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock editor' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add translation' }))
    fireEvent.change(screen.getByLabelText('Chinese source'), { target: { value: '新添加的句子' } })
    fireEvent.change(screen.getByLabelText('English translation'), { target: { value: 'A newly added sentence' } })
    fireEvent.change(screen.getByLabelText('Japanese translation'), { target: { value: '新しく追加された文' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Manage study entries' })).not.toBeInTheDocument())
    expect(screen.getByText('新添加的句子')).toBeVisible()
    expect(window.location.search).toBe('?id=new-translation')
  })
})
