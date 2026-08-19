'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Upload, FileVideo, XCircle } from 'lucide-react'

import { Switch, FormField, Input, Button } from '@/components/ui'
import type { AdminThemeSegment, AdminSegmentSourceType, AdminSegmentLibraryCandidate } from '@/types/admin'
import type { GenericSegmentThemeOption } from './useReleaseSegments'
import {
  formatTimeInput,
  parseFlexibleTimeInput,
  parsePositiveEpisodeInput,
  resolveLibraryCandidateLabel,
  resolveSegmentProvenance,
  resolveSegmentProvenanceDetails,
  findAssignedEpisodeNumber,
} from './SegmenteTab.helpers'
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
  previewStreamHref?: string | null
  currentReleaseVersionId: number | null
  onSaveOverride: (input: { startTime: string; endTime: string }) => void
  onRemoveOverride: () => void
  isSavingOverride: boolean
  overrideError: string | null
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
  previewStreamHref,
  currentReleaseVersionId,
  onSaveOverride,
  onRemoveOverride,
  isSavingOverride,
  overrideError,
  onClose,
  onFormChange,
  onPendingUploadFileChange,
  onSave,
  onAssetUpload,
  onAssetDelete,
  onAttachReuseCandidate,
}: SegmentEditPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [overrideEnabled, setOverrideEnabled] = useState(editingSegment?.has_episode_override === true)
  const [overrideStartTime, setOverrideStartTime] = useState(editingSegment?.start_time ?? '')

  // Override-Zustand pro geoeffnetem Segment zuruecksetzen (Panel-Instanz bleibt beim
  // Wechsel des editingSegment gemountet, siehe SegmenteTab.tsx openEditPanel/openAddPanel).
  useEffect(() => {
    setOverrideEnabled(editingSegment?.has_episode_override === true)
    setOverrideStartTime(editingSegment?.start_time ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSegment?.id])
  const provenance = editingSegment ? resolveSegmentProvenance(editingSegment) : null
  const provenanceDetails = editingSegment ? resolveSegmentProvenanceDetails(editingSegment) : null
  const startEpisodeValue = formState.startEpisode.trim()
  const endEpisodeValue = formState.endEpisode.trim()
  const startEpisodeNumber = parsePositiveEpisodeInput(formState.startEpisode)
  const endEpisodeNumber = parsePositiveEpisodeInput(formState.endEpisode)
  const isMissingEpisodeRange = startEpisodeValue === '' || endEpisodeValue === ''
  const hasInvalidEpisodeValue =
    (startEpisodeValue !== '' && startEpisodeNumber == null) ||
    (endEpisodeValue !== '' && endEpisodeNumber == null)
  const hasInvalidEpisodeRange =
    startEpisodeNumber != null && endEpisodeNumber != null && endEpisodeNumber < startEpisodeNumber
  const startSeconds = parseFlexibleTimeInput(formState.startTime)
  const endSeconds = parseFlexibleTimeInput(formState.endTime)
  const isMissingTimeRange = formState.startTime.trim() === '' || formState.endTime.trim() === ''
  const hasInvalidTimeInput =
    (formState.startTime.trim() !== '' && startSeconds == null) ||
    (formState.endTime.trim() !== '' && endSeconds == null)
  // Use segment's resolved playback duration as first authority; fall back to page-level version duration
  const effectiveDuration = editingSegment?.playback_duration_seconds ?? durationSeconds ?? null
  const exceedsDuration = effectiveDuration != null && endSeconds != null && endSeconds > effectiveDuration
  const exceedsMaxSegmentWindow = startSeconds != null && endSeconds != null && endSeconds - startSeconds > 240
  const hasInvalidTimeRange =
    (startSeconds != null && endSeconds != null && endSeconds <= startSeconds) ||
    exceedsMaxSegmentWindow

  // --- Zeit-Override-Block (UI-SPEC Surface 1, nur bei geteilten Segmenten) ---
  const isSharedSegment = editingSegment?.is_shared === true
  const currentEpisodeLabel =
    editingSegment && currentReleaseVersionId != null
      ? (findAssignedEpisodeNumber(editingSegment, currentReleaseVersionId) ?? '?')
      : '?'
  const overrideStartSeconds = parseFlexibleTimeInput(overrideStartTime)
  // Basis-Dauer (Basis-Ende minus Basis-Start) des geteilten Segments -- die Endzeit eines
  // Per-Folge-Overrides folgt automatisch dieser Dauer, statt frei eingegeben zu werden.
  const baseStartSeconds = editingSegment?.start_time ? parseFlexibleTimeInput(editingSegment.start_time) : null
  const baseEndSeconds = editingSegment?.end_time ? parseFlexibleTimeInput(editingSegment.end_time) : null
  const baseDurationSeconds =
    baseStartSeconds != null && baseEndSeconds != null && baseEndSeconds > baseStartSeconds
      ? baseEndSeconds - baseStartSeconds
      : null
  const computedOverrideEndSeconds =
    overrideStartSeconds != null && baseDurationSeconds != null
      ? overrideStartSeconds + baseDurationSeconds
      : null
  const computedOverrideEndTime =
    computedOverrideEndSeconds != null ? formatTimeInput(computedOverrideEndSeconds) : null
  const overrideMissingTimeRange = overrideEnabled && overrideStartTime.trim() === ''
  const overrideHasInvalidTimeInput =
    overrideEnabled && overrideStartTime.trim() !== '' && overrideStartSeconds == null
  const overrideMissingBaseDuration = overrideEnabled && baseDurationSeconds == null
  const overrideExceedsDuration =
    overrideEnabled &&
    effectiveDuration != null &&
    computedOverrideEndSeconds != null &&
    computedOverrideEndSeconds > effectiveDuration
  const overrideLocalError = overrideMissingTimeRange
    ? 'Bitte Start ausfüllen.'
    : overrideHasInvalidTimeInput
      ? 'Zeitangabe muss z. B. 1:20, 00:01:20 oder Sekunden sein.'
      : overrideMissingBaseDuration
        ? 'Basis-Zeitbereich des Segments fehlt.'
        : overrideExceedsDuration
          ? 'Start + Basis-Dauer überschreitet die bekannte Videodauer.'
          : null
  const overrideDisplayError = overrideLocalError ?? overrideError

  function handleOverrideToggle(next: boolean) {
    if (!next) {
      onRemoveOverride()
    }
    setOverrideEnabled(next)
  }

  function handleRemoveOverrideClick() {
    const confirmed = window.confirm(
      `Override entfernen? Folge ${currentEpisodeLabel} verwendet danach wieder die Basis-Zeit des geteilten Segments.`,
    )
    if (confirmed) onRemoveOverride()
  }

  function handleSaveClick() {
    onSave()
    if (isSharedSegment && overrideEnabled && overrideStartSeconds != null && computedOverrideEndTime != null) {
      onSaveOverride({ startTime: formatTimeInput(overrideStartSeconds), endTime: computedOverrideEndTime })
    }
  }

  const saveDisabled =
    isSaving ||
    isSavingOverride ||
    isMissingEpisodeRange ||
    hasInvalidEpisodeValue ||
    hasInvalidEpisodeRange ||
    isMissingTimeRange ||
    hasInvalidTimeInput ||
    hasInvalidTimeRange ||
    overrideMissingTimeRange ||
    overrideHasInvalidTimeInput ||
    overrideMissingBaseDuration ||
    overrideExceedsDuration
  const runtimeKnown = effectiveDuration != null
  const runtimeFromPlayback = editingSegment?.playback_duration_seconds != null
  const renderStatus =
    editingSegment?.playback_source_kind === 'uploaded_asset'
      ? 'Fallback-Datei'
      : editingSegment?.render_status === 'ready'
        ? 'Bereit'
        : editingSegment?.render_status === 'queued' || editingSegment?.render_status === 'rendering'
          ? 'Wird vorbereitet'
          : editingSegment?.render_status === 'failed'
            ? 'Fehlgeschlagen'
            : editingSegment?.render_status === 'stale'
              ? 'Veraltet'
              : 'Nicht vorbereitet'

  // Parse backend validation errors for start_time/end_time from formError
  const isStartTimeError = formError != null && (formError.toLowerCase().includes('start') || formError.toLowerCase().includes('start_time'))
  const isEndTimeError = formError != null && (formError.toLowerCase().includes('end') || formError.toLowerCase().includes('end_time') || formError.toLowerCase().includes('ende'))

  return (
    <>
      <div className={styles.panelOverlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            {editingSegment ? 'Segment bearbeiten' : 'Neues Segment hinzufügen'}
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
            <option value="">-- Typ auswählen --</option>
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
          <span className={styles.sourceHelpText}>
            Von und Bis werden gespeichert. Für eine einzelne Folge beide Felder gleich setzen.
          </span>
          <span className={styles.sourceHelpText}>
            Wird beim Speichern automatisch allen Folgen im Bereich zugewiesen — pro Ausreißer-Folge
            kann die Startzeit einzeln überschrieben werden.
          </span>
        </div>
        <div className={styles.panelFieldRow}>
          <div className={styles.panelField}>
            <label htmlFor="seg-ep-start">Von</label>
            <input
              id="seg-ep-start"
              type="number"
              min="1"
              placeholder="z. B. 1"
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
              placeholder="z. B. 12"
              value={formState.endEpisode}
              onChange={(e) => onFormChange({ endEpisode: e.target.value })}
            />
          </div>
        </div>
        {isMissingEpisodeRange ? (
          <div className={styles.assetError}>
            Bitte Von und Bis ausfüllen. Für eine einzelne Folge beide Felder gleich setzen.
          </div>
        ) : hasInvalidEpisodeValue ? (
          <div className={styles.assetError}>
            Episoden müssen positive ganze Zahlen sein.
          </div>
        ) : hasInvalidEpisodeRange ? (
          <div className={styles.assetError}>
            Bis muss größer oder gleich Von sein.
          </div>
        ) : null}

        <div className={styles.panelField}>
          <label>{isSharedSegment ? 'Basis-Zeitbereich (gilt für alle zugewiesenen Folgen)' : 'Zeitbereich im Video'}</label>
          <span className={styles.sourceHelpText}>
            Eingabe einfach als `1:20`, `12:03` oder Sekunden.{' '}
            {runtimeKnown
              ? <>Videodauer: <strong>{formatTimeInput(effectiveDuration!)}</strong>{runtimeFromPlayback ? ' (aus Jellyfin/Release)' : ' (aus Version)'}. Das Ende wird automatisch auf diese Grenze begrenzt.</>
              : 'Keine reale Laufzeit bekannt — Zeitbereich kann frei eingegeben werden.'}
          </span>
        </div>
        <div className={styles.panelFieldRow}>
          <div className={styles.panelField}>
            <label htmlFor="seg-time-start">Start</label>
            <input
              id="seg-time-start"
              type="text"
              inputMode="numeric"
              placeholder="z. B. 0:00"
              value={formState.startTime}
              onChange={(e) => onFormChange({ startTime: e.target.value })}
              onBlur={(e) => {
                const parsed = parseFlexibleTimeInput(e.target.value)
                if (parsed != null) onFormChange({ startTime: formatTimeInput(parsed) })
              }}
              style={isStartTimeError ? { borderColor: '#c0392b' } : undefined}
            />
            {isStartTimeError ? (
              <span className={styles.assetError} style={{ display: 'block', marginTop: 4 }}>{formError}</span>
            ) : null}
          </div>
          <div className={styles.panelField}>
            <label htmlFor="seg-time-end">Ende</label>
            <input
              id="seg-time-end"
              type="text"
              inputMode="numeric"
              placeholder="z. B. 1:20"
              value={formState.endTime}
              onChange={(e) => onFormChange({ endTime: e.target.value })}
              onBlur={(e) => {
                const parsed = parseFlexibleTimeInput(e.target.value)
                if (parsed == null) return
                const clamped = effectiveDuration != null ? Math.min(parsed, effectiveDuration) : parsed
                onFormChange({ endTime: formatTimeInput(clamped) })
              }}
              style={isEndTimeError ? { borderColor: '#c0392b' } : undefined}
            />
            {isEndTimeError ? (
              <span className={styles.assetError} style={{ display: 'block', marginTop: 4 }}>{formError}</span>
            ) : null}
          </div>
        </div>
        {isMissingTimeRange ? (
          <div className={styles.assetError}>
            Bitte Start und Ende ausfüllen.
          </div>
        ) : hasInvalidTimeInput ? (
          <div className={styles.assetError}>
            Zeitangaben müssen z. B. 1:20, 00:01:20 oder Sekunden sein.
          </div>
        ) : null}
        {exceedsDuration ? (
          <div className={styles.assetError}>
            Ende liegt über der bekannten Videodauer und wird beim Verlassen des Felds auf {formatTimeInput(effectiveDuration!)} begrenzt.
          </div>
        ) : null}
        {startSeconds != null && endSeconds != null && endSeconds <= startSeconds ? (
          <div className={styles.assetError}>
            Ende muss nach dem Start liegen.
          </div>
        ) : null}
        {exceedsMaxSegmentWindow ? (
          <div className={styles.assetError}>
            Segment-Zeitbereich darf maximal 4 Minuten lang sein.
          </div>
        ) : null}

        {/* Per-Folge Zeit-Override (UI-SPEC Surface 1) — nur bei geteilten Segmenten */}
        {isSharedSegment ? (
          <div className={styles.panelField}>
            <Switch
              checked={overrideEnabled}
              onCheckedChange={handleOverrideToggle}
              label="Zeit nur für diese Folge abweichend setzen"
              disabled={isSavingOverride}
            />
            {overrideEnabled ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  Zeit-Override für Folge {currentEpisodeLabel}
                </h4>
                <FormField
                  label={`Start (Folge ${currentEpisodeLabel})`}
                  htmlFor="segment-override-start"
                  hint="Nur Startzeit — Dauer bleibt gleich wie Basis. Ende wird automatisch berechnet."
                  error={overrideDisplayError ?? undefined}
                >
                  <Input
                    id="segment-override-start"
                    type="text"
                    inputMode="numeric"
                    placeholder="z. B. 0:00"
                    value={overrideStartTime}
                    onChange={(e) => setOverrideStartTime(e.target.value)}
                    onBlur={(e) => {
                      const parsed = parseFlexibleTimeInput(e.target.value)
                      if (parsed != null) setOverrideStartTime(formatTimeInput(parsed))
                    }}
                  />
                </FormField>
                <p className={styles.sourceHelpText}>
                  {`Ende (automatisch): ${computedOverrideEndTime ?? '—'} · gleiche Dauer wie Basis (${formatTimeInput(baseDurationSeconds ?? 0)})`}
                </p>
                <p className={styles.sourceHelpText}>Nur Startzeit — Dauer bleibt gleich wie Basis</p>
                {editingSegment?.has_episode_override === true ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRemoveOverrideClick}
                    disabled={isSavingOverride}
                  >
                    Override entfernen
                  </Button>
                ) : null}
              </div>
            ) : null}
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

        {/* Segmentstream preview */}
        {editingSegment ? (
          <div className={styles.previewSection}>
            <div className={styles.assetSectionHeader}>
              <FileVideo size={14} />
              Segment-Vorschau
            </div>
            {previewStreamHref ? (
              <video
                key={previewStreamHref}
                className={styles.previewVideo}
                src={previewStreamHref}
                controls
                preload="metadata"
              />
            ) : (
              <div className={styles.previewStatus}>{renderStatus}</div>
            )}
            <p className={styles.sourceHelpText}>
              {previewStreamHref
                ? 'Spielt den serverseitig vorbereiteten Segmentstream ab.'
                : editingSegment.render_error_message || 'Der Segmentstream ist noch nicht bereit.'}
            </p>
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

        <div className={styles.panelActions}>
          <button type="button" className={styles.panelCancelButton} onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className={styles.panelSaveButton} onClick={handleSaveClick} disabled={saveDisabled}>
            {isSaving || isSavingOverride ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </>
  )
}
