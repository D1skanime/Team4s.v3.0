'use client'

import type { GenreToken } from '@/types/admin'

import styles from '../../../admin.module.css'

interface AnimeCreateGenreFieldProps {
  draft: string
  selectedTokens: string[]
  suggestions: GenreToken[]
  suggestionsTotal: number
  loadedTokenCount: number
  isLoading: boolean
  error: string | null
  isSubmitting: boolean
  canLoadMore: boolean
  canResetLimit: boolean
  onDraftChange: (value: string) => void
  onAddDraft: () => void
  onRemoveToken: (name: string) => void
  onAddSuggestion: (name: string) => void
  onIncreaseLimit: () => void
  onResetLimit: () => void
}

export function AnimeCreateGenreField({
  draft,
  selectedTokens,
  suggestions,
  suggestionsTotal,
  loadedTokenCount,
  isLoading,
  error,
  isSubmitting,
  canLoadMore,
  canResetLimit,
  onDraftChange,
  onAddDraft,
  onRemoveToken,
  onAddSuggestion,
  onIncreaseLimit,
  onResetLimit,
}: AnimeCreateGenreFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="create-genre">Genre</label>
      {selectedTokens.length > 0 ? (
        <div className={styles.chipRow} aria-label="Ausgewaehlte Genres">
          {selectedTokens.map((token) => (
            <button
              key={token}
              type="button"
              className={`${styles.chip} ${styles.chipActive}`}
              onClick={() => onRemoveToken(token)}
              disabled={isSubmitting}
              title="Klicken zum Entfernen"
            >
              {token} x
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.hint}>Noch keine Genres gesetzt.</p>
      )}

      <div className={styles.inputRow}>
        <input
          id="create-genre"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          disabled={isSubmitting}
          placeholder="z. B. Action, Drama"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAddDraft()
            }
          }}
        />
        <button
          type="button"
          className={styles.buttonSecondary}
          disabled={isSubmitting || draft.trim().length === 0}
          onClick={onAddDraft}
        >
          Hinzufuegen
        </button>
      </div>

      {isLoading ? <p className={styles.hint}>Genre-Vorschlaege werden geladen...</p> : null}
      {error ? <p className={styles.hint}>Hinweis: {error}</p> : null}
      {!isLoading && suggestions.length > 0 ? (
        <>
          <p className={styles.hint}>
            Vorschlaege: {suggestions.length}/{suggestionsTotal} (geladen: {loadedTokenCount})
          </p>
          <div className={styles.chipBox} aria-label="Genre Vorschlaege">
            <div className={styles.chipRow}>
              {suggestions.map((token) => (
                <button
                  key={token.name}
                  type="button"
                  className={styles.chip}
                  onClick={() => onAddSuggestion(token.name)}
                  disabled={isSubmitting}
                  title={`+ ${token.name} (x${token.count})`}
                >
                  {token.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonSecondary} disabled={!canLoadMore || isSubmitting} onClick={onIncreaseLimit}>
              Mehr
            </button>
            <button type="button" className={styles.buttonSecondary} disabled={!canResetLimit || isSubmitting} onClick={onResetLimit}>
              Weniger
            </button>
          </div>
        </>
      ) : null}
      <p className={styles.hint}>Tip: Komma getrennt eingeben; Klick auf Vorschlag fuegt es hinzu.</p>
    </div>
  )
}
