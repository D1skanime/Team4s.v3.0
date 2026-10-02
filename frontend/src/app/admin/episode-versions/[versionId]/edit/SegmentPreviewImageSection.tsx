'use client'

import { useRef } from 'react'
import { ImageIcon, RefreshCw, Upload } from 'lucide-react'

import { Badge, Button, Input } from '@/components/ui'
import type { AdminSegmentPreviewImageCandidate, AdminThemeSegment } from '@/types/admin'
import { SegmentPreviewImagePicker } from './SegmentPreviewImagePicker'
import styles from './SegmentPreviewImageSection.module.css'

const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp'

const BADGE_BY_SOURCE: Record<string, { variant: 'info' | 'success' | 'warning'; label: string }> = {
  manual: { variant: 'info', label: 'Manuell' },
  auto: { variant: 'success', label: 'Automatisch' },
  fallback: { variant: 'warning', label: 'Standardbild' },
}

export interface SegmentPreviewImageSectionProps {
  editingSegment: AdminThemeSegment | null
  isUploadingPreview: boolean
  previewUploadError: string | null
  isPickerOpen: boolean
  pickerCandidates: AdminSegmentPreviewImageCandidate[]
  isLoadingPickerCandidates: boolean
  pickerError: string | null
  isAttachingPreview: boolean
  isResettingPreview: boolean
  successMessage: string | null
  onPreviewUpload: (file: File) => void
  onOpenPreviewPicker: () => void
  onClosePreviewPicker: () => void
  onAttachPreviewCandidate: (candidate: AdminSegmentPreviewImageCandidate) => void
  onResetPreview: () => void
  onDismissSuccess: () => void
}

/**
 * D-11-Sektion "Vorschaubild" im Segment-Panel: aktuelles Bild + Herkunfts-Badge, Dateiauswahl
 * fuer den globalen Uploader, Release-Bild-Picker und "Automatisches Bild verwenden" (Phase 172).
 * Rendert NICHTS, solange kein gespeichertes Segment existiert. State/Handler kommen aus
 * useSegmentPreviewImageHandlers (sectionProps).
 */
export function SegmentPreviewImageSection({
  editingSegment,
  isUploadingPreview,
  previewUploadError,
  isPickerOpen,
  pickerCandidates,
  isLoadingPickerCandidates,
  pickerError,
  isAttachingPreview,
  isResettingPreview,
  successMessage,
  onPreviewUpload,
  onOpenPreviewPicker,
  onClosePreviewPicker,
  onAttachPreviewCandidate,
  onResetPreview,
  onDismissSuccess,
}: SegmentPreviewImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!editingSegment) {
    return null
  }

  const badge = editingSegment.preview_source ? BADGE_BY_SOURCE[editingSegment.preview_source] : null

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h4 className={styles.heading}>Vorschaubild</h4>
        <p className={styles.scopeHint}>Gilt für alle Folgen, denen dieses Segment zugewiesen ist.</p>
      </div>

      <div className={styles.previewRow}>
        {editingSegment.preview_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={editingSegment.preview_url} alt="" className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <ImageIcon size={24} />
            <span>Kein Vorschaubild verfügbar</span>
          </div>
        )}
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </div>

      <div className={styles.actionsRow}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Upload size={14} />}
          loading={isUploadingPreview}
          onClick={() => fileInputRef.current?.click()}
        >
          Bild hochladen
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME}
          hidden
          aria-label="Vorschaubild-Datei auswählen"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onPreviewUpload(file)
            event.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<ImageIcon size={14} />}
          onClick={onOpenPreviewPicker}
        >
          Aus Release-Bildern wählen
        </Button>
        {editingSegment.preview_source === 'manual' ? (
          <Button
            type="button"
            variant="subtle"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            loading={isResettingPreview}
            onClick={onResetPreview}
          >
            Automatisches Bild verwenden
          </Button>
        ) : null}
      </div>

      <p className={styles.helpText}>Erlaubte Formate: JPG, PNG, WEBP (nicht animiert) · Max. 50 MB</p>
      <p className={styles.helpText}>Wird sofort übernommen und ist ohne Freigabe öffentlich sichtbar.</p>

      {successMessage ? (
        <div className={styles.statusRow}>
          <p className={styles.successMessage} role="status">{successMessage}</p>
          <Button type="button" variant="text" size="sm" onClick={onDismissSuccess}>
            Schließen
          </Button>
        </div>
      ) : previewUploadError ? (
        <p className={styles.errorMessage} role="alert">{previewUploadError}</p>
      ) : null}

      <SegmentPreviewImagePicker
        open={isPickerOpen}
        onClose={onClosePreviewPicker}
        candidates={pickerCandidates}
        isLoading={isLoadingPickerCandidates}
        error={pickerError}
        isAttaching={isAttachingPreview}
        onRetry={onOpenPreviewPicker}
        onSelect={onAttachPreviewCandidate}
      />
    </div>
  )
}
