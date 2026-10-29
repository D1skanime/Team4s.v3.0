import { useEffect, useMemo, useRef, useState } from 'react'

import { AnimeDetail } from '@/types/anime'

import { deriveJellyfinSyncPanelState } from '../../utils/jellyfin-sync-panel-state'
import { JellyfinSyncConfirmDialog } from './JellyfinSyncConfirmDialog'
import type { JellyfinSyncModel } from './jellyfinSyncPanelHelpers'
import { WIZARD_STEPS } from './jellyfinSyncPanelHelpers'
import styles from './JellyfinSyncPanel.module.css'
import { JellyfinSyncStepApply } from './JellyfinSyncStepApply'
import { JellyfinSyncStepPreview } from './JellyfinSyncStepPreview'
import { JellyfinSyncStepSearch } from './JellyfinSyncStepSearch'
import { JellyfinSyncStepSeries } from './JellyfinSyncStepSeries'
import studioStyles from '../../AdminStudio.module.css'

interface JellyfinSyncPanelProps {
  anime: AnimeDetail
  model: JellyfinSyncModel
  onBeforeAction: () => void
  onSynced: () => Promise<void>
}

/**
 * Vierstufiger Assistent, um die Jellyfin-Verknüpfung eines Anime bewusst neu aufzubauen (Suchen
 * -> Treffer wählen -> Vorschau prüfen -> Sync anwenden). Jeder Schritt ist eine eigene
 * Unterkomponente (JellyfinSyncStep*.tsx); dieser Orchestrator hält nur den gemeinsamen
 * Assistenten-Zustand und die abgeleiteten Freigabe-Flags (deriveJellyfinSyncPanelState).
 */
export function JellyfinSyncPanel({ anime, model, onBeforeAction, onSynced }: JellyfinSyncPanelProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
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

  return (
    <section className={styles.syncCard}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Provider Sync</p>
          <h2 className={studioStyles.sectionTitle}>Jellyfin neu verbinden</h2>
          <p className={styles.description}>Suche die passende Jellyfin-Serie, lade eine Vorschau und übernimm die Verknüpfung erst danach bewusst.</p>
          <p className={styles.description}>Wenn nur ein Treffer gefunden wird, wird er automatisch vorausgewählt.</p>
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
        <JellyfinSyncStepSearch model={model} onSearch={handleSearch} />
        <JellyfinSyncStepSeries
          model={model}
          selectedSeriesID={selectedSeriesID}
          selectedSeries={selectedSeries}
          hasSearchResults={hasSearchResults}
          showSearchEmptyState={showSearchEmptyState}
        />
        <JellyfinSyncStepPreview
          model={model}
          selectedSeriesID={selectedSeriesID}
          hasFreshPreview={hasFreshPreview}
          onPreview={handlePreview}
        />
        <JellyfinSyncStepApply
          model={model}
          canSync={canSync}
          hasFreshPreview={hasFreshPreview}
          hasSyncablePreview={hasSyncablePreview}
          onRequestSync={handleRequestSync}
        />
      </div>

      {isConfirmOpen ? (
        <JellyfinSyncConfirmDialog
          selectedSeries={selectedSeries}
          previewResult={model.previewResult}
          cleanupVersions={model.cleanupVersions}
          isSyncing={model.isSyncing}
          syncFeedback={model.syncFeedback}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={handleConfirmSync}
        />
      ) : null}
    </section>
  )
}
