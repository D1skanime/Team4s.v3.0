import { Spinner } from '@/components/ui'
import type { AdminAnimeJellyfinPreviewResult, AdminJellyfinSeriesSearchItem } from '@/types/admin'

import studioStyles from '../../AdminStudio.module.css'
import { renderStepFeedback, type StepFeedback } from './jellyfinSyncPanelHelpers'
import styles from './JellyfinSyncPanel.module.css'

interface JellyfinSyncConfirmDialogProps {
  selectedSeries: AdminJellyfinSeriesSearchItem | null
  previewResult: AdminAnimeJellyfinPreviewResult | null
  cleanupVersions: boolean
  isSyncing: boolean
  syncFeedback: StepFeedback
  onCancel: () => void
  onConfirm: () => void
}

/** Bestätigungsdialog vor dem tatsächlichen Bulk-Sync (Assistentenschritt 4). */
export function JellyfinSyncConfirmDialog({
  selectedSeries,
  previewResult,
  cleanupVersions,
  isSyncing,
  syncFeedback,
  onCancel,
  onConfirm,
}: JellyfinSyncConfirmDialogProps) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={() => !isSyncing && onCancel()}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jellyfin-sync-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalBody}>
          <p className={styles.eyebrow}>Bestätigung</p>
          <h3 id="jellyfin-sync-confirm-title" className={styles.modalTitle}>
            Sync wirklich anwenden?
          </h3>
          <p className={styles.modalText}>
            {selectedSeries ? `Serie: ${selectedSeries.name}` : 'Die ausgewählte Jellyfin-Serie'} wird jetzt als saisonweiter Bulk-Sync mit diesem Anime synchronisiert.
          </p>
          {cleanupVersions ? (
            <div className={styles.warningBox}>Bestehende Jellyfin-Versionen werden vor dem Re-Import entfernt.</div>
          ) : null}
          {previewResult && previewResult.matched_episodes > 0 ? (
            <p className={styles.modalText}>
              {previewResult.accepted_unique_episodes} Episoden werden importiert/aktualisiert.
            </p>
          ) : null}
          {renderStepFeedback(syncFeedback)}
        </div>
        <div className={styles.modalActions}>
          <button
            className={`${studioStyles.button} ${studioStyles.buttonSecondary}`}
            type="button"
            onClick={onCancel}
            disabled={isSyncing}
          >
            Abbrechen
          </button>
          <button
            className={`${studioStyles.button} ${studioStyles.buttonDanger}`}
            type="button"
            onClick={onConfirm}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Spinner size="sm" label="" />
                Staffel wird synchronisiert...
              </>
            ) : (
              'Staffel jetzt synchronisieren'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
