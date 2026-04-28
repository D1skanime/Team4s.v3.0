'use client'

import { useRef } from 'react'
import { X, Upload, FileVideo, XCircle } from 'lucide-react'

import type { AdminThemeSegment, AdminSegmentSourceType, AdminSegmentLibraryCandidate } from '@/types/admin'
import type { GenericSegmentThemeOption } from './useReleaseSegments'
import { formatTimeInput, parseFlexibleTimeInput, resolveLibraryCandidateLabel, resolveSegmentProvenance, resolveSegmentProvenanceDetails } from './SegmenteTab.helpers'
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
  pendingUploadFile: File | null
  durationSeconds?: number | null
  genericThemeOptions: GenericSegmentThemeOption[]
  isSaving: boolean
  formError: string | null
  isUploading: boolean
  isDeletingAsset: boolean
  isLoadingReuseCandidates: boolean
  isAttachingReuse: boolean
  uploadError: string | null
  reuseCandidates: AdminSegmentLibraryCandidate[]
  reuseError: string | null
  onClose: () => void
  onFormChange: (patch: Partial<FormState>) => void
  onPendingUploadFileChange: (file: File | null) => void
  onSave: () => void
  onAssetUpload: (file: File) => void
  onAssetDelete: () => void
  onAttachReuseCandidate: (candidate: AdminSegmentLibraryCandidate) => void
}

export function SegmentEditPanel({
  editingSegment,
  formState,
  pendingUploadFile,
  durationSeconds,
  genericThemeOptions,
  isSaving,
  formError,
  isUploading,
  isDeletingAsset,
  isLoadingReuseCandidates,
  isAttachingReuse,
  uploadError,
  reuseCandidates,
  reuseError,
  onClose,
  onFormChange,
  onPendingUploadFileChange,
  onSave,
  onAssetUpload,
  onAssetDelete,
  onAttachReuseCandidate,
}: SegmentEditPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const provenance = editingSegment ? resolveSegmentProvenance(editingSegment) : null
  const provenanceDetails = editingSegment ? resolveSegmentProvenanceDetails(editingSegment) : null
  const startSeconds = parseFlexibleTimeInput(formState.startTime)
  const endSeconds = parseFlexibleTimeInput(formState.endTime)
  const exceedsDuration = durationSeconds != null && endSeconds != null && endSeconds > durationSeconds

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
          <span className={styles.sourceHelpText}>
            Eingabe einfach als `1:20`, `12:03` oder Sekunden. {durationSeconds != null ? `Videodauer: ${formatTimeInput(durationSeconds)}.` : 'Wenn bekannt, wird das Ende automatisch auf die Videodauer begrenzt.'}
          </span>
        </div>
        <div className={styles.panelFieldRow}>
          <div className={styles.panelField}>
            <label htmlFor="seg-time-start">Start</label>
            <input
              id="seg-time-start"
              type="text"
              inputMode="numeric"
              placeholder="0:00"
              value={formState.startTime}
              onChange={(e) => onFormChange({ startTime: e.target.value })}
              onBlur={(e) => {
                const parsed = parseFlexibleTimeInput(e.target.value)
                if (parsed != null) onFormChange({ startTime: formatTimeInput(parsed) })
              }}
            />
          </div>
          <div className={styles.panelField}>
            <label htmlFor="seg-time-end">Ende</label>
            <input
              id="seg-time-end"
              type="text"
              inputMode="numeric"
              placeholder="1:20"
              value={formState.endTime}
              onChange={(e) => onFormChange({ endTime: e.target.value })}
              onBlur={(e) => {
                const parsed = parseFlexibleTimeInput(e.target.value)
                if (parsed == null) return
                const clamped = durationSeconds != null ? Math.min(parsed, durationSeconds) : parsed
                onFormChange({ endTime: formatTimeInput(clamped) })
              }}
            />
          </div>
        </div>
        {exceedsDuration ? (
          <div className={styles.assetError}>
            Ende liegt ueber der bekannten Videodauer und wird beim Verlassen des Felds auf {formatTimeInput(durationSeconds!)} begrenzt.
          </div>
        ) : null}
        {startSeconds != null && endSeconds != null && endSeconds <= startSeconds ? (
          <div className={styles.assetError}>
            Ende muss nach dem Start liegen.
          </div>
        ) : null}

        {/* Resolved playback status when editing an existing segment */}
        {editingSegment?.playback_source_kind ? (
          <div className={styles.panelField}>
            <label>Aktive Playback-Quelle (Standard)</label>
            <div style={{ padding: '8px 10px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: '#2a2a3a' }}>
              {editingSegment.playback_source_label ?? (
                editingSegment.playback_source_kind === 'episode_version'
                  ? 'Episode-Version / Jellyfin-Stream (Standard)'
                  : editingSegment.playback_source_kind === 'uploaded_asset'
                    ? 'hochgeladener Fallback'
                    : editingSegment.playback_source_kind === 'jellyfin_theme'
                      ? 'Jellyfin Serien-Theme'
                      : editingSegment.playback_source_kind
              )}
              {editingSegment.playback_duration_seconds != null ? (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#6b6b70' }}>
                  Laufzeit: {formatTimeInput(editingSegment.playback_duration_seconds)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

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
            <p className={styles.sourceHelpText}>Standard: Playback laeuft ueber den Jellyfin-Stream der aktuellen Episode-Version. Kein Upload erforderlich.</p>
          ) : formState.sourceType === 'release_asset' ? (
            <p className={styles.sourceHelpText}>Hochgeladener Fallback: Eine eigene Segment-Datei wird als explizit gew&auml;hlte Playback-Quelle hinterlegt.</p>
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
                            {isAttachingReuse ? 'Verknuepft...' : 'Dieses Library-Asset verwenden'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.sourceHelpText}>Noch keine wiederverwendbare Library-Datei fuer diesen AniSearch/Group-Kontext gefunden.</p>
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
                    {isUploading ? 'Wird hochgeladen...' : 'Neue Datei auswaehlen und hochladen'}
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
                    Datei fuer neues Segment auswaehlen
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
                      Optional kannst du die Segment-Datei schon jetzt auswaehlen. Beim Speichern wird beides in einem Schritt angelegt.
                    </p>
                  )}
                </div>

                <p className={styles.sourceHelpText}>
                  Wiederverwendbare Library-Dateien koennen nach dem ersten Speichern zusaetzlich verknuepft werden.
                </p>
              </div>
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
