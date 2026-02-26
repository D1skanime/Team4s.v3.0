import { AdminAnimeJellyfinPreviewResult } from '@/types/admin'
import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']

interface JellyfinSyncActionsProps {
  selectedSeriesID: string
  seasonInput: string
  episodeStatus: EpisodeStatus
  cleanupVersions: boolean
  allowMismatch: boolean
  previewResult: AdminAnimeJellyfinPreviewResult | null
  isSyncing: boolean
  isBulkSyncing: boolean
  isLoadingPreview: boolean
  onSeasonInputChange: (value: string) => void
  onEpisodeStatusChange: (value: EpisodeStatus) => void
  onCleanupVersionsChange: (value: boolean) => void
  onAllowMismatchChange: (value: boolean) => void
  onPreview: () => void
  onSync: () => void
}

export function JellyfinSyncActions({
  selectedSeriesID,
  seasonInput,
  episodeStatus,
  cleanupVersions,
  allowMismatch,
  previewResult,
  isSyncing,
  isBulkSyncing,
  isLoadingPreview,
  onSeasonInputChange,
  onEpisodeStatusChange,
  onCleanupVersionsChange,
  onAllowMismatchChange,
  onPreview,
  onSync,
}: JellyfinSyncActionsProps) {
  return (
    <>
      <div className={styles.gridTwo}>
        <div className={styles.field}>
          <label htmlFor="jellyfin-season-number">Season Number</label>
          <input
            id="jellyfin-season-number"
            value={seasonInput}
            onChange={(event) => onSeasonInputChange(event.target.value)}
            disabled={isSyncing || isLoadingPreview}
            placeholder="1"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="jellyfin-episode-status">Status fuer neue Episoden</label>
          <select
            id="jellyfin-episode-status"
            value={episodeStatus}
            onChange={(event) => onEpisodeStatusChange(event.target.value as EpisodeStatus)}
            disabled={isSyncing || isLoadingPreview}
          >
            {EPISODE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {formatEpisodeStatusLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>Sync-Regel</label>
          <p className={styles.hint}>
            DB-first aktiv: vorhandene DB-Werte werden durch Jellyfin-Sync nicht ueberschrieben. Manuelle Korrekturen (z.
            B. falsche Jellyfin-ID) bleiben im Version-Editor moeglich.
          </p>
        </div>
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={cleanupVersions}
              onChange={(event) => onCleanupVersionsChange(event.target.checked)}
              disabled={isSyncing || isLoadingPreview}
            />
            Bestehende Jellyfin-Versionen vorher entfernen
          </label>
          <p className={styles.hint}>
            Aktivieren wenn ein falscher Anime synchronisiert wurde. Loescht alle Jellyfin-Versionen (nicht Fansub-Versionen)
            vor dem Re-Import.
          </p>
          {cleanupVersions && previewResult && previewResult.existing_jellyfin_versions > 0 ? (
            <p className={styles.hintWarning}>
              Achtung: {previewResult.existing_jellyfin_versions} bestehende Jellyfin-Versionen werden unwiderruflich geloescht!
            </p>
          ) : null}
        </div>
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={allowMismatch}
              onChange={(event) => onAllowMismatchChange(event.target.checked)}
              disabled={isSyncing || isLoadingPreview}
            />
            Mismatch-Guard uebersteuern (nur wenn Preview geprueft)
          </label>
          <p className={styles.hint}>
            Standard: Sync blockiert bei deutlich zu vielen eindeutigen Episoden im Vergleich zu max_episodes.
          </p>
          {allowMismatch ? <p className={styles.hintWarning}>Achtung: Guard ist deaktiviert. Falsche Zuordnung kann erneut TV/OVA mischen.</p> : null}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.buttonSecondary}
          type="button"
          onClick={onPreview}
          disabled={isSyncing || isLoadingPreview || selectedSeriesID.trim() === ''}
        >
          {isLoadingPreview ? 'Preview laeuft...' : 'JSON Preview laden'}
        </button>
        <button
          className={styles.button}
          type="button"
          onClick={onSync}
          disabled={isSyncing || isBulkSyncing || selectedSeriesID.trim() === '' || !previewResult}
        >
          {isSyncing ? 'Sync laeuft...' : 'Sync anwenden'}
        </button>
      </div>
    </>
  )
}