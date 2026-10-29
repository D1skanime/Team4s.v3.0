import { Spinner } from '@/components/ui'
import type { AdminAnimeJellyfinSyncResult } from '@/types/admin'

import studioStyles from '../../AdminStudio.module.css'
import { type JellyfinSyncModel, renderStepFeedback } from './jellyfinSyncPanelHelpers'
import styles from './JellyfinSyncPanel.module.css'

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
        <p className={studioStyles.summaryLabel}>Gelöscht</p>
        <p className={studioStyles.summaryValue}>{result.deleted_versions ?? 0}</p>
      </div>
    </div>
  )
}

interface JellyfinSyncStepApplyProps {
  model: JellyfinSyncModel
  canSync: boolean
  hasFreshPreview: boolean
  hasSyncablePreview: boolean
  onRequestSync: () => void
}

/** Assistentenschritt 4: geprüfte Vorschau als Bulk-Sync auf den Anime anwenden. */
export function JellyfinSyncStepApply({ model, canSync, hasFreshPreview, hasSyncablePreview, onRequestSync }: JellyfinSyncStepApplyProps) {
  return (
    <section className={styles.stepPanel}>
      <div className={styles.stepPanelHeader}>
        <span className={styles.stepIndex}>4</span>
        <div className={styles.stepPanelHeading}>
          <h3 className={styles.stepTitle}>Sync anwenden</h3>
          <p className={styles.stepHelper}>Erst wenn die Vorschau gut aussieht, wird die Verknüpfung übernommen.</p>
        </div>
      </div>

      {renderStepFeedback(model.syncFeedback)}

      <div className={styles.stepActions}>
        <button
          className={`${studioStyles.button} ${studioStyles.buttonDanger}`}
          type="button"
          onClick={onRequestSync}
          disabled={!canSync}
        >
          {model.isSyncing ? (
            <>
              <Spinner size="sm" label="" />
              Sync läuft...
            </>
          ) : (
            'Verknüpfen & synchronisieren'
          )}
        </button>
        <span className={styles.actionHint}>
          {canSync
            ? 'Öffnet zuerst die Bestätigung.'
            : hasFreshPreview && !hasSyncablePreview
              ? 'Diese Vorschau enthält keine importierbaren Episoden.'
              : 'Bitte zuerst eine aktuelle Vorschau laden.'}
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
  )
}
