import { FormEvent } from 'react'

import { EpisodeStatus } from '@/types/anime'

import styles from '../../../admin.module.css'

interface EpisodeCreateFormProps {
  animeID: number
  values: { number: string; title: string; status: EpisodeStatus }
  statuses: EpisodeStatus[]
  nextEpisodeNumberSuggestion: string | null
  isCreating: boolean
  onFieldChange: (field: 'number' | 'title' | 'status', value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EpisodeCreateForm({
  animeID,
  values,
  statuses,
  nextEpisodeNumberSuggestion,
  isCreating,
  onFieldChange,
  onSubmit,
}: EpisodeCreateFormProps) {
  return (
    <details className={styles.details} open>
      <summary>Neue Episode erstellen</summary>
      <div className={styles.detailsInner}>
        <p className={styles.hint}>Neue Episode wird an Anime #{animeID} angehaengt.</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-episode-number">Episode Number *</label>
              <input
                id="create-episode-number"
                value={values.number}
                onChange={(event) => onFieldChange('number', event.target.value)}
                disabled={isCreating}
                placeholder="z. B. 01"
              />
              {nextEpisodeNumberSuggestion ? (
                <div className={styles.actions}>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isCreating}
                    onClick={() => onFieldChange('number', nextEpisodeNumberSuggestion)}
                  >
                    Naechste Nummer: {nextEpisodeNumberSuggestion}
                  </button>
                </div>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="create-episode-status">Status *</label>
              <select
                id="create-episode-status"
                value={values.status}
                onChange={(event) => onFieldChange('status', event.target.value)}
                disabled={isCreating}
              >
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-episode-title">Title</label>
              <input
                id="create-episode-title"
                value={values.title}
                onChange={(event) => onFieldChange('title', event.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={isCreating}>
              {isCreating ? 'Speichern...' : 'Episode erstellen'}
            </button>
          </div>
        </form>
      </div>
    </details>
  )
}