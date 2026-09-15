'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import { FormField, Select } from '@/components/ui'
import type {
  AdminThemeSegment,
  AdminSegmentSourceType,
  AdminSegmentLibraryCandidate,
  AdminThemeSegmentContributorCandidate,
} from '@/types/admin'
import type { EpisodeVersionChapterHint } from '@/types/episodeVersion'
import type { GenericSegmentThemeOption } from './useReleaseSegments'
import {
  formatTimeInput,
  parseFlexibleTimeInput,
  parsePositiveEpisodeInput,
  findAssignedEpisodeNumber,
  findAssignedEpisodeHasOverride,
} from './SegmenteTab.helpers'
import { SegmentBasicFieldsSection } from './SegmentBasicFieldsSection'
import { SegmentOverrideField } from './SegmentOverrideField'
import { SegmentPlaybackPreviewSection } from './SegmentPlaybackPreviewSection'
import { SegmentAssetSection } from './SegmentAssetSection'
import { SegmentContributorsField } from './SegmentContributorsField'
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
  chapterHints?: EpisodeVersionChapterHint[] | null
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
  onRemoveOverride: () => void
  isSavingOverride: boolean
  overrideError: string | null
  onSetOrigin: (releaseVersionID: number) => void
  isSettingOrigin: boolean
  originError: string | null
  contributorCandidates: AdminThemeSegmentContributorCandidate[]
  isLoadingContributors: boolean
  isSavingContributors: boolean
  contributorsError: string | null
  onToggleContributor: (memberId: number, next: boolean) => void
  onClose: () => void
  onFormChange: (patch: Partial<FormState>) => void
  onPendingUploadFileChange: (file: File | null) => void
  onSave: (override?: { startTime: string; endTime: string }) => void
  onAssetUpload: (file: File) => void
  onAssetDelete: () => void
  onAttachReuseCandidate: (candidate: AdminSegmentLibraryCandidate) => void
}

export function SegmentEditPanel({
  chapterHints,
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
  onRemoveOverride,
  isSavingOverride,
  overrideError,
  onSetOrigin,
  isSettingOrigin,
  originError,
  contributorCandidates,
  isLoadingContributors,
  isSavingContributors,
  contributorsError,
  onToggleContributor,
  onClose,
  onFormChange,
  onPendingUploadFileChange,
  onSave,
  onAssetUpload,
  onAssetDelete,
  onAttachReuseCandidate,
}: SegmentEditPanelProps) {
  // PRO-FOLGE-Override (Quick-Task 260819-lm5, Runde 5 Korrektheits-Fix): NICHT das segmentweite
  // editingSegment.has_episode_override verwenden -- das ist bereits true, sobald IRGENDEINE
  // zugewiesene Folge einen Override hat, und wuerde faelschlich den Switch fuer JEDE Folge als
  // aktiv anzeigen bzw. den "Override entfernen"-Button auch ohne eigenen Override rendern.
  const currentReleaseHasOverride =
    editingSegment != null && currentReleaseVersionId != null
      ? findAssignedEpisodeHasOverride(editingSegment, currentReleaseVersionId)
      : false
  const [overrideEnabled, setOverrideEnabled] = useState(currentReleaseHasOverride)
  const [overrideStartTime, setOverrideStartTime] = useState(editingSegment?.start_time ?? '')

  // Override-Zustand pro geoeffnetem Segment zuruecksetzen (Panel-Instanz bleibt beim
  // Wechsel des editingSegment gemountet, siehe SegmenteTab.tsx openEditPanel/openAddPanel).
  useEffect(() => {
    setOverrideEnabled(currentReleaseHasOverride)
    setOverrideStartTime(editingSegment?.start_time ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSegment?.id])
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
    const override = isSharedSegment && overrideEnabled && overrideStartSeconds != null && computedOverrideEndTime != null
      ? { startTime: formatTimeInput(overrideStartSeconds), endTime: computedOverrideEndTime }
      : undefined
    onSave(override)
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

  // Only explicit time-field errors belong beside a time input. Assignment conflicts may
  // mention an existing ending segment without being an end_time validation error.
  const isTimeOrderError = formError === 'Ende muss nach dem Start liegen.'
  const isStartTimeError = isTimeOrderError || /\bstart_time\b|^Start-Zeit\b/i.test(formError ?? '')
  const isEndTimeError = isTimeOrderError || /\bend_time\b|^End-Zeit\b/i.test(formError ?? '')

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

        <SegmentBasicFieldsSection
          chapterHints={chapterHints}
          showChapterHints={editingSegment === null && formState.sourceType === 'none' && !pendingUploadFile}
          formState={formState}
          onFormChange={onFormChange}
          genericThemeOptions={genericThemeOptions}
          isSharedSegment={isSharedSegment}
          runtimeKnown={runtimeKnown}
          runtimeFromPlayback={runtimeFromPlayback}
          effectiveDuration={effectiveDuration}
          isStartTimeError={isStartTimeError}
          isEndTimeError={isEndTimeError}
          formError={formError}
          isMissingEpisodeRange={isMissingEpisodeRange}
          hasInvalidEpisodeValue={hasInvalidEpisodeValue}
          hasInvalidEpisodeRange={hasInvalidEpisodeRange}
          isMissingTimeRange={isMissingTimeRange}
          hasInvalidTimeInput={hasInvalidTimeInput}
          exceedsDuration={exceedsDuration}
          startSeconds={startSeconds}
          endSeconds={endSeconds}
          exceedsMaxSegmentWindow={exceedsMaxSegmentWindow}
        />

        <SegmentOverrideField
          isSharedSegment={isSharedSegment}
          overrideEnabled={overrideEnabled}
          onOverrideToggle={handleOverrideToggle}
          currentEpisodeLabel={currentEpisodeLabel}
          overrideStartTime={overrideStartTime}
          onOverrideStartTimeChange={setOverrideStartTime}
          computedOverrideEndTime={computedOverrideEndTime}
          baseDurationSeconds={baseDurationSeconds}
          overrideDisplayError={overrideDisplayError}
          currentReleaseHasOverride={currentReleaseHasOverride}
          onRemoveOverrideClick={handleRemoveOverrideClick}
          isSavingOverride={isSavingOverride}
        />

        {/* Segment-Origin (Phase 156, P156-06/P156-18/GAP-08) — Select nur bei geteilten Segmenten,
            schreibgeschuetzte Info bei Ein-Folgen-Segmenten mit gueltiger Origin */}
        {isSharedSegment && (editingSegment?.assigned_episodes?.length ?? 0) > 0 ? (
          <div className={styles.panelField}>
            <FormField label="Segment-Origin (Quelle der Credits)" htmlFor="segment-origin-select">
              <Select
                id="segment-origin-select"
                value={editingSegment?.origin_release_version_id ?? ''}
                onChange={(e) => onSetOrigin(Number(e.target.value))}
                disabled={isSettingOrigin}
              >
                {(editingSegment?.assigned_episodes ?? []).map((ep) => (
                  <option key={ep.release_version_id} value={ep.release_version_id}>
                    {`Folge ${ep.episode_number}`}
                  </option>
                ))}
              </Select>
            </FormField>
            <p className={styles.sourceHelpText}>
              Bestimmt, aus welcher zugewiesenen Folge die Credits dieses Segments stammen. Wird
              nicht automatisch mitgeändert, wenn du den Bereich anpasst.
            </p>
            {originError ? <div className={styles.assetError}>{originError}</div> : null}
          </div>
        ) : null}

        {!isSharedSegment && editingSegment?.origin_release_version_id != null ? (
          <div className={styles.panelField}>
            <FormField label="Segment-Origin (Quelle der Credits)">
              <p className={styles.sourceHelpText}>
                {`Origin: Folge ${
                  findAssignedEpisodeNumber(editingSegment, editingSegment.origin_release_version_id) ??
                  currentEpisodeLabel
                }`}
              </p>
            </FormField>
          </div>
        ) : null}

        {editingSegment?.origin_release_version_id != null ? (
          <SegmentContributorsField
            candidates={contributorCandidates}
            isLoading={isLoadingContributors}
            isSaving={isSavingContributors}
            error={contributorsError}
            hasOrigin={editingSegment?.origin_release_version_id != null}
            onToggle={onToggleContributor}
          />
        ) : null}

        <SegmentPlaybackPreviewSection
          editingSegment={editingSegment}
          previewStreamHref={previewStreamHref ?? null}
          renderStatus={renderStatus}
        />

        <SegmentAssetSection
          formState={formState}
          onFormChange={onFormChange}
          editingSegment={editingSegment}
          isSaving={isSaving}
          isUploading={isUploading}
          isDeletingAsset={isDeletingAsset}
          isLoadingReuseCandidates={isLoadingReuseCandidates}
          isAttachingReuse={isAttachingReuse}
          uploadError={uploadError}
          reuseCandidates={reuseCandidates}
          reuseError={reuseError}
          pendingUploadFile={pendingUploadFile}
          onPendingUploadFileChange={onPendingUploadFileChange}
          onAssetUpload={onAssetUpload}
          onAssetDelete={onAssetDelete}
          onAttachReuseCandidate={onAttachReuseCandidate}
        />

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
