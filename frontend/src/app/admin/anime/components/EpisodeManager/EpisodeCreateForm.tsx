import { FormEvent } from 'react'

import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

interface EpisodeCreateFormProps {
  values: { number: string; title: string; status: EpisodeStatus }
  statuses: EpisodeStatus[]
  nextEpisodeNumberSuggestion: string | null
  isCreating: boolean
  onFieldChange: (field: 'number' | 'title' | 'status', value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EpisodeCreateForm({
  values,
  statuses,
  nextEpisodeNumberSuggestion,
  isCreating,
  onFieldChange,
  onSubmit,
}: EpisodeCreateFormProps) {
  return (
    <details className={styles.createCard}>
      <summary className={styles.createSummary}>Neue Episode erstellen</summary>
      <div className={styles.createBody}>
        <p className={styles.hint}>Die Episode wird diesem Anime hinzugefuegt.</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label htmlFor="create-episode-number">Episode Nummer</label>
            <input
              id="create-episode-number"
              value={values.number}
              onChange={(event) => onFieldChange('number', event.target.value)}
              disabled={isCreating}
              placeholder="z. B. 01"
            />
            {nextEpisodeNumberSuggestion ? (
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isCreating}
                onClick={() => onFieldChange('number', nextEpisodeNumberSuggestion)}
              >
                Naechste Nummer verwenden: {nextEpisodeNumberSuggestion}
              </button>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="create-episode-status">Status</label>
            <select
              id="create-episode-status"
              value={values.status}
              onChange={(event) => onFieldChange('status', event.target.value)}
              disabled={isCreating}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {formatEpisodeStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="create-episode-title">Titel</label>
            <input
              id="create-episode-title"
              value={values.title}
              onChange={(event) => onFieldChange('title', event.target.value)}
              disabled={isCreating}
            />
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
