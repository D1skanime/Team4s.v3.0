import Link from 'next/link'
import { FormEvent } from 'react'

import { EpisodeListItem } from '@/types/anime'
import { EpisodeStatus } from '@/types/anime'
import { EpisodeVersion } from '@/types/episodeVersion'
import { FansubGroup } from '@/types/fansub'

import { formatEpisodeStatusLabel, parsePositiveInt } from '../../utils/anime-helpers'
import sharedStyles from '../../../admin.module.css'
import contextStyles from '../AnimeContext/AnimeContext.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...contextStyles, ...episodeStyles }

interface EpisodeEditFormProps {
  episodeOpenID: number | null
  animeID: number
  availableFansubs: FansubGroup[]
  selectedEpisode: EpisodeListItem | null
  selectedEpisodeNumber: number | null
  selectedEpisodeVersions: EpisodeVersion[]
  selectedEpisodeVersionCount: number
  isLoadingVersions: boolean
  versionsError: string | null
  values: { id: string; number: string; title: string; status: string; streamLink: string }
  clearFlags: { title: boolean; streamLink: boolean }
  hasUnsavedChanges: boolean
  statuses: EpisodeStatus[]
  isUpdating: boolean
  onFieldChange: (field: 'id' | 'number' | 'title' | 'status' | 'streamLink', value: string) => void
  onClearFlagChange: (field: 'title' | 'streamLink', value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function formatReleaseDate(value?: string | null): string {
  if (!value) return 'kein Datum'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'kein Datum'
  return parsed.toLocaleString('de-DE')
}

function resolveVersionTitle(version: EpisodeVersion): string {
  const title = (version.title || '').trim()
  if (title) return title
  return `(release #${version.id})`
}

function resolveExpandedFansub(version: EpisodeVersion, availableFansubs: FansubGroup[]): FansubGroup | null {
  const fansubID = version.fansub_group?.id
  if (!fansubID) return null
  return availableFansubs.find((group) => group.id === fansubID) || null
}

export function EpisodeEditForm({
  episodeOpenID,
  animeID,
  availableFansubs,
  selectedEpisode,
  selectedEpisodeNumber,
  selectedEpisodeVersions,
  selectedEpisodeVersionCount,
  isLoadingVersions,
  versionsError,
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

        <div className={styles.field}>
          <label>Versionen und Gruppen</label>
          {!selectedEpisode ? <p className={styles.hint}>Bitte zuerst eine Episode auswaehlen.</p> : null}
          {selectedEpisode && selectedEpisodeNumber === null ? (
            <p className={styles.hint}>Versionsauflistung ist nur fuer numerische Episodennummern verfuegbar.</p>
          ) : null}
          {selectedEpisode && selectedEpisodeNumber !== null && isLoadingVersions ? (
            <p className={styles.hint}>Lade Versionen...</p>
          ) : null}
          {selectedEpisode && selectedEpisodeNumber !== null && versionsError ? (
            <p className={styles.hintWarning}>Versionen konnten nicht geladen werden: {versionsError}</p>
          ) : null}
          {selectedEpisode &&
          selectedEpisodeNumber !== null &&
          !isLoadingVersions &&
          !versionsError &&
          selectedEpisodeVersions.length === 0 ? (
            <p className={styles.hint}>Keine Episode-Versionen fuer diese Episodennummer gefunden.</p>
          ) : null}
          {selectedEpisode &&
          selectedEpisodeNumber !== null &&
          !isLoadingVersions &&
          !versionsError &&
          selectedEpisodeVersions.length > 0 ? (
            <>
              <p className={styles.hint}>
                Gefundene Versionen: {selectedEpisodeVersions.length}
                {selectedEpisodeVersionCount > selectedEpisodeVersions.length ? ` / ${selectedEpisodeVersionCount}` : ''}
              </p>
              <p className={styles.hint}>
                Mehrere beteiligte Gruppen pro Folge werden als Kollaboration-Gruppe gepflegt und dann der Version
                zugewiesen.
              </p>
              <div className={styles.contextFansubGrid}>
                {selectedEpisodeVersions.map((version) => {
                  const expandedFansub = resolveExpandedFansub(version, availableFansubs)
                  return (
                  <article key={version.id} className={styles.contextFansubCard}>
                    <p className={styles.contextFansubTitle}>#{version.id} - {resolveVersionTitle(version)}</p>
                    <p className={styles.hint}>
                      Gruppe: {version.fansub_group?.name || 'keine'} | Qualitaet: {version.video_quality || 'n/a'} | Sub:{' '}
                      {version.subtitle_type || 'n/a'}
                    </p>
                    {expandedFansub?.group_type === 'collaboration' &&
                    expandedFansub.collaboration_members &&
                    expandedFansub.collaboration_members.length > 0 ? (
                      <p className={styles.contextDescription}>
                        Beteiligte Gruppen: {expandedFansub.collaboration_members.map((member) => member.name).join(', ')}
                      </p>
                    ) : null}
                    <p className={styles.hint}>
                      Provider: {version.media_provider} | Item: {version.media_item_id} | Release:{' '}
                      {formatReleaseDate(version.release_date)}
                    </p>
                    <p className={styles.contextDescription}>
                      Stream-Link (direkt): {version.stream_url || 'nicht gesetzt'}
                      <br />
                      Stream-Link (proxy): <code>/api/v1/releases/{version.id}/stream</code>
                    </p>
                    <div className={styles.actions}>
                      <Link href={`/admin/episode-versions/${version.id}/edit`} className={styles.buttonSecondary}>
                        Version bearbeiten
                      </Link>
                      {version.fansub_group?.id ? (
                        <Link href={`/admin/fansubs/${version.fansub_group.id}/edit`} className={styles.buttonSecondary}>
                          Gruppe bearbeiten
                        </Link>
                      ) : null}
                      <Link href={`/admin/anime/${animeID}/versions#version-${version.id}`} className={styles.buttonSecondary}>
                        Im Versionsbrowser
                      </Link>
                    </div>
                  </article>
                  )
                })}
              </div>
            </>
          ) : null}
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
