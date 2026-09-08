import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Heart,
  LibraryBig,
  LockKeyhole,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { hasValidAdminSession, manageStudyCards, type EditableCard } from './lib/adminCards'
import { useCardPreferences } from './hooks/useCardPreferences'
import { loadStudyCards } from './lib/studyCards'
import type { StudyCard, StudyData } from './types'

/** Furthest the pull indicator travels, so a long drag stops stretching the header. */
const PULL_MAX_DISTANCE = 96
/** Downward travel required to reshuffle the session on release. */
const PULL_REFRESH_THRESHOLD = 72
/** Travel past which the gesture is a drag, not a tap, so the trailing click is swallowed. */
const PULL_TAP_SLOP = 10
/** Horizontal travel required to move between entries. */
const SWIPE_NAVIGATION_THRESHOLD = 56
export function shuffleItems<T>(items: readonly T[]): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = currentItem
  }

  return shuffled
}

function createSessionData(data: StudyData) {
  return shuffleItems(data)
}

function findCardLocation(data: StudyData, cardId: string) {
  return data.findIndex((card) => card.id === cardId)
}

function Logo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

function CardPractice({ card, revealed, onReveal }: { card: StudyCard; revealed: boolean; onReveal: () => void }) {
  return (
    <div className="practice-content">
      <div className="excerpt-heading"><h2>{card.title}</h2></div>
      <button type="button" className={`unified-answer ${revealed ? 'is-revealed' : ''}`} onClick={onReveal}
        aria-label={revealed ? 'Hide content' : 'Reveal content'} aria-expanded={revealed} data-testid="card-answer">
        {revealed ? <span className="unified-content">{card.content}</span> : <span className="reveal-hint">Tap to reveal</span>}
      </button>
    </div>
  )
}

function EmptyCards({ showingFavorites, showingIgnored, showingIgnoredOnly }: { showingFavorites: boolean; showingIgnored: boolean; showingIgnoredOnly: boolean }) {
  return (
    <div className="empty-state">
      <LibraryBig size={28} />
      <h2>{showingFavorites ? 'No favorite entries' : showingIgnoredOnly ? 'No ignored entries' : 'No entries'}</h2>
      <p>{showingFavorites ? 'Turn off “Favorites only” in Study options to see every entry.' : showingIgnoredOnly ? 'Turn off “Ignored only” in Study options to see every entry.' : 'Enable “Show ignored” in Study options to include ignored entries.'}</p>
    </div>
  )
}

function createBlankCard(): EditableCard {
  return { id: '', title: '', content: '' }
}

interface CardEditorProps {
  card: EditableCard
  onCancel: () => void
  onSave: (card: EditableCard) => void
  onDelete: () => void
  saving: boolean
}

function CardEditor({ card, onCancel, onSave, onDelete, saving }: CardEditorProps) {
  const [draft, setDraft] = useState<EditableCard>(card)

  useEffect(() => setDraft(card), [card])

  const update = (field: string, value: string) => {
    setDraft((current) => ({ ...current, [field]: value } as EditableCard))
  }

  const isNew = !draft.id

  return (
    <form className="card-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft) }}>
      <label>Title<textarea required value={draft.title} onChange={(event) => update('title', event.target.value)} /></label>
      <label>Content<textarea required value={draft.content} onChange={(event) => update('content', event.target.value)} /></label>
      <div className="editor-actions">
        {!isNew && <button type="button" className="danger-button" onClick={onDelete} disabled={saving}><Trash2 size={14} /> Delete</button>}
        <span />
        <button type="button" className="text-button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Add entry' : 'Save changes'}</button>
      </div>
    </form>
  )
}

export default function App() {
  const [sessionData, setSessionData] = useState<StudyData>([])
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cardIndex, setCardIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)
  const [ignoredOnly, setIgnoredOnly] = useState(false)
  const [pinnedIgnoredId, setPinnedIgnoredId] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminAuthenticated, setAdminAuthenticated] = useState(hasValidAdminSession)
  const [adminEditing, setAdminEditing] = useState<EditableCard | null>(null)
  const [adminError, setAdminError] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [navigationDirection, setNavigationDirection] = useState<-1 | 1>(1)
  const practiceCardRef = useRef<HTMLElement>(null)
  const pullStartY = useRef<number | null>(null)
  const swipeStartX = useRef<number | null>(null)
  const horizontalSwipeRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const pullDraggedRef = useRef(false)
  const { preferences, toggleFavorite, toggleIgnored } = useCardPreferences()

  const allCards = sessionData
  const getCardId = (card: StudyCard) => card.id
  const cards = allCards.filter((card) => {
    const cardId = getCardId(card)
    const isIgnored = preferences.ignored.includes(cardId)
    return (!ignoredOnly || isIgnored)
      && (showIgnored || !isIgnored || cardId === pinnedIgnoredId)
      && (!showFavorites || preferences.favorites.includes(cardId))
  })
  const currentIndex = Math.min(cardIndex, Math.max(cards.length - 1, 0))
  const currentCard = cards[currentIndex]
  const currentCardId = currentCard ? getCardId(currentCard) : ''

  const openAdmin = (card: EditableCard | null = null) => {
    setAdminOpen(true)
    setAdminError('')
    setAdminEditing(card)
  }

  const verifyAdminPassword = async () => {
    setAdminSaving(true)
    setAdminError('')
    try {
      await manageStudyCards('verify', adminPassword)
      setAdminAuthenticated(true)
      setAdminPassword('')
    } catch {
      setAdminError('Incorrect password or unavailable admin service.')
    } finally {
      setAdminSaving(false)
    }
  }

  const saveAdminCard = async (card: EditableCard) => {
    setAdminSaving(true)
    setAdminError('')
    try {
      const action = card.id ? 'update' : 'create'
      const savedCard = await manageStudyCards(action, adminPassword, card)
      if (!savedCard) throw new Error('No card returned')
      setSessionData((current) => action === 'create'
        ? [...current, savedCard]
        : current.map((item) => item.id === savedCard.id ? savedCard : item))
      setAdminEditing(null)
      if (action === 'create') {
        setShowFavorites(false)
        setIgnoredOnly(false)
        setCardIndex(sessionData.filter((item) => showIgnored || !preferences.ignored.includes(item.id)).length)
        setPinnedIgnoredId(null)
        setRevealed(false)
        setAdminOpen(false)
      }
    } catch {
      setAdminError('Could not save this entry. Check your password and connection.')
    } finally {
      setAdminSaving(false)
    }
  }

  const deleteAdminCard = async () => {
    if (!adminEditing || !window.confirm('Delete this entry permanently?')) return
    setAdminSaving(true)
    setAdminError('')
    try {
      await manageStudyCards('delete', adminPassword, adminEditing)
      setSessionData((current) => current.filter((item) => item.id !== adminEditing.id))
      setRevealed(false)
      setAdminEditing(null)
    } catch {
      setAdminError('Could not delete this entry.')
    } finally {
      setAdminSaving(false)
    }
  }

  const goTo = (direction: -1 | 1) => {
    if (cards.length === 0) return
    const nextCard = cards[(currentIndex + direction + cards.length) % cards.length]
    const nextCards = pinnedIgnoredId
      ? cards.filter((card) => getCardId(card) !== pinnedIgnoredId)
      : cards
    const nextIndex = nextCards.indexOf(nextCard)
    if (nextIndex === -1) return
    setCardIndex(nextIndex)
    setNavigationDirection(direction)
    setPinnedIgnoredId(null)
    setRevealed(false)
  }

  const refreshSession = (data: StudyData = sessionData, selectedCardId = currentCardId) => {
    const nextSession = createSessionData(data)
    const selectedLocation = findCardLocation(nextSession, selectedCardId)
    setSessionData(nextSession)
    const visibleCards = nextSession.filter((card) =>
      (!ignoredOnly || preferences.ignored.includes(card.id))
      && (showIgnored || !preferences.ignored.includes(card.id) || card.id === pinnedIgnoredId)
      && (!showFavorites || preferences.favorites.includes(card.id)))
    setCardIndex(selectedLocation >= 0 ? Math.max(0, visibleCards.findIndex((card) => card.id === selectedCardId)) : 0)
    setRevealed(false)
    pullDistanceRef.current = 0
    setPullDistance(0)
  }

  // Deliberately no setPointerCapture here: capturing on the shell retargets the
  // trailing click to the shell, which stops every button underneath from firing.
  // Touch pointers are implicitly captured to the pointerdown target anyway, so the
  // move and up events still bubble back up to the shell.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.pointerType !== 'touch' || optionsOpen || adminOpen) return
    if ((practiceCardRef.current?.scrollTop ?? 0) > 0) return
    pullStartY.current = event.clientY
    swipeStartX.current = event.clientX
    horizontalSwipeRef.current = false
    pullDraggedRef.current = false
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.pointerType !== 'touch' || pullStartY.current === null) return
    const horizontalDistance = event.clientX - (swipeStartX.current ?? event.clientX)
    const verticalDistance = event.clientY - pullStartY.current
    if (horizontalSwipeRef.current || (Math.abs(horizontalDistance) > Math.abs(verticalDistance) && Math.abs(horizontalDistance) >= PULL_TAP_SLOP)) {
      horizontalSwipeRef.current = true
      pullDraggedRef.current = true
      pullDistanceRef.current = 0
      setPullDistance(0)
      return
    }
    const nextDistance = Math.min(PULL_MAX_DISTANCE, Math.max(0, verticalDistance))
    if (nextDistance >= PULL_TAP_SLOP) pullDraggedRef.current = true
    pullDistanceRef.current = nextDistance
    setPullDistance(nextDistance)
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    const horizontalDistance = event.clientX - (swipeStartX.current ?? event.clientX)
    const verticalDistance = event.clientY - (pullStartY.current ?? event.clientY)
    if (Math.abs(horizontalDistance) > Math.abs(verticalDistance) && Math.abs(horizontalDistance) >= SWIPE_NAVIGATION_THRESHOLD) {
      goTo(horizontalDistance < 0 ? 1 : -1)
    } else if (pullDistanceRef.current >= PULL_REFRESH_THRESHOLD) refreshSession()
    else setPullDistance(0)
    pullStartY.current = null
    swipeStartX.current = null
    horizontalSwipeRef.current = false
    pullDistanceRef.current = 0
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    pullStartY.current = null
    swipeStartX.current = null
    horizontalSwipeRef.current = false
    pullDistanceRef.current = 0
    setPullDistance(0)
  }

  // A pull that ends over a button would otherwise reveal or rate the freshly
  // shuffled card, so swallow the click the drag leaves behind.
  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!pullDraggedRef.current) return
    pullDraggedRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (adminOpen || optionsOpen || (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, [contenteditable]'))) return
      if (event.code === 'Space' && currentCard) {
        event.preventDefault()
        setRevealed(true)
      }
      if (event.key === 'ArrowLeft') goTo(-1)
      if (event.key === 'ArrowRight') goTo(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    let cancelled = false

    void loadStudyCards()
      .then((data) => {
        if (!cancelled) {
          const requestedCardId = new URL(window.location.href).searchParams.get('id') ?? ''
          const nextSession = createSessionData(data)
          const requestedLocation = findCardLocation(nextSession, requestedCardId)
          setSessionData(nextSession)
          if (requestedLocation >= 0) {
            const visibleCards = nextSession.filter((card) => !preferences.ignored.includes(card.id) || card.id === requestedCardId)
            setCardIndex(visibleCards.findIndex((card) => card.id === requestedCardId))
            setPinnedIgnoredId(requestedCardId)
          }
          setIsLoading(false)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error : new Error('Could not connect to Supabase.'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isLoading || !currentCardId) return
    const url = new URL(window.location.href)
    url.searchParams.set('id', currentCardId)
    window.history.replaceState(null, '', url)
  }, [currentCardId, isLoading])

  useEffect(() => {
    if (practiceCardRef.current) practiceCardRef.current.scrollTop = 0
  }, [currentCardId])

  if (loadError) throw loadError

  const cardLabel = useMemo(
    () => cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : '0 / 0',
    [currentIndex, cards.length],
  )

  return (
    <div
      className="app-shell"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      <div className={`pull-refresh ${pullDistance >= PULL_REFRESH_THRESHOLD ? 'is-ready' : ''}`} style={{ transform: `translate(-50%, ${pullDistance - 42}px)` }} aria-hidden="true">
        <RefreshCw size={16} /> <span>{pullDistance >= PULL_REFRESH_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      <header className="mobile-header">
        <a className="brand" href="./" aria-label="TK home">
          <Logo />
          <span>TK</span>
        </a>
        <span className="mobile-count">{cardLabel}</span>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <a className="brand" href="./" aria-label="TK home">
            <Logo />
            <span>TK</span>
          </a>
          <div className="sidebar-intro">
            <p>Quiet study,</p>
            <p>one card at a time.</p>
          </div>
          <p className="sidebar-footer">No streaks. No noise.<br />Just something worth remembering.</p>
        </aside>

        <main>
          <div className="study-toolbar">
            <div className="toolbar-controls">
              <button className="options-button" type="button" onClick={() => setOptionsOpen(true)} aria-haspopup="dialog">
                <SlidersHorizontal size={15} /> Options
              </button>
                <button className="options-button" type="button" onClick={() => openAdmin()} aria-haspopup="dialog">
                  <LockKeyhole size={15} /> Manage entries
                </button>
              <span className="desktop-count">{cardLabel}</span>
            </div>
          </div>

          <section ref={practiceCardRef} className={`practice-card ${!currentCard ? 'is-empty' : ''}`} aria-live="polite">
            {isLoading ? (
              <div className="empty-state" role="status">Loading entries…</div>
            ) : !currentCard ? (
              <EmptyCards showingFavorites={showFavorites} showingIgnored={showIgnored} showingIgnoredOnly={ignoredOnly} />
            ) : (
              <div key={currentCardId} className={`card-transition card-transition-${navigationDirection === 1 ? 'next' : 'previous'}`}>
                <CardPractice card={currentCard} revealed={revealed} onReveal={() => setRevealed((current) => !current)} />
              </div>
            )}
          </section>

          {currentCard && (
              <div className="practice-actions">
                <button className="icon-button" type="button" onClick={() => goTo(-1)} aria-label="Previous card">
                  <ArrowLeft size={20} />
                </button>
                <div className="entry-actions entry-actions-inline">
                  <button type="button" className={preferences.favorites.includes(currentCardId) ? 'active' : ''} aria-pressed={preferences.favorites.includes(currentCardId)} onClick={() => toggleFavorite(currentCardId)}>
                    <Heart size={15} fill={preferences.favorites.includes(currentCardId) ? 'currentColor' : 'none'} />
                    {preferences.favorites.includes(currentCardId) ? 'Favorited' : 'Favorite'}
                  </button>
                  <button type="button" className={preferences.ignored.includes(currentCardId) ? 'active' : ''} aria-pressed={preferences.ignored.includes(currentCardId)} onClick={() => {
                    const wasIgnored = preferences.ignored.includes(currentCardId)
                    toggleIgnored(currentCardId)
                    setPinnedIgnoredId(wasIgnored ? null : currentCardId)
                  }}>
                    <Ban size={15} /> {preferences.ignored.includes(currentCardId) ? 'Ignored' : 'Ignore'}
                  </button>
                      <button type="button" onClick={() => openAdmin(currentCard)}><Pencil size={15} /> Edit</button>
                </div>
                <button className="icon-button" type="button" onClick={() => goTo(1)} aria-label="Next card">
                  <ArrowRight size={20} />
                </button>
              </div>
          )}
        </main>

        {optionsOpen && (
          <div className="options-backdrop" role="presentation" onClick={() => setOptionsOpen(false)}>
            <section className="options-dialog" role="dialog" aria-modal="true" aria-labelledby="options-title" onClick={(event) => event.stopPropagation()}>
              <div className="options-heading">
                <div>
                  <p className="section-label">Study</p>
                  <h2 id="options-title">Study options</h2>
                </div>
                <button type="button" className="text-button" onClick={() => setOptionsOpen(false)}>Done</button>
              </div>
              <label>
                <input type="checkbox" checked={showFavorites} onChange={(event) => setShowFavorites(event.target.checked)} />
                Favorites only
              </label>
              <label>
                <input type="checkbox" checked={ignoredOnly} onChange={(event) => setIgnoredOnly(event.target.checked)} />
                Ignored only
              </label>
              <label>
                <input type="checkbox" checked={showIgnored} onChange={(event) => setShowIgnored(event.target.checked)} />
                Show ignored
              </label>
            </section>
          </div>
        )}

        {adminOpen && (
          <div className="options-backdrop" role="presentation" onClick={() => setAdminOpen(false)}>
            <section className="options-dialog admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(event) => event.stopPropagation()}>
              <div className="options-heading">
                <div>
                  <p className="section-label">Admin</p>
                  <h2 id="admin-title">Manage study entries</h2>
                </div>
                <button type="button" className="text-button" onClick={() => setAdminOpen(false)}>Done</button>
              </div>
              {!adminAuthenticated ? (
                <form className="admin-login" onSubmit={(event) => { event.preventDefault(); void verifyAdminPassword() }}>
                  <p>Enter the editor password to add, change, or delete entries.</p>
                  <label>Password<input type="password" autoFocus required value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>
                  {adminError && <p className="admin-error" role="alert">{adminError}</p>}
                  <button type="submit" className="primary-button" disabled={adminSaving}>{adminSaving ? 'Checking…' : 'Unlock editor'}</button>
                </form>
              ) : adminEditing ? (
                <>
                  {adminError && <p className="admin-error" role="alert">{adminError}</p>}
                  <CardEditor card={adminEditing} onCancel={() => setAdminEditing(null)} onSave={saveAdminCard} onDelete={deleteAdminCard} saving={adminSaving} />
                </>
              ) : (
                <div className="admin-menu">
                  <p>Add an entry, or use Edit on the current card.</p>
                  {adminError && <p className="admin-error" role="alert">{adminError}</p>}
                  <button type="button" className="secondary-button" onClick={() => setAdminEditing(createBlankCard())}>Add entry</button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
