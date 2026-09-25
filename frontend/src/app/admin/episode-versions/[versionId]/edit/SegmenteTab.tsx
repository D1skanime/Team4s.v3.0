'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { useConfirmDialog } from '@/components/ui'
import { useReleaseSegments } from './useReleaseSegments'
import { formatTimeInput, isCurrentEpisodeAssigned, isSegmentActiveForEpisode, useSegmentOverrideHandlers } from './SegmenteTab.helpers'
import {
  EMPTY_FORM,
  getDefaultSegmentEndSeconds,
  segmentFormFromExisting,
  buildSegmentPreviewStreamHref,
  validateSegmentFormInput,
} from './SegmenteTab.formHelpers'
import { SegmentEditPanel, type FormState } from './SegmentEditPanel'
import { SegmentsListSection } from './SegmentsListSection'
import { useSegmentAssetHandlers } from './useSegmentAssetHandlers'
import { useSegmentContributors } from './useSegmentContributors'
import { getAnimeSegmentSuggestions, setAnimeSegmentOrigin, uploadSegmentAsset } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { AdminThemeSegment, AdminThemeSegmentCreateRequest, AdminThemeSegmentPatchRequest, AdminThemeSegmentMutationResponse } from '@/types/admin'
import type { EpisodeVersionChapterHint } from '@/types/episodeVersion'
import styles from './SegmenteTab.module.css'

interface SegmenteTabProps {
  chapterHints?: EpisodeVersionChapterHint[] | null
  animeId: number | null
  groupId: number | null
  version: string | null
  episodeNumber?: number | null
  durationSeconds?: number | null
  releaseVariantId?: number | null
}

// --- Main component ---
export function SegmenteTab({ animeId, groupId, version, episodeNumber, durationSeconds, releaseVariantId, chapterHints }: SegmenteTabProps) {
  const {
    segments,
    genericThemeOptions,
    isLoading,
    errorMessage,
    create,
    update,
    remove,
    render,
    reload,
    ensureThemeFromSelection,
    setSegmentOverride,
    removeSegmentOverride,
    assignSegment,
    unassignSegment,
  } = useReleaseSegments({
    animeId,
    groupId,
    version,
    releaseVariantId,
  })

  const { hasAccessToken, hasRefreshToken } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const { confirm, confirmDialog } = useConfirmDialog()
  const [suggestions, setSuggestions] = useState<AdminThemeSegment[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [assignmentBusySegmentId, setAssignmentBusySegmentId] = useState<number | null>(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<AdminThemeSegment | null>(null)
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [renderingSegmentId, setRenderingSegmentId] = useState<number | null>(null)
  const { isSavingOverride, overrideError, handleSaveOverride, handleRemoveOverride, resetOverrideError } =
    useSegmentOverrideHandlers({ editingSegment, releaseVariantId: releaseVariantId ?? null, setSegmentOverride, removeSegmentOverride })
  const [isSettingOrigin, setIsSettingOrigin] = useState(false)
  const [originError, setOriginError] = useState<string | null>(null)
  const {
    candidates: contributorCandidates,
    isLoading: isLoadingContributors,
    isSaving: isSavingContributors,
    error: contributorsError,
    toggleMember: toggleContributorMember,
  } = useSegmentContributors({ animeId, editingSegment })

  const {
    isUploading,
    uploadError,
    isDeletingAsset,
    reuseCandidates,
    isLoadingReuseCandidates,
    reuseError,
    isAttachingReuse,
    handleAssetUpload,
    handleAssetDelete,
    handleAttachReuseCandidate,
    confirmDialog: assetConfirmDialog,
  } = useSegmentAssetHandlers({
    animeId,
    groupId,
    releaseVariantId,
    hasAuthSession,
    panelOpen,
    editingSegment,
    formState,
    setEditingSegment,
    setFormState,
    reload,
  })

  // A draft must never silently move to another persisted variant.
  useEffect(() => {
    setPanelOpen(false)
    setEditingSegment(null)
    setFormState(EMPTY_FORM)
    setPendingUploadFile(null)
    setFormError(null)
  }, [releaseVariantId])

  // Load suggestions when episodeNumber changes
  useEffect(() => {
    if (!animeId || episodeNumber == null || !hasAuthSession) {
      setSuggestions([])
      return
    }
    setSuggestionsLoading(true)
    const excludeGroupId = groupId ?? undefined
    const excludeVersion = version ?? undefined
    getAnimeSegmentSuggestions(
      animeId,
      episodeNumber,
      excludeGroupId ?? undefined,
      excludeVersion ?? undefined,
      undefined,
      releaseVariantId,
    )
      .then((res) => { setSuggestions(res.data) })
      .catch(() => { setSuggestions([]) })
      .finally(() => { setSuggestionsLoading(false) })
  }, [animeId, episodeNumber, groupId, hasAuthSession, releaseVariantId, version])

  function openAddPanel() {
    setEditingSegment(null)
    const defaultThemeKind = genericThemeOptions[0]?.key ?? ''
    const defaultEpisode = episodeNumber != null ? String(episodeNumber) : ''
    setFormState({
      ...EMPTY_FORM,
      themeKind: defaultThemeKind,
      startEpisode: defaultEpisode,
      endEpisode: defaultEpisode,
      startTime: formatTimeInput(0),
      endTime: formatTimeInput(getDefaultSegmentEndSeconds(durationSeconds)),
    })
    setFormError(null)
    setPendingUploadFile(null)
    setPanelOpen(true)
  }

  function openEditPanel(segment: AdminThemeSegment) {
    setEditingSegment(segment)
    setFormState(segmentFormFromExisting(segment))
    setFormError(null)
    setPendingUploadFile(null)
    resetOverrideError()
    setOriginError(null)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingSegment(null)
    setFormState(EMPTY_FORM)
    setFormError(null)
    setPendingUploadFile(null)
    resetOverrideError()
    setOriginError(null)
  }

  async function adoptSuggestion(suggestion: AdminThemeSegment) {
    // Weist das bestehende Vorschlag-Segment der aktuellen Folge zu, statt ein Duplikat
    // anzulegen (Gap 1). Ohne bekannte releaseVariantId ist keine Zuweisung möglich.
    if (!animeId || releaseVariantId == null) return
    const result = await assignSegment(suggestion.id, releaseVariantId)
    if (result) {
      setSuggestions((current) => current.filter((s) => s.id !== suggestion.id))
    }
    // Bei Fehlschlag bleibt der Vorschlag sichtbar; useReleaseSegments setzt bereits
    // errorMessage -- kein Duplikat-Fallback auf create().
  }

  async function handleAssignCurrentFolge(segment: AdminThemeSegment) {
    if (releaseVariantId == null) return
    setAssignmentBusySegmentId(segment.id)
    try {
      await assignSegment(segment.id, releaseVariantId)
    } finally {
      setAssignmentBusySegmentId(null)
    }
  }

  async function handleUnassignFolge(segment: AdminThemeSegment, targetReleaseVersionId: number) {
    setAssignmentBusySegmentId(segment.id)
    try {
      await unassignSegment(segment.id, targetReleaseVersionId)
    } finally {
      setAssignmentBusySegmentId(null)
    }
  }

  async function handleSave(override?: { startTime: string; endTime: string }) {
    if (!animeId) {
      setFormError('Anime-Kontext fehlt.')
      return
    }
    if (!formState.themeKind) {
      setFormError('Bitte einen Typ auswählen.')
      return
    }

    setIsSaving(true)
    setFormError(null)
    setSaveNotice(null)

    const normalizedSourceRef = formState.sourceRef.trim() || null
    const normalizedSourceLabel =
      formState.sourceLabel.trim() ||
      (formState.sourceType === 'jellyfin_theme'
        ? 'Serien-Theme'
        : formState.sourceType === 'release_asset'
          ? 'Release-Asset'
          : null)

    try {
      const validated = validateSegmentFormInput(formState, editingSegment, durationSeconds)
      if ('error' in validated) {
        setFormError(validated.error)
        return
      }
      const { parsedStartEpisode, parsedEndEpisode, parsedStart, parsedEnd } = validated

      const resolvedThemeID = await ensureThemeFromSelection(formState.themeKind, formState.themeTitle)
      if (!resolvedThemeID) {
        setFormError('Bitte einen gültigen Typ auswählen.')
        return
      }

      let result: AdminThemeSegmentMutationResponse | null
      if (editingSegment) {
        const patch: AdminThemeSegmentPatchRequest = {
          theme_id: resolvedThemeID,
          start_episode: parsedStartEpisode,
          end_episode: parsedEndEpisode,
          start_time: parsedStart != null ? formatTimeInput(parsedStart) : null,
          end_time: parsedEnd != null ? formatTimeInput(parsedEnd) : null,
          source_jellyfin_item_id:
            formState.sourceType === 'jellyfin_theme'
              ? normalizedSourceRef ?? editingSegment?.source_jellyfin_item_id ?? null
              : null,
          source_type: formState.sourceType,
          source_ref: normalizedSourceRef,
          source_label: normalizedSourceLabel,
        }
        result = await update(editingSegment.id, patch)
      } else {
        const input: AdminThemeSegmentCreateRequest = {
          theme_id: resolvedThemeID,
          fansub_group_id: groupId ?? null,
          version: version ?? 'v1',
          start_episode: parsedStartEpisode,
          end_episode: parsedEndEpisode,
          start_time: parsedStart != null ? formatTimeInput(parsedStart) : null,
          end_time: parsedEnd != null ? formatTimeInput(parsedEnd) : null,
          source_jellyfin_item_id: formState.sourceType === 'jellyfin_theme' ? normalizedSourceRef : null,
          source_type: formState.sourceType,
          source_ref: normalizedSourceRef,
          source_label: normalizedSourceLabel,
        }
        result = await create(input)
      }
      if (!result) {
        setFormError('Segment konnte nicht gespeichert werden.')
        return
      }
      setEditingSegment(result.data)
      const skipped = result.range_sync?.skipped_conflicts ?? []
      if (skipped.length > 0) {
        const episodeLabels = [...new Set(skipped.map((conflict) => conflict.episode_number))]
        setSaveNotice(`Segment gespeichert. Bereits belegte Folgen für diesen Typ wurden übersprungen: ${episodeLabels.join(', ')}. Die bestehenden Segmente bleiben zugewiesen.`)
      }
      if (pendingUploadFile && formState.sourceType === 'release_asset') {
        const res = await uploadSegmentAsset(animeId, result.data.id, pendingUploadFile, undefined, releaseVariantId)
        await reload()
        setEditingSegment(res.data)
        setPendingUploadFile(null)
      }
      if (override) {
        if (!isCurrentEpisodeAssigned(result.data, releaseVariantId ?? null)) {
          setFormError('Segment gespeichert. Die aktuelle Folge ist diesem Segment nicht zugewiesen; ihre Zeitabweichung wurde nicht gespeichert.')
          return
        }
        if (!await handleSaveOverride(override)) {
          setFormError('Segment gespeichert, aber die Zeitabweichung konnte nicht gespeichert werden. Bitte erneut versuchen.')
          return
        }
      }
      closePanel()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Segment konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(segment: AdminThemeSegment) {
    if (!await confirm({ title: 'Segment wirklich löschen?', confirmLabel: 'Löschen', tone: 'danger' })) return
    await remove(segment.id)
  }

  async function handleRenderSegment(segment: AdminThemeSegment) {
    setRenderingSegmentId(segment.id)
    try {
      await render(segment.id)
    } finally {
      setRenderingSegmentId(null)
    }
  }

  async function handleSetOrigin(releaseVersionID: number) {
    if (!animeId || !editingSegment) return
    setIsSettingOrigin(true)
    setOriginError(null)
    try {
      const res = await setAnimeSegmentOrigin(animeId, editingSegment.id, releaseVersionID)
      await reload()
      setEditingSegment(res.data)
    } catch (error) {
      setOriginError(error instanceof Error ? error.message : 'Segment-Origin konnte nicht gesetzt werden.')
    } finally {
      setIsSettingOrigin(false)
    }
  }

  const episodeLabel = episodeNumber != null ? `Aktive Segmente für Episode ${episodeNumber}` : 'Segmente verwalten'
  const episodeSubtitle = episodeNumber != null
    ? `Zeigt alle Segmente, die dieser Release-Version von Episode ${episodeNumber} zugewiesen sind.`
    : 'OP/ED-Timing für diese Gruppe und Version.'

  // Assignments remain authoritative when a range contains skipped or protected releases.
  const visibleSegments = releaseVariantId == null
    ? segments
    : segments.filter((segment) => isCurrentEpisodeAssigned(segment, releaseVariantId))

  // A matching range can suggest a reuse candidate; it never proves an assignment.
  const localCandidates = releaseVariantId != null && episodeNumber != null
    ? segments.filter((segment) => !isCurrentEpisodeAssigned(segment, releaseVariantId) && isSegmentActiveForEpisode(segment, episodeNumber))
    : []
  const assignmentSuggestions = [...new Map([...localCandidates, ...suggestions]
    .filter((segment) => !isCurrentEpisodeAssigned(segment, releaseVariantId ?? null))
    .map((segment) => [segment.id, segment])).values()]

  return (
    <div className={styles.tabContent}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>{episodeLabel}</h2>
          <p className={styles.toolbarSubtitle}>{episodeSubtitle}</p>
        </div>
        <button type="button" className={styles.addButton} onClick={openAddPanel}>
          <Plus size={14} />
          Segment hinzufügen
        </button>
      </div>

      {saveNotice ? <p role="status" className={styles.saveNotice}>{saveNotice}</p> : null}

      <SegmentsListSection
        segments={segments}
        visibleSegments={visibleSegments}
        episodeNumber={episodeNumber}
        durationSeconds={durationSeconds}
        suggestions={assignmentSuggestions}
        suggestionsLoading={suggestionsLoading}
        errorMessage={errorMessage}
        isLoading={isLoading}
        assignmentBusySegmentId={assignmentBusySegmentId}
        renderingSegmentId={renderingSegmentId}
        releaseVariantId={releaseVariantId}
        onAdoptSuggestion={(s) => void adoptSuggestion(s)}
        onAssignCurrent={(s) => void handleAssignCurrentFolge(s)}
        onUnassign={(s, id) => void handleUnassignFolge(s, id)}
        onRenderSegment={(s) => void handleRenderSegment(s)}
        onEditSegment={openEditPanel}
        onDeleteSegment={(s) => void handleDelete(s)}
      />

      {/* Side panel overlay */}
      {panelOpen ? (
        <SegmentEditPanel
          chapterHints={chapterHints}
          editingSegment={editingSegment}
          formState={formState}
          pendingUploadFile={pendingUploadFile}
          durationSeconds={durationSeconds}
          genericThemeOptions={genericThemeOptions}
          isSaving={isSaving}
          formError={formError}
          isUploading={isUploading}
          isDeletingAsset={isDeletingAsset}
          isLoadingReuseCandidates={isLoadingReuseCandidates}
          isAttachingReuse={isAttachingReuse}
          uploadError={uploadError}
          reuseCandidates={reuseCandidates}
          reuseError={reuseError}
          previewStreamHref={buildSegmentPreviewStreamHref(editingSegment, releaseVariantId)}
          currentReleaseVersionId={releaseVariantId ?? null}
          onRemoveOverride={() => void handleRemoveOverride()}
          isSavingOverride={isSavingOverride}
          overrideError={overrideError}
          onSetOrigin={(releaseVersionID) => void handleSetOrigin(releaseVersionID)}
          isSettingOrigin={isSettingOrigin}
          originError={originError}
          contributorCandidates={contributorCandidates}
          isLoadingContributors={isLoadingContributors}
          isSavingContributors={isSavingContributors}
          contributorsError={contributorsError}
          onToggleContributor={(memberId, next) => void toggleContributorMember(memberId, next)}
          onClose={closePanel}
          onFormChange={(patch) => {
            if (patch.sourceType && patch.sourceType !== 'release_asset') {
              setPendingUploadFile(null)
            }
            setFormState((s) => ({ ...s, ...patch }))
          }}
          onPendingUploadFileChange={setPendingUploadFile}
          onSave={(override) => void handleSave(override)}
          onAssetUpload={(file) => void handleAssetUpload(file)}
          onAssetDelete={() => void handleAssetDelete()}
          onAttachReuseCandidate={(candidate) => void handleAttachReuseCandidate(candidate)}
        />
      ) : null}
      {confirmDialog}{assetConfirmDialog}
    </div>
  )
}
