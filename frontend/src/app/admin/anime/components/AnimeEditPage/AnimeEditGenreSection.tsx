'use client'

import type { KeyboardEvent } from 'react'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

interface GenreSuggestion {
  name: string
  count: number
}

interface AnimeEditGenreSectionProps {
  genreTokens: string[]
  genreDraft: string
  isSubmitting: boolean
  clearGenre: boolean
  genreResults: GenreSuggestion[]
  isLoadingGenres: boolean
  genreError: string | null
  isDropdownOpen: boolean
  activeGenreIndex: number
  onGenreDraftChange: (value: string) => void
  onGenreKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onGenreFocus: () => void
  onGenreBlur: () => void
  onRetry: () => void
  onRemoveToken: (token: string) => void
  onApplyToken: (token: string) => void
}

export function AnimeEditGenreSection({
  genreTokens,
  genreDraft,
  isSubmitting,
  clearGenre,
  genreResults,
  isLoadingGenres,
  genreError,
  isDropdownOpen,
  activeGenreIndex,
  onGenreDraftChange,
  onGenreKeyDown,
  onGenreFocus,
  onGenreBlur,
  onRetry,
  onRemoveToken,
  onApplyToken,
}: AnimeEditGenreSectionProps) {
  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Genres</h2>
          <p className={styles.sectionMeta}>Tag-Input mit Autocomplete aus den vorhandenen DB-Werten.</p>
        </div>
      </div>
      <div className={workspaceStyles.tagSection}>
        <div className={workspaceStyles.chipWrap}>
          {genreTokens.length > 0 ? (
            genreTokens.map((token) => (
              <button
                key={token}
                type="button"
                className={workspaceStyles.chip}
                onClick={() => onRemoveToken(token)}
                disabled={isSubmitting || clearGenre}
              >
                <span>{token}</span>
                <span className={workspaceStyles.chipRemove}>x</span>
              </button>
            ))
          ) : (
            <p className={workspaceStyles.helperText}>Noch keine Genres gesetzt.</p>
          )}
        </div>

        <div className={workspaceStyles.tagInputShell}>
          <input
            className={styles.input}
            value={genreDraft}
            onChange={(event) => onGenreDraftChange(event.target.value)}
            onKeyDown={onGenreKeyDown}
            onFocus={onGenreFocus}
            onBlur={onGenreBlur}
            disabled={isSubmitting || clearGenre}
            placeholder="Genre tippen und mit Enter oder Komma hinzufuegen"
          />
          {isDropdownOpen ? (
            <div className={workspaceStyles.tagDropdown}>
              {isLoadingGenres ? <p className={workspaceStyles.dropdownState}>Genres werden geladen...</p> : null}
              {!isLoadingGenres && genreError ? (
                <>
                  <p className={workspaceStyles.dropdownState}>{genreError}</p>
                  <button
                    type="button"
                    className={workspaceStyles.tagRetry}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onRetry()
                    }}
                  >
                    Retry
                  </button>
                </>
              ) : null}
              {!isLoadingGenres && !genreError && genreResults.length === 0 ? (
                <p className={workspaceStyles.dropdownState}>Keine Treffer.</p>
              ) : null}
              {!isLoadingGenres && !genreError
                ? genreResults.map((item, index) => (
                    <button
                      key={item.name}
                      type="button"
                      className={`${workspaceStyles.tagOption} ${index === activeGenreIndex ? workspaceStyles.tagOptionActive : ''}`}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        onApplyToken(item.name)
                      }}
                    >
                      <span>{item.name}</span>
                      <span className={workspaceStyles.tagOptionMeta}>x{item.count}</span>
                    </button>
                  ))
                : null}
            </div>
          ) : null}
        </div>

        <p className={workspaceStyles.helperText}>Duplikate werden verhindert. Backspace entfernt das letzte Tag.</p>
      </div>
    </section>
  )
}
