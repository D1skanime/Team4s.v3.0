'use client'

// AnimeCreateTagField: dedicated tags card for the create metadata section.
// Mirrors AnimeCreateGenreField in structure and CSS tokens so both token
// surfaces feel visually equal while remaining independently editable.

import type { TagToken } from '@/types/admin'

import styles from '../../../admin.module.css'

interface AnimeCreateTagFieldProps {
  draft: string
  selectedTokens: string[]
  suggestions: TagToken[]
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

export function AnimeCreateTagField({
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
}: AnimeCreateTagFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="create-tag">Tags</label>
      <div aria-label="Ausgewaehlte Tags">
        {selectedTokens.length > 0 ? (
          <div className={styles.chipRow}>
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
          <p className={styles.hint}>Noch keine Tags gesetzt.</p>
        )}
      </div>

      <div className={styles.inputRow}>
        <input
          id="create-tag"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          disabled={isSubmitting}
          placeholder="z. B. Klassiker, Mecha, Schulalltag"
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

      {isLoading ? (
        <p className={styles.hint}>Tag-Vorschlaege werden geladen...</p>
      ) : null}
      {error ? (
        <p className={styles.hint}>
          Hinweis: Tag-Vorschlaege konnten nicht vollstaendig geladen werden.
        </p>
      ) : null}
      <div aria-label="Tag Vorschlaege">
        {!isLoading && suggestions.length > 0 ? (
          <>
            <p className={styles.hint}>
              Vorschlaege: {suggestions.length}/{suggestionsTotal} (geladen:{' '}
              {loadedTokenCount})
            </p>
            <div className={styles.chipBox}>
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
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={!canLoadMore || isSubmitting}
                onClick={onIncreaseLimit}
              >
                Mehr
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={!canResetLimit || isSubmitting}
                onClick={onResetLimit}
              >
                Weniger
              </button>
            </div>
          </>
        ) : null}
      </div>
      <p className={styles.hint}>
        Tip: Komma getrennt eingeben; Klick auf Vorschlag fuegt den Tag hinzu.
      </p>
    </div>
  )
}
