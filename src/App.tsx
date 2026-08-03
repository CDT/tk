import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  Languages,
  LibraryBig,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { studyData } from './data'
import { useStudyProgress } from './hooks/useStudyProgress'
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

function Logo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

interface ProgressPanelProps {
  reviewed: number
  remembered: number
  total: number
  onReset: () => void
}

function ProgressPanel({ reviewed, remembered, total, onReset }: ProgressPanelProps) {
  const percentage = total === 0 ? 0 : Math.round((reviewed / total) * 100)
  const accuracy = reviewed === 0 ? 0 : Math.round((remembered / reviewed) * 100)

  return (
    <aside className="progress-panel" aria-label="Collection progress">
      <p className="section-label">Collection progress</p>
      <div className="progress-ring" style={{ '--progress': `${percentage * 3.6}deg` } as React.CSSProperties}>
        <div>
          <strong>{reviewed}</strong>
          <span>of {total}</span>
        </div>
      </div>
      <div className="progress-copy">
        <strong>{reviewed === 0 ? 'Ready when you are' : `${accuracy}% remembered`}</strong>
        <span>{reviewed === total && total > 0 ? 'Collection complete. Nicely done.' : 'A few deliberate sentences at a time.'}</span>
      </div>
      {reviewed > 0 && (
        <button className="text-button" type="button" onClick={onReset}>
          <RotateCcw size={14} /> Reset all progress
        </button>
      )}
      <div className="shortcut-card">
        <Sparkles size={18} />
        <div>
          <strong>Keyboard friendly</strong>
          <span>Space to reveal · arrows to move</span>
        </div>
      </div>
    </aside>
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

function EmptyCollection() {
  return (
    <div className="empty-collection">
      <LibraryBig size={28} />
      <h2>No excerpt collection yet</h2>
      <p>The collection structure is ready. The first excerpt set will contain 100 passages built around one clearly defined theme.</p>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState<StudyMode>('translation')
  const [language, setLanguage] = useState<TargetLanguage>('en')
  const [collectionIndices, setCollectionIndices] = useState<Record<StudyMode, number>>({ translation: 0, excerpt: 0 })
  const [cardIndices, setCardIndices] = useState<Record<StudyMode, number>>({ translation: 0, excerpt: 0 })
  const [revealed, setRevealed] = useState(false)
  const { progress, rate, reset } = useStudyProgress()

  const collections = mode === 'translation'
    ? studyData.translationCollections
    : studyData.excerptCollections
  const collection = collections[collectionIndices[mode]] as TranslationCollection | ExcerptCollection | undefined
  const cards = collection?.cards ?? []
  const currentIndex = Math.min(cardIndices[mode], Math.max(cards.length - 1, 0))
  const currentCard = cards[currentIndex]
  const progressPrefix = collection ? `${mode}:${collection.id}:` : ''
  const reviewedInCollection = progress.reviewed.filter((id) => progressPrefix !== '' && id.startsWith(progressPrefix))
  const rememberedInCollection = progress.remembered.filter((id) => progressPrefix !== '' && id.startsWith(progressPrefix))

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

  const changeCollection = (index: number) => {
    setCollectionIndices((current) => ({ ...current, [mode]: index }))
    setCardIndices((current) => ({ ...current, [mode]: 0 }))
    setRevealed(false)
  }

  const submitRating = (remembered: boolean) => {
    if (!collection || !currentCard) return
    rate(`${mode}:${collection.id}:${currentCard.id}`, remembered)
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
    <div className="app-shell">
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
              <span><strong>Translation</strong><small>{studyData.translationCollections.length} collection · 中 → EN / 日本語</small></span>
            </button>
            <button
              type="button"
              className={mode === 'excerpt' ? 'active' : ''}
              onClick={() => changeMode('excerpt')}
            >
              <BookOpenText size={19} />
              <span><strong>Excerpts</strong><small>{studyData.excerptCollections.length} collection · 诗词与古文</small></span>
            </button>
          </nav>
          <p className="sidebar-footer">No streaks. No noise.<br />Just something worth remembering.</p>
        </aside>

        <main>
          <div className="main-heading">
            <div>
              <p className="section-label">Practice</p>
              <h1>{mode === 'translation' ? 'Build the sentence' : 'Recall the passage'}</h1>
              <p>{mode === 'translation' ? 'Reconstruct precise, natural business language.' : 'Let a handful of words bring the whole piece back.'}</p>
            </div>
            <span className="desktop-count">{cardLabel}</span>
          </div>

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
          </div>

          {collection && (
            <div className="collection-meta">
              <span>{collection.subtitle}</span>
              {'levels' in collection && collection.levels.map((level) => <em key={level}>{level}</em>)}
            </div>
          )}

          <section className={`practice-card ${!currentCard ? 'is-empty' : ''}`} aria-live="polite">
            {!currentCard ? (
              <EmptyCollection />
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
                <button className="primary-button reveal-button" type="button" onClick={() => setRevealed(true)}>
                  Reveal answer
                </button>
              )}
              <button className="icon-button" type="button" onClick={() => goTo(1)} aria-label="Next card">
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </main>

        <ProgressPanel
          reviewed={reviewedInCollection.length}
          remembered={rememberedInCollection.length}
          total={cards.length}
          onReset={reset}
        />
      </div>
    </div>
  )
}
