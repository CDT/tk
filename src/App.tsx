import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Ban,
  Check,
  Heart,
  Languages,
  LibraryBig,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { studyData } from './data'
import { useStudyProgress } from './hooks/useStudyProgress'
import { useCardPreferences } from './hooks/useCardPreferences'
import type {
  ExcerptCard,
  ExcerptCollection,
  StudyMode,
  TargetLanguage,
  TranslationCard,
  TranslationCollection,
} from './types'

const languageLabels: Record<TargetLanguage, string> = {
  en: 'English',
  ja: '日本語',
}

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

function createSessionData() {
  return {
    translationCollections: studyData.translationCollections.map((collection) => ({
      ...collection,
      cards: shuffleItems(collection.cards),
    })),
    excerptCollections: studyData.excerptCollections.map((collection) => ({
      ...collection,
      cards: shuffleItems(collection.cards),
    })),
  }
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

interface TranslationPracticeProps {
  card: TranslationCard
  language: TargetLanguage
  revealed: boolean
  onReveal: () => void
}

function TranslationPractice({ card, language, revealed, onReveal }: TranslationPracticeProps) {
  return (
    <div className="practice-content">
      <div className="source-block">
        <p className="source-text business-source" lang="zh-CN">{card.source}</p>
        <p className="source-note">{card.note}</p>
      </div>

      <div className="divider"><span>translate</span></div>

      <button
        type="button"
        className={`answer-area ${revealed ? 'is-revealed' : ''}`}
        onClick={onReveal}
        aria-label={revealed ? undefined : 'Reveal the complete translation'}
        data-testid="translation-answer"
      >
        <p lang={language}>
          <span className={!revealed ? 'masked-translation' : undefined}>
            {card.translations[language].text}
          </span>
        </p>
        {!revealed && <span className="reveal-hint">Tap to reveal the full translation</span>}
      </button>
    </div>
  )
}

interface ExcerptPracticeProps {
  card: ExcerptCard
  revealed: boolean
  onReveal: () => void
}

function ExcerptPractice({ card, revealed, onReveal }: ExcerptPracticeProps) {
  return (
    <div className="practice-content">
      <div className="excerpt-heading">
        <span>{card.dynasty} · {card.note}</span>
        <h2>{card.title}</h2>
        <p>{card.author}</p>
      </div>

      <button
        type="button"
        className={`excerpt-answer ${revealed ? 'is-revealed' : ''}`}
        onClick={onReveal}
        aria-label={revealed ? undefined : 'Reveal the complete excerpt'}
      >
        {revealed ? (
          <div className="poem-lines" lang="zh-CN">
            {card.lines.map((line) => <p key={line}>{line}</p>)}
          </div>
        ) : (
          <>
            <div className="keyword-cloud" lang="zh-CN">
              {card.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
            </div>
            <span className="reveal-hint">Use the keywords, then tap to reveal</span>
          </>
        )}
      </button>
    </div>
  )
}

function EmptyCollection({ showingFavorites, showingIgnored }: { showingFavorites: boolean; showingIgnored: boolean }) {
  return (
    <div className="empty-collection">
      <LibraryBig size={28} />
      <h2>{showingFavorites ? 'No favorites in this collection' : showingIgnored ? 'No entries in this collection' : 'All entries are ignored'}</h2>
      <p>{showingFavorites ? 'Turn off “Favorites only” in Study options to see every entry.' : showingIgnored ? 'Choose another collection to keep studying.' : 'Enable “Show ignored entries” in Study options to restore an entry.'}</p>
    </div>
  )
}

export default function App() {
  const [sessionData, setSessionData] = useState(createSessionData)
  const [mode, setMode] = useState<StudyMode>('translation')
  const [language, setLanguage] = useState<TargetLanguage>('en')
  const [collectionIndices, setCollectionIndices] = useState<Record<StudyMode, number>>({ translation: 0, excerpt: 0 })
  const [cardIndices, setCardIndices] = useState<Record<StudyMode, number>>({ translation: 0, excerpt: 0 })
  const [revealed, setRevealed] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const pullStartY = useRef<number | null>(null)
  const pullDistanceRef = useRef(0)
  const { rate } = useStudyProgress()
  const { preferences, toggleFavorite, toggleIgnored } = useCardPreferences()

  const collections = mode === 'translation'
    ? sessionData.translationCollections
    : sessionData.excerptCollections
  const collection = collections[collectionIndices[mode]] as TranslationCollection | ExcerptCollection | undefined
  const allCards = collection?.cards ?? []
  const cards = allCards.filter((card) => {
    const cardId = `${mode}:${collection?.id}:${card.id}`
    return (showIgnored || !preferences.ignored.includes(cardId))
      && (!showFavorites || preferences.favorites.includes(cardId))
  })
  const currentIndex = Math.min(cardIndices[mode], Math.max(cards.length - 1, 0))
  const currentCard = cards[currentIndex]
  const currentCardId = collection && currentCard ? `${mode}:${collection.id}:${currentCard.id}` : ''

  const goTo = (direction: -1 | 1) => {
    if (cards.length === 0) return
    setCardIndices((current) => ({
      ...current,
      [mode]: (currentIndex + direction + cards.length) % cards.length,
    }))
    setRevealed(false)
  }

  const changeMode = (nextMode: StudyMode) => {
    setMode(nextMode)
    setRevealed(false)
  }

  const refreshSession = () => {
    setSessionData(createSessionData())
    setCardIndices({ translation: 0, excerpt: 0 })
    setRevealed(false)
    pullDistanceRef.current = 0
    setPullDistance(0)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.pointerType !== 'touch') return
    pullStartY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.pointerType !== 'touch' || pullStartY.current === null) return
    const nextDistance = Math.min(96, Math.max(0, event.clientY - pullStartY.current))
    pullDistanceRef.current = nextDistance
    setPullDistance(nextDistance)
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    if (pullDistanceRef.current >= 72) refreshSession()
    else setPullDistance(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    pullStartY.current = null
    pullDistanceRef.current = 0
  }

  const changeCollection = (index: number) => {
    setCollectionIndices((current) => ({ ...current, [mode]: index }))
    setCardIndices((current) => ({ ...current, [mode]: 0 }))
    setRevealed(false)
  }

  const submitRating = (remembered: boolean) => {
    if (!collection || !currentCard) return
    rate(currentCardId, remembered)
    goTo(1)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLSelectElement) return
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
      onPointerCancel={handlePointerEnd}
    >
      <div className={`pull-refresh ${pullDistance >= 72 ? 'is-ready' : ''}`} style={{ transform: `translate(-50%, ${pullDistance - 42}px)` }} aria-hidden="true">
        <RefreshCw size={16} /> <span>{pullDistance >= 72 ? 'Release to refresh' : 'Pull to refresh'}</span>
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
            <p>one sentence at a time.</p>
          </div>
          <nav aria-label="Study modes">
            <button
              type="button"
              className={mode === 'translation' ? 'active' : ''}
              onClick={() => changeMode('translation')}
            >
              <Languages size={19} />
              <span><strong>Translation</strong><small>{sessionData.translationCollections.length} collections · 中 → EN / 日本語</small></span>
            </button>
            <button
              type="button"
              className={mode === 'excerpt' ? 'active' : ''}
              onClick={() => changeMode('excerpt')}
            >
              <BookOpenText size={19} />
              <span><strong>Excerpts</strong><small>{sessionData.excerptCollections.length} collections · 诗词与古文</small></span>
            </button>
          </nav>
          <p className="sidebar-footer">No streaks. No noise.<br />Just something worth remembering.</p>
        </aside>

        <main>
          <div className="mobile-mode-tabs" aria-label="Study modes">
            <button className={mode === 'translation' ? 'active' : ''} onClick={() => changeMode('translation')}>Translation</button>
            <button className={mode === 'excerpt' ? 'active' : ''} onClick={() => changeMode('excerpt')}>Excerpts</button>
          </div>

          <div className="study-toolbar">
            {collections.length > 0 ? (
              <label className="collection-picker">
                <span>Collection</span>
                <select
                  value={collectionIndices[mode]}
                  onChange={(event) => changeCollection(Number(event.target.value))}
                  aria-label="Collection"
                >
                  {collections.map((item, index) => (
                    <option key={item.id} value={index}>{item.title} · {item.cards.length}</option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="no-collection-label">No collection selected</span>
            )}

            <div className="toolbar-controls">
              {mode === 'translation' && (
                <div className="language-switcher" aria-label="Translation language">
                  {(Object.keys(languageLabels) as TargetLanguage[]).map((key) => (
                    <button
                      type="button"
                      key={key}
                      className={language === key ? 'active' : ''}
                      onClick={() => { setLanguage(key); setRevealed(false) }}
                    >
                      {languageLabels[key]}
                    </button>
                  ))}
                </div>
              )}
              <button className="options-button" type="button" onClick={() => setOptionsOpen(true)} aria-haspopup="dialog">
                <SlidersHorizontal size={15} /> Options
              </button>
              <span className="desktop-count">{cardLabel}</span>
            </div>
          </div>

          {collection && (
            <div className="collection-meta">
              <span>{collection.subtitle}</span>
              {'levels' in collection && collection.levels.map((level) => <em key={level}>{level}</em>)}
            </div>
          )}

          <section className={`practice-card ${!currentCard ? 'is-empty' : ''}`} aria-live="polite">
            {!currentCard ? (
              <EmptyCollection showingFavorites={showFavorites} showingIgnored={showIgnored} />
            ) : mode === 'translation' ? (
              <TranslationPractice
                card={currentCard as TranslationCard}
                language={language}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
              />
            ) : (
              <ExcerptPractice
                card={currentCard as ExcerptCard}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
              />
            )}
          </section>

          {currentCard && (
              <div className="practice-actions">
                <button className="icon-button" type="button" onClick={() => goTo(-1)} aria-label="Previous card">
                  <ArrowLeft size={20} />
                </button>
                {revealed ? (
                  <div className="rating-actions">
                    <button className="secondary-button" type="button" onClick={() => submitRating(false)}>
                      <RotateCcw size={17} /> Review again
                    </button>
                    <button className="primary-button" type="button" onClick={() => submitRating(true)}>
                      <Check size={18} /> Remembered
                    </button>
                  </div>
                ) : (
                  <div className="entry-actions entry-actions-inline">
                    <button type="button" className={preferences.favorites.includes(currentCardId) ? 'active' : ''} aria-pressed={preferences.favorites.includes(currentCardId)} onClick={() => toggleFavorite(currentCardId)}>
                      <Heart size={15} fill={preferences.favorites.includes(currentCardId) ? 'currentColor' : 'none'} />
                      {preferences.favorites.includes(currentCardId) ? 'Favorited' : 'Favorite'}
                    </button>
                    <button type="button" className={preferences.ignored.includes(currentCardId) ? 'active' : ''} aria-pressed={preferences.ignored.includes(currentCardId)} onClick={() => {
                      const wasIgnored = preferences.ignored.includes(currentCardId)
                      toggleIgnored(currentCardId)
                      if (!wasIgnored) goTo(1)
                    }}>
                      <Ban size={15} /> {preferences.ignored.includes(currentCardId) ? 'Restore entry' : 'Ignore entry'}
                    </button>
                  </div>
                )}
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
                <input type="checkbox" checked={showIgnored} onChange={(event) => setShowIgnored(event.target.checked)} />
                Show ignored entries
              </label>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
