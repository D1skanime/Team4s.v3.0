'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Clock, MoreHorizontal } from 'lucide-react'

import { useReleaseSegments } from './useReleaseSegments'
import {
  getTypeBadgeClass,
  getTypeBadgeLabel,
  formatDuration,
  formatEpisodeRange,
  formatTimeInput,
  parseFlexibleTimeInput,
  resolveSegmentProvenanceDetails,
  resolveSegmentProvenance,
  resolveSourceLabel,
  isSegmentActiveForEpisode,
  SegmentTimeline,
} from './SegmenteTab.helpers'
import { SegmentEditPanel } from './SegmentEditPanel'
import type { FormState } from './SegmentEditPanel'
import {
  attachSegmentLibraryAsset,
  deleteSegmentAsset,
  getAnimeSegmentSuggestions,
  getRuntimeAuthToken,
  getSegmentLibraryCandidates,
  uploadSegmentAsset,
} from '@/lib/api'
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
    reload,
    ensureThemeFromSelection,
  } = useReleaseSegments({
    animeId,
    groupId,
    version,
    releaseVariantId,
  })

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [suggestions, setSuggestions] = useState<AdminThemeSegment[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [dropdownOpenId, setDropdownOpenId] = useState<number | null>(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<AdminThemeSegment | null>(null)
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
    if (!animeId || episodeNumber == null || !authToken) {
      setSuggestions([])
      return
    }
    setSuggestionsLoading(true)
    const excludeGroupId = groupId ?? undefined
    const excludeVersion = version ?? undefined
    getAnimeSegmentSuggestions(animeId, episodeNumber, excludeGroupId ?? undefined, excludeVersion ?? undefined, authToken)
      .then((res) => { setSuggestions(res.data) })
      .catch(() => { setSuggestions([]) })
      .finally(() => { setSuggestionsLoading(false) })
  }, [animeId, episodeNumber, groupId, version, authToken])

  function openAddPanel() {
    setEditingSegment(null)
    const defaultThemeKind = genericThemeOptions[0]?.key ?? ''
    setFormState({ ...EMPTY_FORM, themeKind: defaultThemeKind })
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
  }

  useEffect(() => {
    if (!panelOpen || !editingSegment || !animeId || !groupId || !authToken) {
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
      authToken,
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
  }, [animeId, authToken, editingSegment, formState.sourceType, formState.themeKind, formState.themeTitle, groupId, panelOpen])

  async function adoptSuggestion(suggestion: AdminThemeSegment) {
    if (!animeId) return
    const input: AdminThemeSegmentCreateRequest = {
      theme_id: suggestion.theme_id,
      fansub_group_id: groupId ?? null,
      version: version ?? 'v1',
      start_episode: suggestion.start_episode,
      end_episode: suggestion.end_episode,
      start_time: suggestion.start_time,
      end_time: suggestion.end_time,
      source_jellyfin_item_id: suggestion.source_jellyfin_item_id,
      source_type: suggestion.source_type ?? null,
      source_ref: suggestion.source_ref ?? null,
      source_label: suggestion.source_label ?? null,
    }
    await create(input)
    setSuggestions((current) => current.filter((s) => s.id !== suggestion.id))
  }

  async function handleSave() {
    if (!animeId) {
      setFormError('Anime-Kontext fehlt.')
      return
    }
    if (!formState.themeKind) {
      setFormError('Bitte einen Typ auswaehlen.')
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
      const parsedStart = formState.startTime.trim() ? parseFlexibleTimeInput(formState.startTime) : null
      if (formState.startTime.trim() && parsedStart == null) {
        setFormError('Start-Zeit ist ungueltig. Erlaubt sind z. B. 1:20 oder 00:01:20.')
        return
      }
      let parsedEnd = formState.endTime.trim() ? parseFlexibleTimeInput(formState.endTime) : null
      if (formState.endTime.trim() && parsedEnd == null) {
        setFormError('End-Zeit ist ungueltig. Erlaubt sind z. B. 1:20 oder 00:01:20.')
        return
      }
      if (durationSeconds != null && parsedEnd != null) {
        parsedEnd = Math.min(parsedEnd, durationSeconds)
      }
      if (parsedStart != null && parsedEnd != null && parsedEnd <= parsedStart) {
        setFormError('Ende muss nach dem Start liegen.')
        return
      }

      const resolvedThemeID = await ensureThemeFromSelection(formState.themeKind, formState.themeTitle)
      if (!resolvedThemeID) {
        setFormError('Bitte einen gueltigen Typ auswaehlen.')
        return
      }

      if (editingSegment) {
        const patch: AdminThemeSegmentPatchRequest = {
          theme_id: resolvedThemeID,
          start_episode: formState.startEpisode ? parseInt(formState.startEpisode, 10) : null,
          end_episode: formState.endEpisode ? parseInt(formState.endEpisode, 10) : null,
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
          start_episode: formState.startEpisode ? parseInt(formState.startEpisode, 10) : null,
          end_episode: formState.endEpisode ? parseInt(formState.endEpisode, 10) : null,
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
          const res = await uploadSegmentAsset(animeId, createdSegment.id, pendingUploadFile, authToken)
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
    const confirmed = window.confirm('Segment wirklich loeschen?')
    if (!confirmed) return
    await remove(segment.id)
  }

  async function handleAssetUpload(file: File) {
    if (!animeId || !editingSegment || !authToken) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const res = await uploadSegmentAsset(animeId, editingSegment.id, file, authToken)
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
    if (!animeId || !editingSegment || !authToken) return
    const confirmed = window.confirm('Segment-Datei wirklich entfernen? Die Quelldaten werden auf "Keine Quelle" zurueckgesetzt.')
    if (!confirmed) return
    setIsDeletingAsset(true)
    setUploadError(null)
    try {
      await deleteSegmentAsset(animeId, editingSegment.id, authToken)
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
    if (!animeId || !editingSegment || !authToken) return
    setIsAttachingReuse(true)
    setReuseError(null)
    try {
      const res = await attachSegmentLibraryAsset(
        animeId,
        editingSegment.id,
        { asset_id: candidate.asset_id },
        authToken,
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
      setReuseError(error instanceof Error ? error.message : 'Library-Datei konnte nicht verknuepft werden.')
    } finally {
      setIsAttachingReuse(false)
    }
  }

  const episodeLabel = episodeNumber != null ? `Aktive Segmente fuer Episode ${episodeNumber}` : 'Segmente verwalten'
  const episodeSubtitle = episodeNumber != null
    ? `Zeigt alle Segmente, deren Episodenbereich Episode ${episodeNumber} abdeckt.`
    : 'OP/ED-Timing fuer diese Gruppe und Version.'

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
          Segment hinzufuegen
        </button>
      </div>

      {/* Suggestions bar */}
      {suggestionsLoading ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>Vorschlaege werden geladen...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>
            Vorschlaege aus anderen Releases fuer Episode {episodeNumber}:
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
                  Uebernehmen
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
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th>Typ</th>
                <th>Name</th>
                <th>Episoden</th>
                <th>Zeitbereich</th>
                <th>Quelle</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Noch keine Segmente vorhanden. Klicke &ldquo;Segment hinzufuegen&rdquo; um zu beginnen.
                  </td>
                </tr>
              ) : (
                segments.map((segment) => {
                  const isActive = episodeNumber != null && isSegmentActiveForEpisode(segment, episodeNumber)
                  return (
                    <tr
                      key={segment.id}
                      className={`${styles.tableRow} ${isActive ? styles.tableRowActive : ''}`}
                    >
                      <td>
                        <span className={`${styles.badge} ${getTypeBadgeClass(segment.theme_type_name)}`}>
                          {getTypeBadgeLabel(segment.theme_type_name)}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#6b6b70' }}>
                        {segment.theme_title?.trim() || '\u2014'}
                      </td>
                      <td>
                        {formatEpisodeRange(segment.start_episode, segment.end_episode)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {segment.start_time && segment.end_time
                          ? formatDuration(segment.start_time, segment.end_time)
                          : '\u2014'}
                      </td>
                      <td style={{ fontSize: 13, color: '#6b6b70' }}>
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
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            title="Bearbeiten"
                            onClick={() => openEditPanel(segment)}
                          >
                            <Pencil size={14} />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Mehr Aktionen"
                              onClick={() => setDropdownOpenId(dropdownOpenId === segment.id ? null : segment.id)}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {dropdownOpenId === segment.id ? (
                              <div className={styles.dropdown}>
                                <button
                                  type="button"
                                  className={styles.dropdownItem}
                                  onClick={() => {
                                    setDropdownOpenId(null)
                                    void handleDelete(segment)
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Loeschen
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline */}
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeader}>
          <Clock size={14} />
          Timeline Vorschau
        </div>
        <SegmentTimeline segments={segments} totalDurationSeconds={durationSeconds} />
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
