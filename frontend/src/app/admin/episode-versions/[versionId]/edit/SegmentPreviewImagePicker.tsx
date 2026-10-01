'use client'

import { Button, EmptyState, ErrorState, LoadingState, Modal } from '@/components/ui'
import type { AdminSegmentPreviewImageCandidate } from '@/types/admin'
import styles from './SegmentPreviewImageSection.module.css'

export interface SegmentPreviewImagePickerProps {
  open: boolean
  onClose: () => void
  candidates: AdminSegmentPreviewImageCandidate[]
  isLoading: boolean
  error: string | null
  isAttaching: boolean
  onRetry: () => void
  onSelect: (candidate: AdminSegmentPreviewImageCandidate) => void
}

/**
 * Modal-Inhalt für "Aus Release-Bildern wählen" (D-11, UI-SPEC Screen 2). Eigene Datei, damit
 * SegmentPreviewImageSection.tsx klein bleibt (Phase 172, Plan 172-08).
 */
export function SegmentPreviewImagePicker({
  open,
  onClose,
  candidates,
  isLoading,
  error,
  isAttaching,
  onRetry,
  onSelect,
}: SegmentPreviewImagePickerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aus Release-Bildern wählen"
      description="Nur öffentliche, freigegebene Bilder der Release-Versionen, denen dieses Segment zugewiesen ist."
      size="lg"
    >
      {isLoading ? (
        <LoadingState
          compact
          title="Release-Bilder werden geladen"
          description="Die verfügbaren Bilder der zugewiesenen Release-Versionen werden geladen."
        />
      ) : error ? (
        <ErrorState
          title="Release-Bilder konnten nicht geladen werden"
          description={error}
          action={
            <Button variant="secondary" onClick={onRetry}>
              Erneut versuchen
            </Button>
          }
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          title="Keine Release-Bilder verfügbar"
          description="Für die zugewiesenen Release-Versionen dieses Segments sind aktuell keine öffentlichen, freigegebenen Bilder vorhanden."
        />
      ) : (
        <div className={styles.pickerGrid}>
          {candidates.map((candidate) => (
            <Button
              key={candidate.media_asset_id}
              type="button"
              variant="subtle"
              className={styles.pickerTile}
              disabled={isAttaching}
              aria-label={`Dieses Bild als Vorschaubild übernehmen (Version ${candidate.release_version_label})`}
              onClick={() => onSelect(candidate)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={candidate.thumbnail_url} alt="" className={styles.pickerTileImage} />
              <span className={styles.pickerTileCaption}>{`Version ${candidate.release_version_label}`}</span>
            </Button>
          ))}
        </div>
      )}
    </Modal>
  )
}
