'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  deleteEpisodeVersion,
  getEpisodeVersionEditorContext,
  scanEpisodeVersionFolder,
  updateEpisodeVersion,
} from '@/lib/api'
import { useConfirmDialog } from '@/components/ui'
import { useFansubGroupSearch } from '@/hooks/useFansubGroupSearch'
import { useAuthSession } from '@/lib/useAuthSession'
import { EpisodeVersionEditorContext, EpisodeVersionMediaFile, EpisodeVersionPatchRequest, FansubGroupDependents } from '@/types/episodeVersion'
import { FansubGroup, FansubGroupSummary } from '@/types/fansub'

import {
  buildFallbackMediaFile,
  buildInitialFormState,
  buildSnapshot,
  formatError,
  fromDateInputValue,
  normalizeCRC32Draft,
  normalizeOptional,
  parsePositiveInt,
  parseDurationInput,
  validateReleaseDateOrder,
  FormState,
} from './episodeVersionEditorUtils'

export function useEpisodeVersionEditor() {
  const params = useParams<{ versionId: string }>()
  const router = useRouter()

  const versionID = useMemo(() => parsePositiveInt((params.versionId || '').trim()), [params.versionId])
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const { confirm, confirmDialog } = useConfirmDialog()
  const [contextData, setContextData] = useState<EpisodeVersionEditorContext | null>(null)
  const [formState, setFormState] = useState<FormState>({
    title: '',
    mediaProvider: '',
    mediaItemID: '',
    videoQuality: '',
    subtitleType: '',
    productionStartedOn: '',
    releaseDate: '',
    crc32: '',
    streamURL: '',
    durationSeconds: '',
  })
  const [selectedGroups, setSelectedGroups] = useState<FansubGroupSummary[]>([])
  const [groupDependents, setGroupDependents] = useState<Record<number, FansubGroupDependents>>({})
  const [folderPath, setFolderPath] = useState('')
  const [availableFiles, setAvailableFiles] = useState<EpisodeVersionMediaFile[]>([])
  const [selectedFile, setSelectedFile] = useState<EpisodeVersionMediaFile | null>(null)
  const [hasPendingFileSelection, setHasPendingFileSelection] = useState(false)
  const fileSelectionRevision = useRef(0)
  const selectedFileInvalidated = useRef(false)
  const [showFilePanel, setShowFilePanel] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const baselineRef = useRef('')
  const contextGeneration = useRef(0)
  const loadedRouteVersionId = useRef<number | null>(null)

  // Referenzstabile excludeIds-Liste (nur bei echter Auswahländerung neu berechnet) — die
  // Debounce-Suche im Hook läuft sonst bei jedem Render dieser Komponente neu an, nicht nur
  // bei einer tatsächlichen Änderung der ausgewählten Gruppen.
  const selectedGroupIds = useMemo(() => selectedGroups.map((group) => group.id), [selectedGroups])
  const {
    query: groupQuery,
    setQuery: setGroupQuery,
    results: groupResults,
    isSearching,
    message: searchMessage,
    addGroup: clearGroupSearch,
  } = useFansubGroupSearch({ excludeIds: selectedGroupIds })

  const chapterHints = contextData && loadedRouteVersionId.current === versionID &&
    !selectedFileInvalidated.current && !hasPendingFileSelection &&
    formState.mediaProvider.trim() === (contextData.version.media_provider || '').trim() &&
    formState.mediaItemID.trim() === (contextData.version.media_item_id || '').trim() &&
    normalizeOptional(formState.streamURL) === normalizeOptional(contextData.version.stream_url || '')
    ? contextData.selected_file?.chapter_hints ?? null : null

  const hasUnsavedChanges = baselineRef.current !== '' && (hasPendingFileSelection ||
    buildSnapshot(formState, selectedGroups) !== baselineRef.current)

  useEffect(() => {
    let cancelled = false
    contextGeneration.current += 1
    loadedRouteVersionId.current = null
    baselineRef.current = ''
    setContextData(null)
    selectedFileInvalidated.current = false
    setSelectedGroups([])
    setGroupDependents({})
    setSelectedFile(null)
    setHasPendingFileSelection(false)
    fileSelectionRevision.current += 1
    setAvailableFiles([])
    setShowFilePanel(false)
    setIsScanning(false)
    setIsSaving(false)
    async function loadData() {
      if (!versionID) {
        setErrorMessage('Ungültige Version-ID.')
        setIsLoading(false)
        return
      }
      if (!isClientInitialized) {
        return
      }
      if (!hasAuthSession) {
        setErrorMessage('Anmeldung erforderlich. Bitte zuerst anmelden.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      try {
        const response = await getEpisodeVersionEditorContext(versionID)
        if (cancelled) return
        loadedRouteVersionId.current = versionID
        const nextContext = response.data
        const nextFormState = buildInitialFormState(nextContext)

        setContextData(nextContext)
        setFormState(nextFormState)
        setSelectedGroups(nextContext.selected_groups)
        setGroupDependents(nextContext.selected_group_dependents ?? {})
        setFolderPath(nextContext.anime_folder_path || '')
        setAvailableFiles([])
        setSelectedFile(nextContext.selected_file ?? buildFallbackMediaFile(nextContext))
        setShowFilePanel(false)
        setAdvancedMode(false)
        setGroupQuery('')
        setSuccessMessage(null)
        baselineRef.current = buildSnapshot(nextFormState, nextContext.selected_groups)
      } catch (error) {
        if (!cancelled) setErrorMessage(formatError(error))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
      contextGeneration.current += 1
    }
    // setGroupQuery ist der stabile State-Setter aus useFansubGroupSearch (wie ein normaler
    // useState-Setter referenzkonstant über die Lebensdauer dieser Komponente) — Aufnahme in
    // die Abhängigkeitsliste löst keine zusätzlichen Effekt-Läufe aus.
  }, [hasAuthSession, isClientInitialized, setGroupQuery, versionID])

  async function handleScanFolder() {
    if (!hasAuthSession || !versionID) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst anmelden.')
      return
    }

    const generation = contextGeneration.current
    setIsScanning(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const response = await scanEpisodeVersionFolder(versionID)
      if (generation !== contextGeneration.current) return
      const files = response.data.files

      setFolderPath(response.data.anime_folder_path || '')
      setAvailableFiles(files)
      setSelectedFile((current) => {
        if (!current) return current
        const matches = files.filter((file) =>
          file.media_item_id === current.media_item_id &&
          (!current.media_source_id || file.media_source_id === current.media_source_id),
        )
        return matches.length === 1 ? matches[0] : current
      })
      setShowFilePanel(true)
      if (files.length === 0) {
        setSuccessMessage('Keine passenden Mediendateien im verknüpften Ordner gefunden.')
      }
    } catch (error) {
      if (generation === contextGeneration.current) setErrorMessage(formatError(error))
    } finally {
      if (generation === contextGeneration.current) setIsScanning(false)
    }
  }

  function applyFile(file: EpisodeVersionMediaFile) {
    if (!file.media_source_id?.trim()) {
      setErrorMessage('Die Quelle der Datei fehlt. Bitte die Dateiliste erneut laden.')
      return
    }
    fileSelectionRevision.current += 1
    setHasPendingFileSelection(true)
    setSelectedFile(file)
    setShowFilePanel(false)
    setFormState((current) => ({
      ...current,
      title: current.title.trim() ? current.title : file.release_name || current.title,
      mediaProvider: 'jellyfin',
      mediaItemID: file.media_item_id,
      videoQuality: file.video_quality || '',
      streamURL: file.stream_url || '',
    }))
    setSuccessMessage('Datei übernommen. Änderungen jetzt speichern.')
    setErrorMessage(null)
  }

  function addGroup(group: FansubGroup) {
    setSelectedGroups((current) => {
      if (current.some((item) => item.id === group.id)) return current
      return [...current, { id: group.id, slug: group.slug, name: group.name, logo_url: group.logo_url }]
    })
    // Übernahme einer Gruppe aus der Trefferliste ist eine Auswahl im Sinne des
    // Such-Hooks — leert dessen Eingabe/Treffer/Meldung, ohne die Auswahlliste selbst
    // zu kennen (die bleibt bei dieser Komponente).
    clearGroupSearch(group)
  }

  function removeGroup(groupID: number) {
    setSelectedGroups((current) => current.filter((group) => group.id !== groupID))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>, metadataOnly = false) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!hasAuthSession || !versionID) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst anmelden.')
      return
    }
    if (!contextData || loadedRouteVersionId.current !== versionID) return
    if (!metadataOnly && (!formState.mediaProvider.trim() || !formState.mediaItemID.trim())) {
      setErrorMessage('Bitte zuerst eine Mediendatei aus dem Ordner wählen oder den Advanced-Bereich ausfüllen.')
      return
    }
    if (validateReleaseDateOrder(formState)) return

    const rawDurationInput = formState.durationSeconds.trim()
    const parsedDurationSeconds = parseDurationInput(formState.durationSeconds)
    if (rawDurationInput && parsedDurationSeconds == null) {
      setErrorMessage('Gesamtdauer ist ungültig. Erlaubt sind Sekunden, m:ss, hh:mm:ss sowie Kurzformen wie 2m oder 1m30s.')
      return
    }

    const generation = contextGeneration.current
    const selectionRevision = fileSelectionRevision.current
    setIsSaving(true)
    try {
      const patch: EpisodeVersionPatchRequest = {
        title: normalizeOptional(formState.title),
        video_quality: normalizeOptional(formState.videoQuality),
        subtitle_type: formState.subtitleType || null,
        production_started_on: fromDateInputValue(formState.productionStartedOn),
        release_date: fromDateInputValue(formState.releaseDate),
        crc32: normalizeOptional(normalizeCRC32Draft(formState.crc32)),
        duration_seconds: parsedDurationSeconds,
      }
      if (!metadataOnly) {
        const previous = contextData.version
        const reviewedFile = hasPendingFileSelection && formState.mediaProvider.trim() === 'jellyfin' &&
          selectedFile?.media_item_id === formState.mediaItemID.trim() ? selectedFile : null
        const bindingChanged = formState.mediaProvider.trim() !== previous.media_provider ||
          formState.mediaItemID.trim() !== previous.media_item_id ||
          normalizeOptional(formState.streamURL) !== normalizeOptional(previous.stream_url || '')
        if (bindingChanged || reviewedFile) {
          patch.media_provider = formState.mediaProvider.trim()
          patch.media_item_id = formState.mediaItemID.trim()
          patch.stream_url = normalizeOptional(formState.streamURL)
          if (reviewedFile?.media_source_id) patch.media_source_id = reviewedFile.media_source_id
        }
        const previousGroups = new Set(contextData.selected_groups.map((group) => group.id))
        if (selectedGroups.length !== previousGroups.size || selectedGroups.some((group) => !previousGroups.has(group.id))) {
          patch.fansub_groups = selectedGroups.map((group) => ({ id: group.id }))
        }
      }
      if (patch.media_provider !== undefined || patch.media_item_id !== undefined ||
        patch.media_source_id !== undefined || patch.stream_url !== undefined) {
        // Optional file metadata belongs to the old binding until a fresh context GET.
        // Invalidate before awaiting: failed/late saves must not revive the old hints.
        selectedFileInvalidated.current = true
        setContextData(current => current ? { ...current, selected_file: null } : current)
      }
      const response = await updateEpisodeVersion(versionID, patch)
      if (generation !== contextGeneration.current) return

      const submittedGroups = metadataOnly ? contextData.selected_groups : selectedGroups
      const savedGroups = response.data.fansub_groups ?? submittedGroups
      const savedContext = { ...contextData, version: response.data, selected_groups: savedGroups,
        selected_file: selectedFileInvalidated.current ? null : contextData.selected_file }
      const savedForm = buildInitialFormState(savedContext)
      setContextData(savedContext)
      baselineRef.current = buildSnapshot(savedForm, savedGroups)
      setFormState((current) => {
        const keepFileDraft = selectionRevision !== fileSelectionRevision.current ||
          (metadataOnly && hasPendingFileSelection)
        const bindingFields: (keyof FormState)[] = ['mediaProvider', 'mediaItemID', 'streamURL']
        const sourceFields: (keyof FormState)[] = [...bindingFields, 'videoQuality', 'subtitleType', 'durationSeconds']
        let next = { ...current }
        for (const field of Object.keys(savedForm) as (keyof FormState)[]) {
          // Apply server normalization only where the submitted draft is still current.
          if (current[field] !== formState[field] ||
            (metadataOnly && bindingFields.includes(field)) ||
            (keepFileDraft && sourceFields.includes(field))) continue
          next = { ...next, [field]: savedForm[field] }
        }
        return next
      })
      setSelectedGroups((current) => current.length === submittedGroups.length &&
        current.every(group => submittedGroups.some(submitted => submitted.id === group.id))
        ? savedGroups : current)
      if (!metadataOnly && selectionRevision === fileSelectionRevision.current) setHasPendingFileSelection(false)
      setSuccessMessage('Version gespeichert.')
    } catch (error) {
      if (generation === contextGeneration.current) setErrorMessage(formatError(error))
    } finally {
      if (generation === contextGeneration.current) setIsSaving(false)
    }
  }

  async function handleDelete() {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!hasAuthSession || !versionID) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst anmelden.')
      return
    }

    const ok = await confirm({
      title: `Version #${versionID} wirklich löschen?`,
      description: 'Episode bleibt erhalten, nur diese Version wird entfernt.',
      confirmLabel: 'Löschen',
      tone: 'danger',
    })
    if (!ok) return

    setIsDeleting(true)
    try {
      await deleteEpisodeVersion(versionID)
      router.push(contextData ? `/admin/anime/${contextData.version.anime_id}/episodes` : '/admin/anime')
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    contextData,
    chapterHints,
    formState,
    setFormState,
    selectedGroups,
    groupDependents,
    folderPath,
    availableFiles,
    selectedFile,
    showFilePanel,
    setShowFilePanel,
    advancedMode,
    setAdvancedMode,
    groupQuery,
    setGroupQuery,
    groupResults,
    isLoading,
    isSaving,
    isDeleting,
    isScanning,
    isSearching,
    errorMessage,
    successMessage,
    searchMessage,
    hasUnsavedChanges,
    handleScanFolder,
    applyFile,
    addGroup,
    removeGroup,
    handleSave,
    handleDelete,
    confirmDialog,
  }
}
