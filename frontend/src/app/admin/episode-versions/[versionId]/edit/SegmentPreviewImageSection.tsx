'use client'

import { useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent } from 'react'
import { ImageIcon, RefreshCw, Upload } from 'lucide-react'

import { Badge, Button } from '@/components/ui'
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
 * D-11-Sektion "Vorschaubild" im Segment-Panel: aktuelles Bild + Herkunfts-Badge, Upload-
 * Dropzone, Trigger für den Release-Bild-Picker, "Automatisches Bild verwenden" (Phase 172,
 * Plan 172-08, UI-SPEC Screen 1). Rendert NICHTS, solange kein gespeichertes Segment existiert
 * (UI-SPEC Design-Entscheidung 3) -- State/Handler kommen vollständig aus
 * useSegmentPreviewImageHandlers, instanziiert in SegmenteTab.tsx.
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
  const [isDragging, setIsDragging] = useState(false)

  if (!editingSegment) {
    return null
  }

  const badge = editingSegment.preview_source ? BADGE_BY_SOURCE[editingSegment.preview_source] : null

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) onPreviewUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

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

      <div
        className={isDragging ? `${styles.dropzone} ${styles.dropzoneDragging}` : styles.dropzone}
        role="button"
        tabIndex={0}
        aria-label="Bild hierher ziehen oder klicken zum Hochladen"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleDropzoneKeyDown}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className={styles.dropzoneText}>Bild hierher ziehen oder klicken zum Hochladen</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Upload size={14} />}
          loading={isUploadingPreview}
          onClick={(event) => {
            event.stopPropagation()
            fileInputRef.current?.click()
          }}
        >
          Bild hochladen
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME}
          className={styles.hiddenInput}
          aria-label="Vorschaubild-Datei auswählen"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      <p className={styles.helpText}>Erlaubte Formate: JPG, PNG, WEBP · Max. 15 MB</p>
      <p className={styles.helpText}>Wird sofort übernommen und ist ohne Freigabe öffentlich sichtbar.</p>

      <div className={styles.actionsRow}>
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
