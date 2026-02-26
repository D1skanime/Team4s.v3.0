import Link from 'next/link'
import { FormEvent } from 'react'

import { EpisodeListItem } from '@/types/anime'
import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel, parsePositiveInt } from '../../utils/anime-helpers'
import sharedStyles from '../../../admin.module.css'
import contextStyles from '../AnimeContext/AnimeContext.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...contextStyles, ...episodeStyles }

interface EpisodeEditFormProps {
  episodeOpenID: number | null
  selectedEpisode: EpisodeListItem | null
  values: { id: string; number: string; title: string; status: string; streamLink: string }
  clearFlags: { title: boolean; streamLink: boolean }
  hasUnsavedChanges: boolean
  statuses: EpisodeStatus[]
  isUpdating: boolean
  onFieldChange: (field: 'id' | 'number' | 'title' | 'status' | 'streamLink', value: string) => void
  onClearFlagChange: (field: 'title' | 'streamLink', value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EpisodeEditForm({
  episodeOpenID,
  selectedEpisode,
  values,
  clearFlags,
  hasUnsavedChanges,
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
          <p className={styles.hint}>Waehle links eine Episode aus, um sie zu bearbeiten.</p>
        </div>
      ) : (
        <p className={styles.hint}>
          Ausgewaehlt: Episode #{episodeOpenID} {hasUnsavedChanges ? '| Ungespeicherte Aenderungen' : ''}
        </p>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor="update-episode-title">Titel</label>
          <input
            id="update-episode-title"
            className={styles.episodeTitleInput}
            value={values.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            disabled={isUpdating || clearFlags.title}
            placeholder="Episodentitel"
          />
          <label className={styles.nullToggle}>
            <input
              type="checkbox"
              checked={clearFlags.title}
              onChange={(event) => onClearFlagChange('title', event.target.checked)}
              disabled={isUpdating}
            />
            Feld zuruecksetzen
          </label>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label htmlFor="update-episode-number">Episodennummer</label>
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
              className={styles.episodeStatusSelect}
              value={values.status}
              onChange={(event) => onFieldChange('status', event.target.value)}
              disabled={isUpdating}
            >
              <option value="">Status beibehalten</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {formatEpisodeStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="update-episode-stream-link">Streaming-Link</label>
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
            Feld zuruecksetzen
          </label>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label htmlFor="update-episode-id">Episode-ID (nur lesen)</label>
            <input id="update-episode-id" value={values.id} readOnly disabled placeholder="aus Liste waehlen" />
          </div>
          <div className={styles.field}>
            <label>Metadaten</label>
            <p className={styles.hint}>
              Aktueller Status: {selectedEpisode ? formatEpisodeStatusLabel(selectedEpisode.status) : '-'}
              <br />
              Aktueller Link: {selectedEpisode?.stream_links?.[0] ? 'vorhanden' : 'nicht gesetzt'}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={hasUnsavedChanges ? styles.button : styles.buttonSecondary}
            type="submit"
            disabled={isUpdating || !parsePositiveInt(values.id) || !hasUnsavedChanges}
          >
            {isUpdating ? 'Speichern...' : 'Aenderungen speichern'}
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
