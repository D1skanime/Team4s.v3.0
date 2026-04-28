'use client'

import { useRef } from 'react'
import { X, Upload, FileVideo, XCircle } from 'lucide-react'

import type { AdminThemeSegment, AdminSegmentSourceType } from '@/types/admin'
import type { GenericSegmentThemeOption } from './useReleaseSegments'
import styles from './SegmenteTab.module.css'

export interface FormState {
  themeKind: string
  themeTitle: string
  startEpisode: string
  endEpisode: string
  startTime: string
  endTime: string
  sourceType: AdminSegmentSourceType
  sourceRef: string
  sourceLabel: string
}

interface SegmentEditPanelProps {
  editingSegment: AdminThemeSegment | null
  formState: FormState
  genericThemeOptions: GenericSegmentThemeOption[]
  isSaving: boolean
  formError: string | null
  isUploading: boolean
  isDeletingAsset: boolean
  uploadError: string | null
  onClose: () => void
  onFormChange: (patch: Partial<FormState>) => void
  onSave: () => void
  onAssetUpload: (file: File) => void
  onAssetDelete: () => void
}

export function SegmentEditPanel({
  editingSegment,
  formState,
  genericThemeOptions,
  isSaving,
  formError,
  isUploading,
  isDeletingAsset,
  uploadError,
  onClose,
  onFormChange,
  onSave,
  onAssetUpload,
  onAssetDelete,
}: SegmentEditPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <div className={styles.panelOverlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            {editingSegment ? 'Segment bearbeiten' : 'Neues Segment hinzufuegen'}
          </h3>
          <button type="button" className={styles.panelCloseButton} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {formError ? <div className={styles.panelError}>{formError}</div> : null}

        <div className={styles.panelField}>
          <label htmlFor="segment-type">Typ</label>
          <select
            id="segment-type"
            value={formState.themeKind}
            onChange={(e) => onFormChange({ themeKind: e.target.value })}
          >
            <option value="">-- Typ auswaehlen --</option>
            {genericThemeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.panelField}>
          <label htmlFor="segment-name">Name (optional)</label>
          <input
            id="segment-name"
            type="text"
            placeholder="z. B. Naruto OP 1"
            value={formState.themeTitle}
            onChange={(e) => onFormChange({ themeTitle: e.target.value })}
          />
          <span className={styles.sourceHelpText}>
            Gleicher Typ plus gleicher Name wird wiederverwendet. Ein neuer Name erzeugt bei Bedarf automatisch ein neues Theme.
          </span>
        </div>

        <div className={styles.panelField}>
          <label>Episodenbereich</label>
        </div>
        <div className={styles.panelFieldRow}>
          <div className={styles.panelField}>
            <label htmlFor="seg-ep-start">Von</label>
            <input
              id="seg-ep-start"
              type="number"
              min="1"
              placeholder="1"
              value={formState.startEpisode}
              onChange={(e) => onFormChange({ startEpisode: e.target.value })}
            />
          </div>
          <div className={styles.panelField}>
            <label htmlFor="seg-ep-end">Bis</label>
            <input
              id="seg-ep-end"
              type="number"
              min="1"
              placeholder="12"
              value={formState.endEpisode}
              onChange={(e) => onFormChange({ endEpisode: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.panelField}>
          <label>Zeitbereich im Video</label>
        </div>
        <div className={styles.panelFieldRow}>
          <div className={styles.panelField}>
            <label htmlFor="seg-time-start">Start</label>
            <input
              id="seg-time-start"
              type="text"
              placeholder="00:00:00"
              value={formState.startTime}
              onChange={(e) => onFormChange({ startTime: e.target.value })}
            />
          </div>
          <div className={styles.panelField}>
            <label htmlFor="seg-time-end">Ende</label>
            <input
              id="seg-time-end"
              type="text"
              placeholder="00:01:30"
              value={formState.endTime}
              onChange={(e) => onFormChange({ endTime: e.target.value })}
            />
          </div>
        </div>

        {/* Source type selector - explicit, no free Jellyfin picker */}
        <div className={styles.panelField}>
          <label htmlFor="seg-source-type">Quelle</label>
          <select
            id="seg-source-type"
            value={formState.sourceType}
            onChange={(e) => onFormChange({ sourceType: e.target.value as AdminSegmentSourceType })}
          >
            <option value="none">Keine Quelle</option>
            <option value="jellyfin_theme">Jellyfin Serien-Theme</option>
            <option value="release_asset">Datei aus Release-Ordner</option>
          </select>
          {formState.sourceType === 'none' ? (
            <p className={styles.sourceHelpText}>Keine externe Quelle — Zeitbereich wurde manuell ermittelt.</p>
          ) : formState.sourceType === 'jellyfin_theme' ? (
            <p className={styles.sourceHelpText}>Timing stammt aus einem Jellyfin Serien-Theme-Eintrag. Jellyfin-Verknuepfung wird in einer spaeten Phase editierbar.</p>
          ) : null}
        </div>

        {/* Segment-Asset-Sektion: nur bei release_asset */}
        {formState.sourceType === 'release_asset' ? (
          <div className={styles.assetSection}>
            <div className={styles.assetSectionHeader}>
              <FileVideo size={14} />
              Segment-Datei
            </div>

            {editingSegment?.source_ref ? (
              <div className={styles.assetExisting}>
                <div className={styles.assetExistingLabel}>
                  <FileVideo size={13} />
                  <span>{editingSegment.source_label ?? editingSegment.source_ref.split('/').pop() ?? 'Datei hinterlegt'}</span>
                </div>
                <p className={styles.assetExistingPath}>{editingSegment.source_ref}</p>
                <button
                  type="button"
                  className={styles.assetDeleteButton}
                  onClick={() => onAssetDelete()}
                  disabled={isDeletingAsset}
                >
                  <XCircle size={13} />
                  {isDeletingAsset ? 'Entfernt...' : 'Datei entfernen'}
                </button>
              </div>
            ) : editingSegment ? (
              <div className={styles.assetUploadArea}>
                <p className={styles.assetUploadFormats}>Erlaubte Formate: MP4, WebM, MKV, MP3, AAC, FLAC, OGG, OPUS, M4A &middot; Max. 150 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.webm,.mkv,.mp3,.aac,.flac,.ogg,.opus,.m4a,video/mp4,video/webm,video/x-matroska,audio/mpeg,audio/aac,audio/flac,audio/ogg,audio/mp4"
                  className={styles.assetFileInput}
                  id="segment-asset-file"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      onAssetUpload(file)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }
                  }}
                />
                <label
                  htmlFor="segment-asset-file"
                  className={`${styles.assetUploadButton} ${isUploading ? styles.assetUploadButtonBusy : ''}`}
                >
                  <Upload size={13} />
                  {isUploading ? 'Wird hochgeladen...' : 'Datei auswaehlen und hochladen'}
                </label>
              </div>
            ) : (
              <p className={styles.assetHintSave}>
                Segment zuerst speichern, danach kann hier eine Datei hochgeladen werden.
              </p>
            )}

            {uploadError ? (
              <div className={styles.assetError}>{uploadError}</div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.panelActions}>
          <button type="button" className={styles.panelCancelButton} onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className={styles.panelSaveButton} onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </>
  )
}
