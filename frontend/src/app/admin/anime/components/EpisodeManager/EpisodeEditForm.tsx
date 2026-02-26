import Link from 'next/link'
import { FormEvent } from 'react'

import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel, parsePositiveInt } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

interface EpisodeEditFormProps {
  episodeOpenID: number | null
  values: { id: string; number: string; title: string; status: string; streamLink: string }
  clearFlags: { title: boolean; streamLink: boolean }
  statuses: EpisodeStatus[]
  isUpdating: boolean
  onFieldChange: (field: 'id' | 'number' | 'title' | 'status' | 'streamLink', value: string) => void
  onClearFlagChange: (field: 'title' | 'streamLink', value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EpisodeEditForm({
  episodeOpenID,
  values,
  clearFlags,
  statuses,
  isUpdating,
  onFieldChange,
  onClearFlagChange,
  onSubmit,
}: EpisodeEditFormProps) {
  return (
    <>
      <h3 className={styles.subheading}>Episode bearbeiten</h3>
      {!episodeOpenID ? (
        <div className={styles.contextCard}>
          <p className={styles.contextTitle}>Keine Episode ausgewaehlt</p>
          <p className={styles.hint}>Klicke links auf eine Zeile oder die Episoden-Nummer, um sie zum Bearbeiten zu laden.</p>
        </div>
      ) : (
        <p className={styles.hint}>Ausgewaehlt: Episode #{episodeOpenID}</p>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label htmlFor="update-episode-id">Episode ID *</label>
            <input
              id="update-episode-id"
              value={values.id}
              onChange={(event) => onFieldChange('id', event.target.value)}
              disabled={isUpdating}
              placeholder="aus Liste waehlen"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="update-episode-number">Episode Number</label>
            <input
              id="update-episode-number"
              value={values.number}
              onChange={(event) => onFieldChange('number', event.target.value)}
              disabled={isUpdating}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="update-episode-status">Status</label>
            <select
              id="update-episode-status"
              value={values.status}
              onChange={(event) => onFieldChange('status', event.target.value)}
              disabled={isUpdating}
            >
              <option value="">-- unveraendert --</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {formatEpisodeStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="update-episode-title">Title</label>
            <input
              id="update-episode-title"
              value={values.title}
              onChange={(event) => onFieldChange('title', event.target.value)}
              disabled={isUpdating || clearFlags.title}
            />
            <label className={styles.nullToggle}>
              <input
                type="checkbox"
                checked={clearFlags.title}
                onChange={(event) => onClearFlagChange('title', event.target.checked)}
                disabled={isUpdating}
              />
              Wert loeschen (null)
            </label>
          </div>
          <div className={styles.field}>
            <label htmlFor="update-episode-stream-link">Stream Link (Emby)</label>
            <input
              id="update-episode-stream-link"
              value={values.streamLink}
              onChange={(event) => onFieldChange('streamLink', event.target.value)}
              disabled={isUpdating || clearFlags.streamLink}
              placeholder="https://.../web/index.html#!/item?id=..."
            />
            <label className={styles.nullToggle}>
              <input
                type="checkbox"
                checked={clearFlags.streamLink}
                onChange={(event) => onClearFlagChange('streamLink', event.target.checked)}
                disabled={isUpdating}
              />
              Wert loeschen (null)
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="submit" disabled={isUpdating || !parsePositiveInt(values.id)}>
            {isUpdating ? 'Speichern...' : 'Episode aktualisieren'}
          </button>
          {episodeOpenID ? (
            <Link href={`/episodes/${episodeOpenID}`} className={styles.buttonSecondary} target="_blank" rel="noreferrer">
              Episode oeffnen
            </Link>
          ) : null}
        </div>
      </form>
    </>
  )
}