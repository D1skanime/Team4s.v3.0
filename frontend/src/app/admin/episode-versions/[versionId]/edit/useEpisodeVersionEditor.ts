'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  addCollaborationMember,
  createFansubGroup,
  deleteEpisodeVersion,
  getEpisodeVersionEditorContext,
  getFansubList,
  getRuntimeAuthToken,
  removeCollaborationMember,
  scanEpisodeVersionFolder,
  updateEpisodeVersion,
} from '@/lib/api'
import { EpisodeVersionEditorContext, EpisodeVersionMediaFile } from '@/types/episodeVersion'
import { FansubGroup, FansubGroupSummary } from '@/types/fansub'

import {
  buildCollaborationName,
  buildCollaborationSlug,
  buildFallbackMediaFile,
  buildInitialFormState,
  buildSnapshot,
  formatError,
  fromDateTimeLocalValue,
  normalizeOptional,
  parsePositiveInt,
  FormState,
} from './episodeVersionEditorUtils'

export function useEpisodeVersionEditor() {
  const params = useParams<{ versionId: string }>()
  const router = useRouter()

  const versionID = useMemo(() => parsePositiveInt((params.versionId || '').trim()), [params.versionId])
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [contextData, setContextData] = useState<EpisodeVersionEditorContext | null>(null)
  const [formState, setFormState] = useState<FormState>({
    title: '',
    mediaProvider: '',
    mediaItemID: '',
    videoQuality: '',
    subtitleType: '',
    releaseDate: '',
    streamURL: '',
  })
  const [selectedGroups, setSelectedGroups] = useState<FansubGroupSummary[]>([])
  const [collaborationGroupID, setCollaborationGroupID] = useState<number | null>(null)
  const [folderPath, setFolderPath] = useState('')
  const [availableFiles, setAvailableFiles] = useState<EpisodeVersionMediaFile[]>([])
  const [selectedFile, setSelectedFile] = useState<EpisodeVersionMediaFile | null>(null)
  const [showFilePanel, setShowFilePanel] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [groupQuery, setGroupQuery] = useState('')
  const [groupResults, setGroupResults] = useState<FansubGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const baselineRef = useRef('')

  const hasUnsavedChanges = useMemo(
    () => baselineRef.current !== '' && buildSnapshot(formState, selectedGroups) !== baselineRef.current,
    [formState, selectedGroups],
  )

  useEffect(() => {
    async function loadData() {
      if (!versionID) {
        setErrorMessage('Ungueltige Version-ID.')
        setIsLoading(false)
        return
      }
      if (!authToken) {
        setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      try {
        const response = await getEpisodeVersionEditorContext(versionID, authToken)
        const nextContext = response.data
        const nextFormState = buildInitialFormState(nextContext)

        setContextData(nextContext)
        setFormState(nextFormState)
        setSelectedGroups(nextContext.selected_groups)
        setCollaborationGroupID(nextContext.collaboration_group_id ?? null)
        setFolderPath(nextContext.anime_folder_path || '')
        setAvailableFiles([])
        setSelectedFile(buildFallbackMediaFile(nextContext))
        setShowFilePanel(false)
        setAdvancedMode(false)
        setGroupQuery('')
        setGroupResults([])
        setSearchMessage(null)
        setSuccessMessage(null)
        baselineRef.current = buildSnapshot(nextFormState, nextContext.selected_groups)
      } catch (error) {
        setErrorMessage(formatError(error))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [authToken, versionID])

  useEffect(() => {
    const query = groupQuery.trim()
    if (!authToken || query.length < 1) {
      setGroupResults([])
      setSearchMessage(null)
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeoutID = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchMessage(null)
      try {
        const response = await getFansubList({ q: query, page: 1, per_page: 10 })
        if (cancelled) return

        const selectedIDs = new Set(selectedGroups.map((group) => group.id))
        const nextResults = response.data.filter((group) => !selectedIDs.has(group.id))
        setGroupResults(nextResults)
        if (nextResults.length === 0) setSearchMessage('Keine passende Gruppe oder kein passender Alias gefunden.')
      } catch (error) {
        if (!cancelled) setSearchMessage(formatError(error))
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutID)
    }
  }, [authToken, groupQuery, selectedGroups])

  async function handleScanFolder() {
    if (!authToken || !versionID) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    setIsScanning(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const response = await scanEpisodeVersionFolder(versionID, authToken)
      const files = response.data.files
      const matchedFile = files.find((file) => file.media_item_id === formState.mediaItemID) || selectedFile

      setFolderPath(response.data.anime_folder_path || '')
      setAvailableFiles(files)
      setSelectedFile(matchedFile)
      setShowFilePanel(true)
      if (files.length === 0) {
        setSuccessMessage('Keine passenden Mediendateien im verknuepften Ordner gefunden.')
      }
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsScanning(false)
    }
  }

  function applyFile(file: EpisodeVersionMediaFile) {
    setSelectedFile(file)
    setShowFilePanel(false)
    setFormState((current) => ({
      ...current,
      title: current.title.trim() ? current.title : file.release_name || current.title,
      mediaProvider: 'jellyfin',
      mediaItemID: file.media_item_id,
      videoQuality: file.video_quality || current.videoQuality,
      streamURL: file.stream_url || current.streamURL,
    }))
    setSuccessMessage('Datei uebernommen. Aenderungen jetzt speichern.')
    setErrorMessage(null)
  }

  function addGroup(group: FansubGroup) {
    setSelectedGroups((current) => {
      if (current.some((item) => item.id === group.id)) return current
      return [...current, { id: group.id, slug: group.slug, name: group.name, logo_url: group.logo_url }]
    })
    setGroupQuery('')
    setGroupResults([])
    setSearchMessage(null)
  }

  function removeGroup(groupID: number) {
    setSelectedGroups((current) => current.filter((group) => group.id !== groupID))
  }

  async function resolveFansubGroupID(): Promise<number | null> {
    if (selectedGroups.length === 0) return null
    if (selectedGroups.length === 1) return selectedGroups[0].id
    if (!authToken || !versionID) throw new Error('anmeldung erforderlich')

    if (collaborationGroupID) {
      const nextIDs = new Set(selectedGroups.map((group) => group.id))
      for (const group of selectedGroups) {
        if (!(contextData?.selected_groups || []).some((item) => item.id === group.id)) {
          await addCollaborationMember(collaborationGroupID, { member_group_id: group.id }, authToken)
        }
      }
      for (const group of contextData?.selected_groups || []) {
        if (!nextIDs.has(group.id)) {
          await removeCollaborationMember(collaborationGroupID, group.id, authToken)
        }
      }
      return collaborationGroupID
    }

    const collaboration = await createFansubGroup(
      {
        slug: buildCollaborationSlug(selectedGroups, versionID),
        name: buildCollaborationName(selectedGroups),
        status: 'active',
        group_type: 'collaboration',
      },
      authToken,
    )

    for (const group of selectedGroups) {
      await addCollaborationMember(collaboration.data.id, { member_group_id: group.id }, authToken)
    }

    return collaboration.data.id
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken || !versionID) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!formState.mediaProvider.trim() || !formState.mediaItemID.trim()) {
      setErrorMessage('Bitte zuerst eine Mediendatei aus dem Ordner waehlen oder den Advanced-Bereich ausfuellen.')
      return
    }

    setIsSaving(true)
    try {
      const resolvedFansubGroupID = await resolveFansubGroupID()
      const response = await updateEpisodeVersion(
        versionID,
        {
          title: normalizeOptional(formState.title),
          fansub_group_id: resolvedFansubGroupID,
          media_provider: formState.mediaProvider.trim(),
          media_item_id: formState.mediaItemID.trim(),
          video_quality: normalizeOptional(formState.videoQuality),
          subtitle_type: formState.subtitleType || null,
          release_date: fromDateTimeLocalValue(formState.releaseDate),
          stream_url: normalizeOptional(formState.streamURL),
        },
        authToken,
      )

      if (contextData) {
        setContextData({
          ...contextData,
          version: response.data,
          selected_groups: selectedGroups,
          collaboration_group_id: selectedGroups.length > 1 ? resolvedFansubGroupID : null,
        })
      }
      setCollaborationGroupID(selectedGroups.length > 1 ? resolvedFansubGroupID : null)
      baselineRef.current = buildSnapshot(formState, selectedGroups)
      setSuccessMessage('Version gespeichert.')
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken || !versionID) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const ok = window.confirm(`Version #${versionID} wirklich loeschen?\n\nEpisode bleibt erhalten, nur diese Version wird entfernt.`)
    if (!ok) return

    setIsDeleting(true)
    try {
      await deleteEpisodeVersion(versionID, authToken)
      router.push(contextData ? `/admin/anime/${contextData.version.anime_id}/versions` : '/admin/anime')
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    contextData,
    formState,
    setFormState,
    selectedGroups,
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
  }
}
