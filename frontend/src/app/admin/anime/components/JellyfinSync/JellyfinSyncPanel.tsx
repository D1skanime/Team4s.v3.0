import { useEffect, useMemo, useRef, useState } from 'react'

import {
  AdminAnimeJellyfinPreviewResult,
  AdminAnimeJellyfinSyncResult,
  AdminJellyfinSeriesSearchItem,
} from '@/types/admin'
import { AnimeDetail, EpisodeStatus } from '@/types/anime'

import studioStyles from '../../AdminStudio.module.css'
import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import { deriveJellyfinSyncPanelState } from '../../utils/jellyfin-sync-panel-state'
import styles from './JellyfinSyncPanel.module.css'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']
const WIZARD_STEPS = ['Suchen', 'Treffer', 'Preview', 'Sync'] as const

interface JellyfinSyncModel {
  searchQuery: string
  seriesOptions: AdminJellyfinSeriesSearchItem[]
  selectedSeriesID: string
  seasonInput: string
  episodeStatus: EpisodeStatus
  cleanupVersions: boolean
  allowMismatch: boolean
  previewResult: AdminAnimeJellyfinPreviewResult | null
  lastSyncResult: AdminAnimeJellyfinSyncResult | null
  isSearching: boolean
  isLoadingPreview: boolean
  isSyncing: boolean
  isBulkSyncing: boolean
  searchFeedback: { tone: 'success' | 'error'; message: string; details?: string } | null
  previewFeedback: { tone: 'success' | 'error'; message: string; details?: string } | null
  syncFeedback: { tone: 'success' | 'error'; message: string; details?: string } | null
  setSearchQuery: (q: string) => void
  selectSeries: (id: string) => void
  setSeasonInput: (value: string) => void
  setEpisodeStatus: (value: EpisodeStatus) => void
  setCleanupVersions: (value: boolean) => void
  setAllowMismatch: (value: boolean) => void
  search: () => Promise<void>
  preview: (animeID: number) => Promise<void>
  sync: (animeID: number, options?: { requireFreshPreview?: boolean }) => Promise<boolean>
  reset: () => void
}

function LoadingSpinner() {
  return <span className={styles.loadingSpinner} aria-hidden="true" />
}

function renderStepFeedback(feedback: { tone: 'success' | 'error'; message: string; details?: string } | null) {
  if (!feedback) {
    return null
  }

  const className = feedback.tone === 'error' ? styles.errorState : styles.successState
  return <div className={className}>{feedback.details ? `${feedback.message} ${feedback.details}` : feedback.message}</div>
}

interface JellyfinSyncPanelProps {
  anime: AnimeDetail
  model: JellyfinSyncModel
  onBeforeAction: () => void
  onSynced: () => Promise<void>
}

function formatSeriesOption(item: AdminJellyfinSeriesSearchItem): string {
  const year = item.production_year ? ` (${item.production_year})` : ''
  const path = item.path?.trim() || '(ohne Pfad)'
  return `${item.name}${year} - ${path}`
}

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

function renderSyncSummaryCards(result: AdminAnimeJellyfinSyncResult) {
  return (
    <div className={studioStyles.summaryGrid}>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Episoden neu</p>
        <p className={studioStyles.summaryValue}>{result.imported_episodes}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Episoden aktualisiert</p>
        <p className={studioStyles.summaryValue}>{result.updated_episodes}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Versionen neu</p>
        <p className={studioStyles.summaryValue}>{result.imported_versions}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Versionen aktualisiert</p>
        <p className={studioStyles.summaryValue}>{result.updated_versions}</p>
      </div>
      <div className={studioStyles.summaryCard}>
        <p className={studioStyles.summaryLabel}>Geloescht</p>
        <p className={studioStyles.summaryValue}>{result.deleted_versions ?? 0}</p>
      </div>
    </div>
  )
}

export function JellyfinSyncPanel({ anime, model, onBeforeAction, onSynced }: JellyfinSyncPanelProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [hasCopiedSeriesID, setHasCopiedSeriesID] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const prevIsSearching = useRef(model.isSearching)

  // Track when search completes to show empty state
  useEffect(() => {
    if (prevIsSearching.current && !model.isSearching) {
      setHasSearched(true)
    }
    prevIsSearching.current = model.isSearching
  }, [model.isSearching])

  useEffect(() => {
    model.setSearchQuery(anime.title || '')
    model.reset()
    setIsConfirmOpen(false)
    setHasCopiedSeriesID(false)
    setHasSearched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.id])

  const selectedSeriesID = model.selectedSeriesID.trim()
  const selectedSeries = useMemo(
    () => model.seriesOptions.find((item) => item.jellyfin_series_id === selectedSeriesID) || null,
    [model.seriesOptions, selectedSeriesID],
  )
  const { activeStep, hasFreshPreview, hasSyncablePreview, canSync, showSearchEmptyState } = deriveJellyfinSyncPanelState({
    animeID: anime.id,
    selectedSeriesID,
    seasonInput: model.seasonInput,
    previewResult: model.previewResult,
    isSyncing: model.isSyncing,
    isBulkSyncing: model.isBulkSyncing,
    seriesOptionCount: model.seriesOptions.length,
    hasSearched,
    isSearching: model.isSearching,
    searchFeedbackTone: model.searchFeedback?.tone ?? null,
  })

  const handleSearch = () => {
    setHasCopiedSeriesID(false)
    setHasSearched(false)
    onBeforeAction()
    void model.search()
  }

  const hasSearchResults = model.seriesOptions.length > 0

  const handlePreview = () => {
    onBeforeAction()
    void model.preview(anime.id)
  }

  const handleRequestSync = () => {
    if (!canSync) {
      return
    }

    setIsConfirmOpen(true)
  }

  const handleConfirmSync = () => {
    onBeforeAction()
    void model.sync(anime.id).then(async (didSync) => {
      if (!didSync) {
        return
      }

      setIsConfirmOpen(false)
      await onSynced()
    })
  }

  const handleCopySeriesID = () => {
    if (!selectedSeriesID || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    void navigator.clipboard.writeText(selectedSeriesID).then(() => {
      setHasCopiedSeriesID(true)
    })
  }

  return (
    <section className={styles.syncCard}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Provider Sync</p>
          <h2 className={studioStyles.sectionTitle}>Jellyfin Sync</h2>
          <p className={styles.description}>Suche, pruefe und synchronisiere in einem klaren Ablauf. Preview kommt immer vor dem Sync.</p>
        </div>
        <div className={styles.headerStatus}>
          <span
            className={`${studioStyles.badge} ${
              hasFreshPreview ? studioStyles.badgeSuccess : selectedSeriesID ? studioStyles.badgeWarning : studioStyles.badgeMuted
            }`}
          >
            {hasFreshPreview ? 'Preview bereit' : selectedSeriesID ? 'Preview offen' : 'Suche starten'}
          </span>
        </div>
      </div>

      <ol className={styles.stepper} aria-label="Jellyfin Sync Schritte">
        {WIZARD_STEPS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === activeStep
          const isDone = stepNumber < activeStep

          return (
            <li
              key={label}
              className={`${styles.stepItem} ${isActive ? styles.stepItemActive : ''} ${isDone ? styles.stepItemDone : ''}`}
            >
              <span className={styles.stepDot}>{stepNumber}</span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          )
        })}
      </ol>

      <div className={styles.wizardStack}>
        <section className={styles.stepPanel}>
          <div className={styles.stepPanelHeader}>
            <span className={styles.stepIndex}>1</span>
            <div className={styles.stepPanelHeading}>
              <h3 className={styles.stepTitle}>Serie suchen</h3>
              <p className={styles.stepHelper}>Suche nach Titel oder Ordnername in Jellyfin.</p>
            </div>
          </div>
          <div className={styles.inlineFieldRow}>
            <div className={`${studioStyles.field} ${styles.inlineFieldGrow}`}>
              <label htmlFor="jellyfin-search-query">Jellyfin Suche (Series)</label>
              <input
                id="jellyfin-search-query"
                className={studioStyles.input}
                value={model.searchQuery}
                onChange={(event) => model.setSearchQuery(event.target.value)}
                disabled={model.isSyncing || model.isSearching || model.isLoadingPreview}
                placeholder="z. B. Naruto"
              />
            </div>
            <button
              className={`${studioStyles.button} ${studioStyles.buttonSecondary}`}
              type="button"
              onClick={handleSearch}
              disabled={model.isSyncing || model.isSearching || model.isLoadingPreview}
            >
              {model.isSearching ? (
                <>
                  <LoadingSpinner />
                  Suche laeuft...
                </>
              ) : (
                'Suchen'
              )}
            </button>
          </div>
          {renderStepFeedback(model.searchFeedback)}
        </section>

        <section className={styles.stepPanel}>
          <div className={styles.stepPanelHeader}>
            <span className={styles.stepIndex}>2</span>
            <div className={styles.stepPanelHeading}>
              <h3 className={styles.stepTitle}>Treffer waehlen</h3>
              <p className={styles.stepHelper}>Waehl den passenden Treffer aus der Suchliste.</p>
            </div>
          </div>
          <div className={studioStyles.field}>
            <label htmlFor="jellyfin-series-select">Trefferliste (Name + voller Pfad)</label>
            {showSearchEmptyState ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  Keine Jellyfin-Serien fuer diesen Suchbegriff gefunden. Versuche einen anderen Titel oder Ordnernamen.
                </p>
              </div>
            ) : (
              <select
                id="jellyfin-series-select"
                className={studioStyles.select}
                value={selectedSeriesID}
                onChange={(event) => {
                  setHasCopiedSeriesID(false)
                  model.selectSeries(event.target.value)
                }}
                disabled={model.isSyncing || model.isSearching || model.isLoadingPreview || !hasSearchResults}
              >
                <option value="">{hasSearchResults ? '-- Treffer auswaehlen --' : '-- Zuerst nach Serie suchen --'}</option>
                {model.seriesOptions.map((item) => (
                  <option key={item.jellyfin_series_id} value={item.jellyfin_series_id}>
                    {formatSeriesOption(item)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.readonlyGroup}>
            <div className={studioStyles.field}>
              <label htmlFor="jellyfin-series-id">Jellyfin Series ID</label>
              <div className={styles.inlineFieldRow}>
                <input
                  id="jellyfin-series-id"
                  className={studioStyles.input}
                  value={selectedSeriesID}
                  readOnly
                  placeholder="Wird nach der Auswahl gesetzt"
                />
                <button
                  className={`${studioStyles.button} ${studioStyles.buttonSecondary}`}
                  type="button"
                  onClick={handleCopySeriesID}
                  disabled={!selectedSeriesID}
                >
                  {hasCopiedSeriesID ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
            </div>
            {selectedSeries ? (
              <p className={styles.metaLine}>
                {selectedSeries.name}
                {selectedSeries.production_year ? ` (${selectedSeries.production_year})` : ''} | {selectedSeries.path?.trim() || '(ohne Pfad)'}
              </p>
            ) : (
              <p className={styles.metaLine}>Noch kein Treffer ausgewaehlt.</p>
            )}
          </div>
        </section>

        <section className={styles.stepPanel}>
          <div className={styles.stepPanelHeader}>
            <span className={styles.stepIndex}>3</span>
            <div className={styles.stepPanelHeading}>
              <h3 className={styles.stepTitle}>Preview pruefen</h3>
              <p className={styles.stepHelper}>Standardoptionen setzen, dann zuerst eine Preview laden.</p>
            </div>
          </div>

          <div className={styles.optionGrid}>
            <div className={studioStyles.field}>
              <label htmlFor="jellyfin-season-number">Season Number</label>
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
              <label htmlFor="jellyfin-episode-status">Status fuer neue Episoden</label>
              <select
                id="jellyfin-episode-status"
                className={studioStyles.select}
                value={model.episodeStatus}
                onChange={(event) => model.setEpisodeStatus(event.target.value as EpisodeStatus)}
                disabled={model.isSyncing || model.isLoadingPreview}
              >
                {EPISODE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {formatEpisodeStatusLabel(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className={studioStyles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="jellyfin-sync-rule">Sync-Regel</label>
                <span
                  className={styles.infoBadge}
                  title="Aktuell ist nur DB-first verfuegbar: vorhandene DB-Werte bleiben erhalten."
                  aria-hidden="true"
                >
                  i
                </span>
              </div>
              <select id="jellyfin-sync-rule" className={studioStyles.select} value="db-first" disabled>
                <option value="db-first">DB-first</option>
              </select>
              <p className={styles.compactHelper}>Vorhandene DB-Werte werden nicht still ueberschrieben.</p>
            </div>
          </div>

          <details className={styles.advancedPanel}>
            <summary className={styles.advancedSummary}>
              <span>Erweitert & Risiko</span>
              <span className={styles.advancedHint}>Nur fuer Sonderfaelle</span>
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
                  <span className={styles.compactHelper}>Loescht nur provider-importierte Jellyfin-Versionen vor dem Re-Import.</span>
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
                  <span className={styles.toggleTitle}>Mismatch-Guard ueberschreiben</span>
                  <span className={styles.compactHelper}>Nur aktivieren, wenn die Preview bewusst geprueft wurde.</span>
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
              onClick={handlePreview}
              disabled={model.isSyncing || model.isLoadingPreview || selectedSeriesID === ''}
            >
              {model.isLoadingPreview ? (
                <>
                  <LoadingSpinner />
                  Preview laeuft...
                </>
              ) : (
                'Preview laden'
              )}
            </button>
            <span className={styles.actionHint}>
              {selectedSeriesID ? 'Lade zuerst die Preview fuer den ausgewaehlten Treffer.' : 'Preview wird aktiv, sobald ein Treffer ausgewaehlt ist.'}
            </span>
          </div>

          <div className={styles.previewBox}>
            {model.isLoadingPreview ? (
              <div className={styles.emptyState}>
                <LoadingSpinner />
                <p className={styles.emptyStateText}>Preview wird geladen...</p>
              </div>
            ) : hasFreshPreview && model.previewResult ? (
              <>
                <div className={styles.previewHeader}>
                  <div className={styles.previewTitleBlock}>
                    <p className={styles.previewEyebrow}>Preview Summary</p>
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
                    Keine passenden Episoden fuer Season {model.previewResult.season_number} in dieser Serie gefunden.
                    Pruefe Season-Nummer und Pfad-Filter.
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

        <section className={styles.stepPanel}>
          <div className={styles.stepPanelHeader}>
            <span className={styles.stepIndex}>4</span>
            <div className={styles.stepPanelHeading}>
              <h3 className={styles.stepTitle}>Sync anwenden</h3>
              <p className={styles.stepHelper}>Der Sync bleibt gesperrt, bis eine aktuelle Preview vorliegt.</p>
            </div>
          </div>

          {renderStepFeedback(model.syncFeedback)}

          <div className={styles.stepActions}>
            <button
              className={`${studioStyles.button} ${studioStyles.buttonDanger}`}
              type="button"
              onClick={handleRequestSync}
              disabled={!canSync}
            >
              {model.isSyncing ? (
                <>
                  <LoadingSpinner />
                  Sync laeuft...
                </>
              ) : (
                'Sync anwenden'
              )}
            </button>
            <span className={styles.actionHint}>
              {canSync
                ? 'Oeffnet zuerst die Bestaetigung.'
                : hasFreshPreview && !hasSyncablePreview
                  ? 'Diese Preview enthaelt keine importierbaren Episoden.'
                  : 'Bitte zuerst eine aktuelle Preview laden.'}
            </span>
          </div>

          <div className={styles.previewBox}>
            {model.lastSyncResult ? (
              <>
                <div className={styles.previewHeader}>
                  <div className={styles.previewTitleBlock}>
                    <p className={styles.previewEyebrow}>Letztes Ergebnis</p>
                    <p className={styles.previewTitle}>{model.lastSyncResult.jellyfin_series_name}</p>
                    <p className={styles.metaLine}>{model.lastSyncResult.jellyfin_series_path || '(ohne Pfad)'}</p>
                  </div>
                  <span className={`${studioStyles.badge} ${studioStyles.badgeSuccess}`}>Abgeschlossen</span>
                </div>
                {renderSyncSummaryCards(model.lastSyncResult)}
              </>
            ) : (
              <p className={styles.placeholderText}>Nach einem erfolgreichen Sync erscheint hier eine kurze Ergebnis-Zusammenfassung.</p>
            )}
          </div>
        </section>
      </div>

      {isConfirmOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => !model.isSyncing && setIsConfirmOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="jellyfin-sync-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalBody}>
              <p className={styles.eyebrow}>Bestaetigung</p>
              <h3 id="jellyfin-sync-confirm-title" className={styles.modalTitle}>
                Sync wirklich anwenden?
              </h3>
              <p className={styles.modalText}>
                {selectedSeries ? `Serie: ${selectedSeries.name}` : 'Die ausgewaehlte Jellyfin-Serie'} wird jetzt mit diesem Anime synchronisiert.
              </p>
              {model.cleanupVersions ? (
                <div className={styles.warningBox}>Bestehende Jellyfin-Versionen werden vor dem Re-Import entfernt.</div>
              ) : null}
              {model.previewResult && model.previewResult.matched_episodes > 0 ? (
                <p className={styles.modalText}>
                  {model.previewResult.accepted_unique_episodes} Episoden werden importiert/aktualisiert.
                </p>
              ) : null}
              {renderStepFeedback(model.syncFeedback)}
            </div>
            <div className={styles.modalActions}>
              <button
                className={`${studioStyles.button} ${studioStyles.buttonSecondary}`}
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={model.isSyncing}
              >
                Abbrechen
              </button>
              <button
                className={`${studioStyles.button} ${studioStyles.buttonDanger}`}
                type="button"
                onClick={handleConfirmSync}
                disabled={model.isSyncing}
              >
                {model.isSyncing ? (
                  <>
                    <LoadingSpinner />
                    Synchronisiere...
                  </>
                ) : (
                  'Jetzt synchronisieren'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
