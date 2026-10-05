import { Ban, Check, X } from 'lucide-react'

import { Button } from '@/components/ui'
import type { FansubMediaReviewStatus } from '@/lib/api'

import styles from './GroupMediaReviewSection.module.css'

interface GroupMediaReviewBulkActionBarProps {
  selectedMediaIds: Set<number>
  bulkSavingStatus: FansubMediaReviewStatus | null
  bulkError: string | null
  handleBulkReview: (reviewStatus: FansubMediaReviewStatus) => void | Promise<void>
  clearSelection: () => void
}

export function GroupMediaReviewBulkActionBar({
  selectedMediaIds,
  bulkSavingStatus,
  bulkError,
  handleBulkReview,
  clearSelection,
}: GroupMediaReviewBulkActionBarProps) {
  const selectedCount = selectedMediaIds.size
  const isBulkSaving = bulkSavingStatus !== null

  return (
    <div className={styles.bulkActionBar} role="region" aria-label="Bulk-Aktionen für Medienauswahl">
      <div className={styles.bulkSummary}>
        <strong>{selectedCount} ausgewählt</strong>
        <span>Prüfstatus für die aktuelle Auswahl ändern</span>
      </div>
      {bulkError ? <p className={styles.bulkError} role="alert">{bulkError}</p> : null}
      <div className={styles.bulkActions}>
        <Button
          variant="success"
          size="sm"
          leftIcon={<Check size={16} />}
          loading={bulkSavingStatus === 'freigegeben'}
          disabled={isBulkSaving}
          onClick={() => void handleBulkReview('freigegeben')}
        >
          Freigeben
        </Button>
        <Button
          variant="danger"
          size="sm"
          leftIcon={<Ban size={16} />}
          loading={bulkSavingStatus === 'abgelehnt'}
          disabled={isBulkSaving}
          onClick={() => void handleBulkReview('abgelehnt')}
        >
          Ablehnen
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<X size={16} />}
          disabled={isBulkSaving}
          onClick={clearSelection}
        >
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
