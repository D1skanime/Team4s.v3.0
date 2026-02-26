import { KeyboardEvent } from 'react'

import { AnimePatchClearFlags, AnimePatchValues } from '../../types/admin-anime'
import styles from '../../../admin.module.css'

interface GenreSuggestion {
  name: string
  count: number
}

interface AnimeMetaFieldsProps {
  values: AnimePatchValues
  clearFlags: AnimePatchClearFlags
  isSubmitting: boolean
  genreSuggestions: GenreSuggestion[]
  genreSuggestionsTotal: number
  loadedGenreCount: number
  isLoadingGenreTokens: boolean
  genreTokensError: string | null
  genreSuggestionLimit: number
  onFieldChange: (field: keyof AnimePatchValues, value: string) => void
  onClearFlagChange: (field: keyof AnimePatchClearFlags, value: boolean) => void
  onAddGenreToken: (token: string) => void
  onRemoveGenreToken: (token: string) => void
  onGenreSuggestionLimitChange: (next: number) => void
}

export function AnimeMetaFields({
  values,
  clearFlags,
  isSubmitting,
  genreSuggestions,
  genreSuggestionsTotal,
  loadedGenreCount,
  isLoadingGenreTokens,
  genreTokensError,
  genreSuggestionLimit,
  onFieldChange,
  onClearFlagChange,
  onAddGenreToken,
  onRemoveGenreToken,
  onGenreSuggestionLimitChange,
}: AnimeMetaFieldsProps) {
  const groupedSuggestions = genreSuggestions.reduce<Record<string, GenreSuggestion[]>>((acc, token) => {
    const first = token.name.trim().charAt(0).toUpperCase()
    const key = /[A-F]/.test(first) ? 'A-F' : /[G-M]/.test(first) ? 'G-M' : /[N-T]/.test(first) ? 'N-T' : 'U-Z/0-9'
    if (!acc[key]) acc[key] = []
    acc[key].push(token)
    return acc
  }, {})

  const onGenreInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onAddGenreToken(values.genreDraft)
    onFieldChange('genreDraft', '')
  }

  return (
    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor="update-genre">Genre</label>
        {values.genreTokens.length > 0 ? (
          <div className={styles.chipRow} aria-label="Ausgewaehlte Genres">
            {values.genreTokens.map((token) => (
              <button
                key={token}
                type="button"
                className={`${styles.chip} ${styles.chipActive}`}
                onClick={() => onRemoveGenreToken(token)}
                disabled={isSubmitting || clearFlags.genre}
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
            id="update-genre"
            value={values.genreDraft}
            onChange={(event) => onFieldChange('genreDraft', event.target.value)}
            disabled={isSubmitting || clearFlags.genre}
            placeholder="Genre hinzufuegen (Komma getrennt)"
            onKeyDown={onGenreInputKeyDown}
          />
          <button
            type="button"
            className={styles.buttonSecondary}
            disabled={isSubmitting || clearFlags.genre || values.genreDraft.trim().length === 0}
            onClick={() => {
              onAddGenreToken(values.genreDraft)
              onFieldChange('genreDraft', '')
            }}
          >
            Hinzufuegen
          </button>
        </div>

        {isLoadingGenreTokens ? <p className={styles.hint}>Genre-Vorschlaege werden geladen...</p> : null}
        {genreTokensError ? <p className={styles.hint}>Hinweis: {genreTokensError}</p> : null}
        {!isLoadingGenreTokens && !clearFlags.genre && genreSuggestions.length > 0 ? (
          <>
            <p className={styles.hint}>
              Vorschlaege: {genreSuggestions.length}/{genreSuggestionsTotal} (geladen: {loadedGenreCount})
            </p>
            <div className={styles.genreSuggestionBox} aria-label="Genre Vorschlaege">
              {Object.entries(groupedSuggestions).map(([group, tokens]) => (
                <div key={group} className={styles.genreSuggestionGroup}>
                  <p className={styles.genreSuggestionGroupTitle}>{group}</p>
                  <div className={styles.genreSuggestionList}>
                    {tokens.map((token) => (
                      <button
                        key={`${group}-${token.name}`}
                        type="button"
                        className={styles.genreSuggestionItem}
                        onClick={() => onAddGenreToken(token.name)}
                        disabled={isSubmitting || clearFlags.genre}
                        title={`+ ${token.name} (x${token.count})`}
                      >
                        <span>{token.name}</span>
                        <span className={styles.genreSuggestionCount}>x{token.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={isSubmitting || clearFlags.genre || genreSuggestionLimit >= 1000}
                onClick={() => onGenreSuggestionLimitChange(genreSuggestionLimit + 40)}
              >
                Mehr anzeigen
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={isSubmitting || clearFlags.genre || genreSuggestionLimit <= 40}
                onClick={() => onGenreSuggestionLimitChange(40)}
              >
                Zuruecksetzen
              </button>
              </div>
          </>
        ) : null}
        <label className={styles.nullToggle}>
          <input
            type="checkbox"
            checked={clearFlags.genre}
            onChange={(event) => onClearFlagChange('genre', event.target.checked)}
            disabled={isSubmitting}
          />
          Wert loeschen (null)
        </label>
        <p className={styles.hint}>Aktuell: {values.genreTokens.join(', ') || '(leer)'}</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="update-description">Description</label>
        <textarea
          id="update-description"
          value={values.description}
          onChange={(event) => onFieldChange('description', event.target.value)}
          disabled={isSubmitting || clearFlags.description}
        />
        <label className={styles.nullToggle}>
          <input
            type="checkbox"
            checked={clearFlags.description}
            onChange={(event) => onClearFlagChange('description', event.target.checked)}
            disabled={isSubmitting}
          />
          Wert loeschen (null)
        </label>
      </div>
    </div>
  )
}
