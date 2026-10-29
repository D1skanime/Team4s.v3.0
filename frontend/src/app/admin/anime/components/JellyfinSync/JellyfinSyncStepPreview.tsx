import { Spinner } from '@/components/ui'
import type { AdminAnimeJellyfinPreviewResult } from '@/types/admin'

import studioStyles from '../../AdminStudio.module.css'
import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import { EPISODE_STATUSES, type JellyfinSyncModel, renderStepFeedback } from './jellyfinSyncPanelHelpers'
import styles from './JellyfinSyncPanel.module.css'

function renderPreviewSummaryCards(preview: AdminAnimeJellyfinPreviewResult) {
  return (
    <div className={studioStyles.summaryGrid}>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Gefundene Episoden</p>
        <p className={studioStyles.summaryValue}>
          {preview.matched_episodes}/{preview.scanned_episodes}
        </p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Akzeptiert</p>
        <p className={studioStyles.summaryValue}>{preview.accepted_unique_episodes}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Pfad-gefiltert</p>
        <p className={studioStyles.summaryValue}>{preview.path_filtered_episodes}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Skip</p>
        <p className={studioStyles.summaryValue}>{preview.skipped_episodes}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Bestehende Versionen</p>
        <p className={studioStyles.summaryValue}>{preview.existing_jellyfin_versions}</p>
      </div>
    </div>
  )
}

interface JellyfinSyncStepPreviewProps {
  model: JellyfinSyncModel
  selectedSeriesID: string
  hasFreshPreview: boolean
  onPreview: () => void
}

/** Assistentenschritt 3: Staffel/Status wählen, Vorschau laden und ihr Ergebnis prüfen. */
export function JellyfinSyncStepPreview({ model, selectedSeriesID, hasFreshPreview, onPreview }: JellyfinSyncStepPreviewProps) {
  return (
    <section className={styles.stepPanel}>
      <div className={styles.stepPanelHeader}>
        <span className={styles.stepIndex}>3</span>
        <div className={styles.stepPanelHeading}>
          <h3 className={styles.stepTitle}>Preview prüfen</h3>
          <p className={styles.stepHelper}>Meist reicht Season 1. Lade danach die Vorschau.</p>
        </div>
      </div>

      <div className={styles.optionGrid}>
        <div className={studioStyles.field}>
          <label htmlFor="jellyfin-season-number">Staffel</label>
          <input
            id="jellyfin-season-number"
            className={studioStyles.input}
            value={model.seasonInput}
            onChange={(event) => model.setSeasonInput(event.target.value)}
            disabled={model.isSyncing || model.isLoadingPreview}
            placeholder="1"
          />
        </div>

        <div className={studioStyles.field}>
          <label htmlFor="jellyfin-episode-status">Status für neue Episoden</label>
          <select
            id="jellyfin-episode-status"
            className={studioStyles.select}
            value={model.episodeStatus}
            onChange={(event) => model.setEpisodeStatus(event.target.value as typeof model.episodeStatus)}
            disabled={model.isSyncing || model.isLoadingPreview}
          >
            {EPISODE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {formatEpisodeStatusLabel(value)}
              </option>
            ))}
          </select>
          <p className={styles.compactHelper}>Standard: private</p>
        </div>

        <div className={studioStyles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="jellyfin-sync-rule">Import-Regel</label>
            <span
              className={styles.infoBadge}
              title="Aktuell ist nur DB-first verfügbar: vorhandene DB-Werte bleiben erhalten."
              aria-hidden="true"
            >
              i
            </span>
          </div>
          <select id="jellyfin-sync-rule" className={studioStyles.select} value="db-first" disabled>
            <option value="db-first">DB-first</option>
          </select>
          <p className={styles.compactHelper}>Vorhandene DB-Werte werden nicht still überschrieben.</p>
        </div>
      </div>

      <details className={styles.advancedPanel}>
        <summary className={styles.advancedSummary}>
          <span>Erweitert & Risiko</span>
          <span className={styles.advancedHint}>Nur für Sonderfälle</span>
        </summary>
        <div className={styles.advancedBody}>
          <label className={styles.toggleCard}>
            <input
              type="checkbox"
              checked={model.cleanupVersions}
              onChange={(event) => model.setCleanupVersions(event.target.checked)}
              disabled={model.isSyncing || model.isLoadingPreview}
            />
            <span className={styles.toggleCopy}>
              <span className={styles.toggleTitle}>Bestehende Jellyfin-Versionen vorher entfernen</span>
              <span className={styles.compactHelper}>Löscht nur provider-importierte Jellyfin-Versionen vor dem Re-Import.</span>
            </span>
          </label>
          {model.cleanupVersions && model.previewResult && model.previewResult.existing_jellyfin_versions > 0 ? (
            <div className={styles.warningBox}>
              Achtung: {model.previewResult.existing_jellyfin_versions} bestehende Jellyfin-Versionen werden beim Sync entfernt.
            </div>
          ) : null}

          <label className={styles.toggleCard}>
            <input
              type="checkbox"
              checked={model.allowMismatch}
              onChange={(event) => model.setAllowMismatch(event.target.checked)}
              disabled={model.isSyncing || model.isLoadingPreview}
            />
            <span className={styles.toggleCopy}>
              <span className={styles.toggleTitle}>Mismatch-Guard überschreiben</span>
              <span className={styles.compactHelper}>Nur aktivieren, wenn die Preview bewusst geprüft wurde.</span>
            </span>
          </label>
          {model.allowMismatch ? (
            <div className={styles.warningBox}>Guard deaktiviert. Falsche Zuordnung kann erneut TV- und OVA-Daten mischen.</div>
          ) : null}
        </div>
      </details>

      {renderStepFeedback(model.previewFeedback)}

      <div className={styles.stepActions}>
        <button
          className={`${studioStyles.button} ${studioStyles.buttonPrimary}`}
          type="button"
          onClick={onPreview}
          disabled={model.isSyncing || model.isLoadingPreview || selectedSeriesID === ''}
        >
          {model.isLoadingPreview ? (
            <>
              <Spinner size="sm" label="" />
              Preview läuft...
            </>
          ) : (
            'Vorschau laden'
          )}
        </button>
        <span className={styles.actionHint}>
          {selectedSeriesID ? 'Lade jetzt die Vorschau für den ausgewählten Treffer.' : 'Wähle zuerst einen Treffer aus.'}
        </span>
      </div>

      <div className={styles.previewBox}>
        {model.isLoadingPreview ? (
          <div className={styles.emptyState}>
            <Spinner size="sm" label="" />
            <p className={styles.emptyStateText}>Vorschau wird geladen...</p>
          </div>
        ) : hasFreshPreview && model.previewResult ? (
          <>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitleBlock}>
                <p className={styles.previewEyebrow}>Vorschau</p>
                <p className={styles.previewTitle}>{model.previewResult.jellyfin_series_name}</p>
                <p className={styles.metaLine}>{model.previewResult.jellyfin_series_path || '(ohne Pfad)'}</p>
              </div>
              <div className={styles.previewBadges}>
                {model.previewResult.matched_episodes === 0 ? (
                  <span className={`${studioStyles.badge} ${studioStyles.badgeWarning}`}>Keine Treffer</span>
                ) : model.previewResult.mismatch_detected ? (
                  <span className={`${studioStyles.badge} ${studioStyles.badgeWarning}`}>Mismatch</span>
                ) : (
                  <span className={`${studioStyles.badge} ${studioStyles.badgeSuccess}`}>Bereit</span>
                )}
                <span className={`${studioStyles.badge} ${studioStyles.badgeMuted}`}>Season {model.previewResult.season_number}</span>
              </div>
            </div>
            {model.previewResult.matched_episodes === 0 ? (
              <div className={styles.warningBox}>
                Keine passenden Episoden für Season {model.previewResult.season_number} in dieser Serie gefunden.
                Prüfe Season-Nummer und Pfad-Filter.
              </div>
            ) : (
              <>
                {renderPreviewSummaryCards(model.previewResult)}
                {model.previewResult.mismatch_detected && model.previewResult.mismatch_reason ? (
                  <div className={styles.warningBox}>Guard-Hinweis: {model.previewResult.mismatch_reason}</div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <p className={styles.placeholderText}>Noch keine aktuelle Preview geladen.</p>
        )}
      </div>
    </section>
  )
}
