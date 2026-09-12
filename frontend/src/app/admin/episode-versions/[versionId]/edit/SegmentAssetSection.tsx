'use client'

import { useRef } from 'react'
import { Upload, FileVideo, XCircle } from 'lucide-react'

import type { AdminThemeSegment, AdminSegmentSourceType, AdminSegmentLibraryCandidate } from '@/types/admin'
import type { FormState } from './SegmentEditPanel'
import {
  resolveLibraryCandidateLabel,
  resolveSegmentProvenance,
  resolveSegmentProvenanceDetails,
} from './SegmenteTab.helpers'
import styles from './SegmenteTab.module.css'

interface SegmentAssetSectionProps {
  formState: FormState
  onFormChange: (patch: Partial<FormState>) => void
  editingSegment: AdminThemeSegment | null
  isSaving: boolean
  isUploading: boolean
  isDeletingAsset: boolean
  isLoadingReuseCandidates: boolean
  isAttachingReuse: boolean
  uploadError: string | null
  reuseCandidates: AdminSegmentLibraryCandidate[]
  reuseError: string | null
  pendingUploadFile: File | null
  onPendingUploadFileChange: (file: File | null) => void
  onAssetUpload: (file: File) => void
  onAssetDelete: () => void
  onAttachReuseCandidate: (candidate: AdminSegmentLibraryCandidate) => void
}

/**
 * Provenance/Fallback-Wahl (Source-Type-Selector) plus die gesamte Release-Asset-Sektion
 * (Upload/Reuse), aus SegmentEditPanel.tsx extrahiert (Phase 156, Plan 156-14,
 * Dateigroessen-Vorgabe aus 156-UAT.md). Beide Bloecke sind gekoppelt ueber
 * `formState.sourceType` und bleiben deshalb in derselben Komponente. `fileInputRef` lebt
 * hier, da nur diese Sektion Datei-Inputs rendert.
 */
export function SegmentAssetSection({
  formState,
  onFormChange,
  editingSegment,
  isSaving,
  isUploading,
  isDeletingAsset,
  isLoadingReuseCandidates,
  isAttachingReuse,
  uploadError,
  reuseCandidates,
  reuseError,
  pendingUploadFile,
  onPendingUploadFileChange,
  onAssetUpload,
  onAssetDelete,
  onAttachReuseCandidate,
}: SegmentAssetSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const provenance = editingSegment ? resolveSegmentProvenance(editingSegment) : null
  const provenanceDetails = editingSegment ? resolveSegmentProvenanceDetails(editingSegment) : null

  return (
    <>
      {/* Source type selector — Episode-Version/Jellyfin is default; upload is explicit fallback */}
      <div className={styles.panelField}>
        <label htmlFor="seg-source-type">Provenance / Fallback-Wahl</label>
        <select
          id="seg-source-type"
          value={formState.sourceType}
          onChange={(e) => onFormChange({ sourceType: e.target.value as AdminSegmentSourceType })}
        >
          <option value="none">Episode-Version / Jellyfin-Stream (Standard)</option>
          <option value="release_asset">Hochgeladener Fallback (eigene Datei)</option>
          <option value="jellyfin_theme">Jellyfin Serien-Theme (Legacy)</option>
        </select>
        {formState.sourceType === 'none' ? (
          <p className={styles.sourceHelpText}>Standard: Playback läuft über den Jellyfin-Stream der aktuellen Episode-Version. Kein Upload erforderlich.</p>
        ) : formState.sourceType === 'release_asset' ? (
          <p className={styles.sourceHelpText}>Hochgeladener Fallback: Eine eigene Segment-Datei wird als explizit gewählte Playback-Quelle hinterlegt.</p>
        ) : formState.sourceType === 'jellyfin_theme' ? (
          <p className={styles.sourceHelpText}>Legacy: Timing stammt aus einem Jellyfin Serien-Theme-Eintrag.</p>
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
              {provenance ? (
                <p className={styles.sourceHelpText}>
                  {provenance}
                  {provenanceDetails ? ` · ${provenanceDetails}` : ''}
                </p>
              ) : null}
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
            <div style={{ display: 'grid', gap: 12 }}>
              <div className={styles.assetUploadArea}>
                <p className={styles.sourceHelpText}>
                  Vorhandene Library-Datei wiederverwenden oder unten eine neue Datei hochladen.
                </p>
                {isLoadingReuseCandidates ? (
                  <p className={styles.sourceHelpText}>Library-Kandidaten werden geladen...</p>
                ) : reuseCandidates.length > 0 ? (
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {reuseCandidates.map((candidate) => (
                      <div
                        key={candidate.asset_id}
                        style={{
                          border: '1px solid #d7d7dd',
                          borderRadius: 10,
                          padding: '10px 12px',
                          display: 'grid',
                          gap: 4,
                          background: '#fafafc',
                        }}
                      >
                        <strong style={{ fontSize: 13 }}>{resolveLibraryCandidateLabel(candidate)}</strong>
                        <span className={styles.sourceHelpText}>
                          {candidate.anime_source_provider}:{candidate.anime_source_external_id} · {candidate.segment_kind.toUpperCase()}
                          {candidate.segment_name?.trim() ? ` · ${candidate.segment_name.trim()}` : ''}
                        </span>
                        <span className={styles.sourceHelpText}>
                          Aktiv verwendet: {candidate.active_assignment_count} · Herkunft: {candidate.asset_attach_source}
                        </span>
                        <button
                          type="button"
                          className={styles.assetUploadButton}
                          disabled={isAttachingReuse}
                          onClick={() => onAttachReuseCandidate(candidate)}
                        >
                          <FileVideo size={13} />
                          {isAttachingReuse ? 'Verknüpft...' : 'Dieses Library-Asset verwenden'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.sourceHelpText}>Noch keine wiederverwendbare Library-Datei für diesen AniSearch/Group-Kontext gefunden.</p>
                )}
                {reuseError ? <div className={styles.assetError}>{reuseError}</div> : null}
              </div>

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
                  {isUploading ? 'Wird hochgeladen...' : 'Neue Datei auswählen und hochladen'}
                </label>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className={styles.assetUploadArea}>
                <p className={styles.assetUploadFormats}>Erlaubte Formate: MP4, WebM, MKV, MP3, AAC, FLAC, OGG, OPUS, M4A &middot; Max. 150 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.webm,.mkv,.mp3,.aac,.flac,.ogg,.opus,.m4a,video/mp4,video/webm,video/x-matroska,audio/mpeg,audio/aac,audio/flac,audio/ogg,audio/mp4"
                  className={styles.assetFileInput}
                  id="segment-asset-file-create"
                  disabled={isSaving}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      onPendingUploadFileChange(file)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }
                  }}
                />
                <label
                  htmlFor="segment-asset-file-create"
                  className={`${styles.assetUploadButton} ${isSaving ? styles.assetUploadButtonBusy : ''}`}
                >
                  <Upload size={13} />
                  Datei für neues Segment auswählen
                </label>
                {pendingUploadFile ? (
                  <div className={styles.assetExisting} style={{ marginTop: 10 }}>
                    <div className={styles.assetExistingLabel}>
                      <FileVideo size={13} />
                      <span>{pendingUploadFile.name}</span>
                    </div>
                    <p className={styles.sourceHelpText}>
                      Das Segment wird erstellt und die Datei direkt danach automatisch hochgeladen.
                    </p>
                    <button
                      type="button"
                      className={styles.assetDeleteButton}
                      onClick={() => onPendingUploadFileChange(null)}
                      disabled={isSaving}
                    >
                      <XCircle size={13} />
                      Auswahl entfernen
                    </button>
                  </div>
                ) : (
                  <p className={styles.assetHintSave}>
                    Optional kannst du die Segment-Datei schon jetzt auswählen. Beim Speichern wird beides in einem Schritt angelegt.
                  </p>
                )}
              </div>

              <p className={styles.sourceHelpText}>
                Wiederverwendbare Library-Dateien können nach dem ersten Speichern zusätzlich verknüpft werden.
              </p>
            </div>
          )}

          {uploadError ? (
            <div className={styles.assetError}>{uploadError}</div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
