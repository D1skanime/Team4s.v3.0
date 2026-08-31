'use client'

import { Fragment, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Clock, RefreshCw } from 'lucide-react'

import { useReleaseSegments } from './useReleaseSegments'
import {
  getTypeBadgeClass,
  getTypeBadgeLabel,
  formatDuration,
  formatEpisodeRange,
  formatTimeInput,
  parseFlexibleTimeInput,
  parsePositiveEpisodeInput,
  resolveSegmentProvenanceDetails,
  resolveSegmentProvenance,
  resolveSourceLabel,
  isSegmentActiveForEpisode,
  useSegmentOverrideHandlers,
  SegmentTimeline,
} from './SegmenteTab.helpers'
import { SegmentEditPanel } from './SegmentEditPanel'
import type { FormState } from './SegmentEditPanel'
import { SegmentAssignmentsRow } from './SegmentAssignmentsRow'
import {
  attachSegmentLibraryAsset,
  deleteSegmentAsset,
  getAnimeSegmentSuggestions,
  getSegmentLibraryCandidates,
  uploadSegmentAsset,
} from '@/lib/api'
import {
  Badge,
  DisclosureIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { useAuthSession } from '@/lib/useAuthSession'
import type {
  AdminSegmentLibraryCandidate,
  AdminThemeSegment,
  AdminThemeSegmentCreateRequest,
  AdminThemeSegmentPatchRequest,
} from '@/types/admin'
import styles from './SegmenteTab.module.css'

interface SegmenteTabProps {
  animeId: number | null
  groupId: number | null
  version: string | null
  episodeNumber?: number | null
  durationSeconds?: number | null
  releaseVariantId?: number | null
}

const EMPTY_FORM: FormState = {
  themeKind: '',
  themeTitle: '',
  startEpisode: '',
  endEpisode: '',
  startTime: '',
  endTime: '',
  sourceType: 'none',
  sourceRef: '',
  sourceLabel: '',
}

const MAX_SEGMENT_WINDOW_SECONDS = 240
const DEFAULT_SEGMENT_END_SECONDS = 80

function getDefaultSegmentEndSeconds(durationSeconds?: number | null): number {
  if (durationSeconds != null && Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Math.min(Math.floor(durationSeconds), DEFAULT_SEGMENT_END_SECONDS)
  }
  return DEFAULT_SEGMENT_END_SECONDS
}

function segmentFormFromExisting(segment: AdminThemeSegment): FormState {
  return {
    themeKind:
      segment.theme_type_name.toUpperCase().includes('OP')
        ? 'op'
        : segment.theme_type_name.toUpperCase().includes('ED')
          ? 'ed'
          : segment.theme_type_name.toUpperCase().includes('INSERT')
            ? 'insert'
            : segment.theme_type_name.toUpperCase().includes('OUTRO')
              ? 'outro'
              : '',
    themeTitle: segment.theme_title ?? '',
    startEpisode: segment.start_episode != null ? String(segment.start_episode) : '',
    endEpisode: segment.end_episode != null ? String(segment.end_episode) : '',
    startTime: segment.start_time ?? '',
    endTime: segment.end_time ?? '',
    sourceType: segment.source_type ?? (segment.source_jellyfin_item_id ? 'jellyfin_theme' : 'none'),
    sourceRef: segment.source_ref ?? segment.source_jellyfin_item_id ?? '',
    sourceLabel: segment.source_label ?? '',
  }
}

function buildSegmentPreviewStreamHref(
  segment: AdminThemeSegment | null,
  releaseVersionId?: number | null,
): string | null {
  if (!segment?.id) return null
  const params = new URLSearchParams()
  if (segment.render_cache_key) params.set('cache_key', segment.render_cache_key)
  // Die Next.js-Stream-Route verlangt release_version_id (sonst 400) -- gleiche
  // release-version-scoped Aufloesung wie beim Render.
  if (releaseVersionId != null) params.set('release_version_id', String(releaseVersionId))
  if (segment.playback_source_kind === 'uploaded_asset') {
    return `/api/segments/${segment.id}/stream${params.size > 0 ? `?${params.toString()}` : ''}`
  }
  if (segment.render_status !== 'ready') return null
  return `/api/segments/${segment.id}/stream${params.size > 0 ? `?${params.toString()}` : ''}`
}

function renderStatusLabel(segment: AdminThemeSegment): string {
  if (segment.playback_source_kind === 'uploaded_asset') return 'Fallback-Datei'
  switch (segment.render_status) {
    case 'ready':
      return 'Bereit'
    case 'queued':
    case 'rendering':
      return 'Wird vorbereitet'
    case 'failed':
      return 'Fehlgeschlagen'
    case 'stale':
      return 'Veraltet'
    default:
      return 'Nicht vorbereitet'
  }
}

// --- Main component ---
export function SegmenteTab({ animeId, groupId, version, episodeNumber, durationSeconds, releaseVariantId }: SegmenteTabProps) {
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
  const [suggestions, setSuggestions] = useState<AdminThemeSegment[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [openAssignmentsFor, setOpenAssignmentsFor] = useState<number | null>(null)
  const [assignmentBusySegmentId, setAssignmentBusySegmentId] = useState<number | null>(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<AdminThemeSegment | null>(null)
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [renderingSegmentId, setRenderingSegmentId] = useState<number | null>(null)
  const { isSavingOverride, overrideError, handleSaveOverride, handleRemoveOverride, resetOverrideError } =
    useSegmentOverrideHandlers({ editingSegment, releaseVariantId: releaseVariantId ?? null, setSegmentOverride, removeSegmentOverride })

  // Asset upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDeletingAsset, setIsDeletingAsset] = useState(false)
  const [reuseCandidates, setReuseCandidates] = useState<AdminSegmentLibraryCandidate[]>([])
  const [isLoadingReuseCandidates, setIsLoadingReuseCandidates] = useState(false)
  const [reuseError, setReuseError] = useState<string | null>(null)
  const [isAttachingReuse, setIsAttachingReuse] = useState(false)

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
    setReuseError(null)
    setPendingUploadFile(null)
    resetOverrideError()
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingSegment(null)
    setFormState(EMPTY_FORM)
    setFormError(null)
    setUploadError(null)
    setReuseCandidates([])
    setReuseError(null)
    setPendingUploadFile(null)
    resetOverrideError()
  }

  useEffect(() => {
    if (!panelOpen || !editingSegment || !animeId || !groupId || !hasAuthSession) {
      setReuseCandidates([])
      return
    }

    if (formState.sourceType !== 'release_asset' || !formState.themeKind.trim()) {
      setReuseCandidates([])
      return
    }

    setIsLoadingReuseCandidates(true)
    setReuseError(null)
    getSegmentLibraryCandidates(
      animeId,
      groupId,
      formState.themeKind,
      formState.themeTitle,
      undefined,
      releaseVariantId,
    )
      .then((res) => {
        setReuseCandidates(
          res.data.filter((candidate) => {
            if (!editingSegment.source_ref?.trim()) return true
            return candidate.source_ref !== editingSegment.source_ref
          }),
        )
      })
      .catch((error) => {
        setReuseCandidates([])
        setReuseError(error instanceof Error ? error.message : 'Library-Kandidaten konnten nicht geladen werden.')
      })
      .finally(() => {
        setIsLoadingReuseCandidates(false)
      })
  }, [animeId, editingSegment, formState.sourceType, formState.themeKind, formState.themeTitle, groupId, hasAuthSession, panelOpen, releaseVariantId])

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

  async function handleSave() {
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

    const normalizedSourceRef = formState.sourceRef.trim() || null
    const normalizedSourceLabel =
      formState.sourceLabel.trim() ||
      (formState.sourceType === 'jellyfin_theme'
        ? 'Jellyfin Serien-Theme'
        : formState.sourceType === 'release_asset'
          ? 'Release-Asset'
          : null)

    try {
      if (!formState.startEpisode.trim() || !formState.endEpisode.trim()) {
        setFormError('Bitte den Episodenbereich vollständig ausfüllen.')
        return
      }
      const parsedStartEpisode = parsePositiveEpisodeInput(formState.startEpisode)
      const parsedEndEpisode = parsePositiveEpisodeInput(formState.endEpisode)
      if (parsedStartEpisode == null || parsedEndEpisode == null) {
        setFormError('Episoden müssen positive ganze Zahlen sein.')
        return
      }
      if (parsedEndEpisode < parsedStartEpisode) {
        setFormError('Bis muss größer oder gleich Von sein.')
        return
      }
      if (!formState.startTime.trim() || !formState.endTime.trim()) {
        setFormError('Bitte den Zeitbereich vollständig ausfüllen.')
        return
      }
      const parsedStart = formState.startTime.trim() ? parseFlexibleTimeInput(formState.startTime) : null
      if (formState.startTime.trim() && parsedStart == null) {
        setFormError('Start-Zeit ist ungültig. Erlaubt sind z. B. 1:20 oder 00:01:20.')
        return
      }
      let parsedEnd = formState.endTime.trim() ? parseFlexibleTimeInput(formState.endTime) : null
      if (formState.endTime.trim() && parsedEnd == null) {
        setFormError('End-Zeit ist ungültig. Erlaubt sind z. B. 1:20 oder 00:01:20.')
        return
      }
      // Use segment's resolved playback duration as primary authority; fall back to page-level duration
      const effectiveDuration = editingSegment?.playback_duration_seconds ?? durationSeconds ?? null
      if (effectiveDuration != null && parsedEnd != null) {
        parsedEnd = Math.min(parsedEnd, effectiveDuration)
      }
      if (parsedStart != null && parsedEnd != null && parsedEnd <= parsedStart) {
        setFormError('Ende muss nach dem Start liegen.')
        return
      }
      if (parsedStart != null && parsedEnd != null && parsedEnd - parsedStart > MAX_SEGMENT_WINDOW_SECONDS) {
        setFormError('Segment-Zeitbereich darf maximal 4 Minuten lang sein.')
        return
      }

      const resolvedThemeID = await ensureThemeFromSelection(formState.themeKind, formState.themeTitle)
      if (!resolvedThemeID) {
        setFormError('Bitte einen gueltigen Typ auswählen.')
        return
      }

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
        const result = await update(editingSegment.id, patch)
        if (result) closePanel()
        else setFormError('Segment konnte nicht aktualisiert werden.')
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
        const createdSegment = await create(input)
        if (!createdSegment) {
          setFormError('Segment konnte nicht angelegt werden.')
          return
        }
        if (pendingUploadFile && formState.sourceType === 'release_asset') {
          const res = await uploadSegmentAsset(animeId, createdSegment.id, pendingUploadFile, undefined, releaseVariantId)
          await reload()
          setEditingSegment(res.data)
        }
        closePanel()
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Segment konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(segment: AdminThemeSegment) {
    const confirmed = window.confirm('Segment wirklich löschen?')
    if (!confirmed) return
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

  async function handleAssetUpload(file: File) {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const res = await uploadSegmentAsset(animeId, editingSegment.id, file, undefined, releaseVariantId)
      // Reload so table + panel get fresh data
      await reload()
      // Refresh the editing segment from reloaded list
      setEditingSegment(res.data)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleAssetDelete() {
    if (!animeId || !editingSegment || !hasAuthSession) return
    const confirmed = window.confirm('Segment-Datei wirklich entfernen? Die Quelldaten werden auf "Keine Quelle" zurückgesetzt.')
    if (!confirmed) return
    setIsDeletingAsset(true)
    setUploadError(null)
    try {
      await deleteSegmentAsset(animeId, editingSegment.id, undefined, releaseVariantId)
      await reload()
      // Update panel to reflect cleared asset
      setEditingSegment((prev) =>
        prev ? { ...prev, source_type: 'none', source_ref: null, source_label: null } : prev
      )
      setFormState((s) => ({ ...s, sourceType: 'none', sourceRef: '', sourceLabel: '' }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Datei konnte nicht entfernt werden.')
    } finally {
      setIsDeletingAsset(false)
    }
  }

  async function handleAttachReuseCandidate(candidate: AdminSegmentLibraryCandidate) {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsAttachingReuse(true)
    setReuseError(null)
    try {
      const res = await attachSegmentLibraryAsset(
        animeId,
        editingSegment.id,
        { asset_id: candidate.asset_id },
        undefined,
        releaseVariantId,
      )
      await reload()
      setEditingSegment(res.data)
      setFormState((current) => ({
        ...current,
        sourceType: 'release_asset',
        sourceRef: res.data.source_ref ?? '',
        sourceLabel: res.data.source_label ?? '',
      }))
    } catch (error) {
      setReuseError(error instanceof Error ? error.message : 'Library-Datei konnte nicht verknüpft werden.')
    } finally {
      setIsAttachingReuse(false)
    }
  }

  const episodeLabel = episodeNumber != null ? `Aktive Segmente für Episode ${episodeNumber}` : 'Segmente verwalten'
  const episodeSubtitle = episodeNumber != null
    ? `Zeigt alle Segmente, deren Episodenbereich Episode ${episodeNumber} abdeckt.`
    : 'OP/ED-Timing für diese Gruppe und Version.'

  // Nur Segmente zeigen, deren Episodenbereich die aktuelle Folge abdeckt (matcht die Ueberschrift).
  // Ohne Episodenkontext (episodeNumber == null) die gesamte Bibliothek.
  const visibleSegments =
    episodeNumber == null
      ? segments
      : segments.filter((segment) => isSegmentActiveForEpisode(segment, episodeNumber))

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

      {/* Suggestions bar */}
      {suggestionsLoading ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>Vorschläge werden geladen...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>
            Vorschläge aus anderen Releases für Episode {episodeNumber}:
          </span>
          <div className={styles.suggestionsList}>
            {suggestions.map((s) => (
              <div key={s.id} className={styles.suggestionItem}>
                <span className={`${styles.badge} ${getTypeBadgeClass(s.theme_type_name)}`}>
                  {getTypeBadgeLabel(s.theme_type_name)}
                </span>
                <span className={styles.suggestionMeta}>
                  {s.theme_title?.trim() ? `${s.theme_title} · ` : ''}
                  {formatEpisodeRange(s.start_episode, s.end_episode)}
                  {s.start_time && s.end_time ? ` \u00B7 ${formatDuration(s.start_time, s.end_time)}` : ''}
                </span>
                <button
                  type="button"
                  className={styles.suggestionAdoptButton}
                  onClick={() => void adoptSuggestion(s)}
                >
                  Übernehmen
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Error from hook */}
      {errorMessage ? <div className={styles.panelError}>{errorMessage}</div> : null}

      {/* Table */}
      {isLoading ? (
        <p className={styles.emptyState}>Lade Segmente...</p>
      ) : (
        <Table
          className={styles.table}
          containerClassName={styles.tableWrapper}
          variant="withActions"
        >
          <TableHead className={styles.tableHeader}>
            <TableRow>
              <TableHeaderCell>Typ</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Episoden</TableHeaderCell>
              <TableHeaderCell>Zeitbereich</TableHeaderCell>
              <TableHeaderCell>Quelle</TableHeaderCell>
              <TableHeaderCell>Aktionen</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleSegments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={styles.emptyState}>
                    {episodeNumber != null && segments.length > 0
                      ? `Kein Segment deckt Episode ${episodeNumber} ab. Andere Folgen können eigene Segmente haben.`
                      : 'Noch keine Segmente vorhanden. Klicke „Segment hinzufügen", um zu beginnen.'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleSegments.map((segment) => {
                  const isActive = episodeNumber != null && isSegmentActiveForEpisode(segment, episodeNumber)
                  const assignmentsOpen = openAssignmentsFor === segment.id
                  return (
                    <Fragment key={segment.id}>
                    <TableRow
                      className={`${styles.tableRow} ${isActive ? styles.tableRowActive : ''}`}
                    >
                      <TableCell data-label="Typ">
                        <span className={`${styles.badge} ${getTypeBadgeClass(segment.theme_type_name)}`}>
                          {getTypeBadgeLabel(segment.theme_type_name)}
                        </span>
                      </TableCell>
                      <TableCell data-label="Name" style={{ fontSize: 13, color: '#6b6b70' }}>
                        {segment.theme_title?.trim() || '\u2014'}
                      </TableCell>
                      <TableCell data-label="Episoden">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {segment.is_shared ? <Badge variant="info">Geteiltes Segment</Badge> : null}
                          {segment.is_shared && segment.has_episode_override ? (
                            <Badge variant="warning">Zeit hier überschrieben</Badge>
                          ) : null}
                          <span>{formatEpisodeRange(segment.start_episode, segment.end_episode)}</span>
                          <button
                            type="button"
                            className={styles.actionButton}
                            aria-label="Zugewiesene Folgen anzeigen/ausblenden"
                            onClick={() =>
                              setOpenAssignmentsFor(openAssignmentsFor === segment.id ? null : segment.id)
                            }
                          >
                            <DisclosureIndicator open={assignmentsOpen} variant="button" size="sm" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell data-label="Zeitbereich" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {segment.start_time && segment.end_time
                          ? formatDuration(segment.start_time, segment.end_time)
                          : '\u2014'}
                      </TableCell>
                      <TableCell data-label="Quelle" style={{ fontSize: 13, color: '#6b6b70' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          {segment.playback_source_kind ? (
                            <span>
                              {segment.playback_source_label ?? (
                                segment.playback_source_kind === 'episode_version'
                                  ? 'Episode-Version / Jellyfin-Stream'
                                  : segment.playback_source_kind === 'uploaded_asset'
                                    ? 'hochgeladener Fallback'
                                    : segment.playback_source_kind === 'jellyfin_theme'
                                      ? 'Jellyfin Serien-Theme'
                                      : segment.playback_source_kind
                              )}
                            </span>
                          ) : (
                            <span>{resolveSourceLabel(segment)}</span>
                          )}
                          {resolveSegmentProvenance(segment) ? (
                            <span style={{ fontSize: 11, color: '#8a8a93' }}>
                              {resolveSegmentProvenance(segment)}
                              {resolveSegmentProvenanceDetails(segment) ? ` · ${resolveSegmentProvenanceDetails(segment)}` : ''}
                            </span>
                          ) : null}
                          <span className={styles.renderStatus}>
                            {renderStatusLabel(segment)}
                            {segment.render_error_message ? ` · ${segment.render_error_message}` : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Aktionen">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {segment.playback_source_kind && segment.playback_source_kind !== 'uploaded_asset' && segment.render_status !== 'ready' ? (
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Segment vorbereiten"
                              disabled={
                                renderingSegmentId === segment.id ||
                                segment.render_status === 'queued' ||
                                segment.render_status === 'rendering'
                              }
                              onClick={() => { void handleRenderSegment(segment) }}
                            >
                              <RefreshCw size={14} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={styles.actionButton}
                            title="Bearbeiten"
                            onClick={() => openEditPanel(segment)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                            title="Segment löschen"
                            aria-label="Segment löschen"
                            onClick={() => { void handleDelete(segment) }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {assignmentsOpen ? (
                      <TableRow className={styles.tableRow}>
                        <TableCell colSpan={6}>
                          <SegmentAssignmentsRow
                            segment={segment}
                            currentReleaseVersionId={releaseVariantId ?? null}
                            currentEpisodeNumber={episodeNumber ?? null}
                            onAssignCurrent={() => void handleAssignCurrentFolge(segment)}
                            onUnassign={(id) => void handleUnassignFolge(segment, id)}
                            isBusy={assignmentBusySegmentId === segment.id}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                    </Fragment>
                  )
                })
              )}
          </TableBody>
        </Table>
      )}

      {/* Timeline */}
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeader}>
          <Clock size={14} />
          Timeline Vorschau
          {durationSeconds == null && visibleSegments.some((s) => s.playback_duration_seconds != null) ? (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#8a8a93' }}>(Laufzeit aus Playback-Metadaten)</span>
          ) : durationSeconds == null ? (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#8a8a93' }}>(Keine reale Laufzeit bekannt)</span>
          ) : null}
        </div>
        <SegmentTimeline
          segments={visibleSegments}
          totalDurationSeconds={
            durationSeconds ??
            visibleSegments.reduce<number | null>((max, s) => {
              const d = s.playback_duration_seconds
              if (d == null) return max
              return max == null ? d : Math.max(max, d)
            }, null)
          }
        />
      </div>

      {/* Side panel overlay */}
      {panelOpen ? (
        <SegmentEditPanel
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
          onSaveOverride={(input) => void handleSaveOverride(input)}
          onRemoveOverride={() => void handleRemoveOverride()}
          isSavingOverride={isSavingOverride}
          overrideError={overrideError}
          onClose={closePanel}
          onFormChange={(patch) => {
            if (patch.sourceType && patch.sourceType !== 'release_asset') {
              setPendingUploadFile(null)
            }
            setFormState((s) => ({ ...s, ...patch }))
          }}
          onPendingUploadFileChange={setPendingUploadFile}
          onSave={() => void handleSave()}
          onAssetUpload={(file) => void handleAssetUpload(file)}
          onAssetDelete={() => void handleAssetDelete()}
          onAttachReuseCandidate={(candidate) => void handleAttachReuseCandidate(candidate)}
        />
      ) : null}
    </div>
  )
}
