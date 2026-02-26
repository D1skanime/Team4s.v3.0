import { useEffect, useMemo, useState } from 'react'

import { createAdminEpisode, deleteAdminEpisode, updateAdminEpisode } from '@/lib/api'
import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeManagerState } from '../../types/admin-anime'
import { normalizeOptionalString, parsePositiveInt } from '../../utils/anime-helpers'

interface EpisodeManagerActions {
  setQuery: (q: string) => void
  setStatusFilter: (s: EpisodeStatus | 'all') => void
  setDensity: (d: 'compact' | 'comfortable') => void
  selectEpisode: (episode: EpisodeListItem) => void
  toggleSelected: (id: number) => void
  toggleAllVisible: (visibleIDs: number[]) => void
  clearSelection: () => void
  beginInlineEdit: (episode: EpisodeListItem) => void
  cancelInlineEdit: () => void
  setInlineField: (field: keyof EpisodeManagerState['inlineEditValues'], value: string | boolean) => void
  saveInlineEdit: () => Promise<void>
  setEditField: (field: keyof EpisodeManagerState['editFormValues'], value: string) => void
  setEditClearFlag: (field: keyof EpisodeManagerState['editFormClearFlags'], value: boolean) => void
  submitEdit: () => Promise<void>
  setCreateField: (field: keyof EpisodeManagerState['createFormValues'], value: string) => void
  submitCreate: (animeID: number) => Promise<void>
  applyBulkStatus: (status: EpisodeStatus) => Promise<void>
  removeSelected: (animeID: number) => Promise<void>
  removeEpisode: (episode: EpisodeListItem, animeID: number) => Promise<void>
}

interface UseEpisodeManagerOptions {
  onRequest?: (value: string | null) => void
  onResponse?: (value: string | null) => void
}

export function useEpisodeManager(
  authToken: string,
  episodes: EpisodeListItem[],
  onRefresh: () => Promise<void>,
  onSuccess: (msg: string) => void,
  onError: (msg: string) => void,
  options: UseEpisodeManagerOptions = {},
): EpisodeManagerState & EpisodeManagerActions {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<EpisodeStatus | 'all'>('all')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')
  const [selectedID, setSelectedID] = useState<number | null>(null)
  const [selectedIDs, setSelectedIDs] = useState<Record<number, true>>({})
  const [inlineEditID, setInlineEditID] = useState<number | null>(null)
  const [inlineEditValues, setInlineEditValues] = useState({
    number: '',
    title: '',
    status: 'private' as EpisodeStatus,
    clearTitle: false,
  })
  const [editFormValues, setEditFormValues] = useState({
    id: '',
    number: '',
    title: '',
    status: '',
    streamLink: '',
  })
  const [editFormClearFlags, setEditFormClearFlags] = useState({ title: false, streamLink: false })
  const [createFormValues, setCreateFormValues] = useState({
    number: '',
    title: '',
    status: 'private' as EpisodeStatus,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isApplyingBulk, setIsApplyingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [removingIDs, setRemovingIDs] = useState<Record<number, true>>({})

  const hasAuthToken = authToken.trim().length > 0

  const visibleEpisodes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filteredStatus = statusFilter === 'all' ? episodes : episodes.filter((episode) => episode.status === statusFilter)
    if (!needle) return filteredStatus
    return filteredStatus.filter((episode) => {
      const number = (episode.episode_number || '').toLowerCase()
      const title = (episode.title || '').toLowerCase()
      return number.includes(needle) || title.includes(needle)
    })
  }, [episodes, query, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: episodes.length }
    counts.disabled = 0
    counts.private = 0
    counts.public = 0
    for (const episode of episodes) {
      counts[episode.status] = (counts[episode.status] ?? 0) + 1
    }
    return counts
  }, [episodes])

  const selectedCount = useMemo(() => Object.keys(selectedIDs).length, [selectedIDs])
  const selectedVisibleCount = useMemo(() => visibleEpisodes.filter((episode) => selectedIDs[episode.id]).length, [selectedIDs, visibleEpisodes])
  const allVisibleSelected = useMemo(
    () => visibleEpisodes.length > 0 && selectedVisibleCount === visibleEpisodes.length,
    [selectedVisibleCount, visibleEpisodes.length],
  )

  useEffect(() => {
    if (!selectedID) return
    if (episodes.some((episode) => episode.id === selectedID)) return
    setSelectedID(null)
    setEditFormValues({ id: '', number: '', title: '', status: '', streamLink: '' })
    setEditFormClearFlags({ title: false, streamLink: false })
  }, [episodes, selectedID])

  const selectEpisode = (episode: EpisodeListItem) => {
    setSelectedID(episode.id)
    setEditFormValues({
      id: String(episode.id),
      number: episode.episode_number,
      title: episode.title ?? '',
      status: episode.status,
      streamLink: (episode.stream_links && episode.stream_links[0]) || '',
    })
    setEditFormClearFlags({ title: false, streamLink: false })
    onSuccess(`Episode #${episode.id} zum Bearbeiten geladen.`)
  }

  const toggleSelected = (id: number) => {
    setSelectedIDs((current) => {
      if (current[id]) {
        const next = { ...current }
        delete next[id]
        return next
      }
      return { ...current, [id]: true }
    })
  }

  const toggleAllVisible = (visibleIDs: number[]) => {
    setSelectedIDs((current) => {
      const next = { ...current }
      if (visibleIDs.length === 0) return next

      const currentlyAllSelected = visibleIDs.every((id) => next[id])
      if (currentlyAllSelected) {
        for (const id of visibleIDs) delete next[id]
      } else {
        for (const id of visibleIDs) next[id] = true
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIDs({})

  const beginInlineEdit = (episode: EpisodeListItem) => {
    setInlineEditID(episode.id)
    setInlineEditValues({
      number: episode.episode_number,
      title: episode.title ?? '',
      status: episode.status,
      clearTitle: false,
    })
  }

  const cancelInlineEdit = () => {
    setInlineEditID(null)
    setInlineEditValues({ number: '', title: '', status: 'private', clearTitle: false })
  }

  const setInlineField = (field: keyof EpisodeManagerState['inlineEditValues'], value: string | boolean) => {
    setInlineEditValues((current) => {
      if (field === 'clearTitle') {
        return { ...current, clearTitle: Boolean(value) }
      }
      if (field === 'status') {
        return { ...current, status: value as EpisodeStatus }
      }
      return { ...current, [field]: String(value) }
    })
  }

  const saveInlineEdit = async () => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!inlineEditID) {
      onError('Keine Episode zum Bearbeiten ausgewaehlt.')
      return
    }

    const payload: { episode_number?: string; title?: string | null; status?: EpisodeStatus } = {}
    const episodeNumber = normalizeOptionalString(inlineEditValues.number)
    const episodeTitle = normalizeOptionalString(inlineEditValues.title)
    if (episodeNumber) payload.episode_number = episodeNumber
    if (inlineEditValues.clearTitle) payload.title = null
    else if (episodeTitle) payload.title = episodeTitle
    payload.status = inlineEditValues.status

    try {
      setIsUpdating(true)
      options.onRequest?.(JSON.stringify(payload, null, 2))
      const response = await updateAdminEpisode(inlineEditID, payload, authToken)
      options.onResponse?.(JSON.stringify(response, null, 2))
      await onRefresh()
      onSuccess(`Episode #${response.data.id} wurde aktualisiert.`)
      cancelInlineEdit()
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Episode konnte nicht aktualisiert werden.')
    } finally {
      setIsUpdating(false)
    }
  }

  const setEditField = (field: keyof EpisodeManagerState['editFormValues'], value: string) => {
    setEditFormValues((current) => ({ ...current, [field]: value }))
  }

  const setEditClearFlag = (field: keyof EpisodeManagerState['editFormClearFlags'], value: boolean) => {
    setEditFormClearFlags((current) => ({ ...current, [field]: value }))
  }

  const submitEdit = async () => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const episodeID = parsePositiveInt(editFormValues.id)
    if (!episodeID) {
      onError('Episode-ID ist ungueltig.')
      return
    }

    const payload: { episode_number?: string; title?: string | null; stream_link?: string | null; status?: EpisodeStatus } = {}
    const number = normalizeOptionalString(editFormValues.number)
    const title = normalizeOptionalString(editFormValues.title)
    const streamLink = normalizeOptionalString(editFormValues.streamLink)
    if (number) payload.episode_number = number
    if (editFormClearFlags.title) payload.title = null
    else if (title) payload.title = title
    if (editFormClearFlags.streamLink) payload.stream_link = null
    else if (streamLink) payload.stream_link = streamLink
    if (editFormValues.status) payload.status = editFormValues.status as EpisodeStatus

    if (Object.keys(payload).length === 0) {
      onError('Mindestens ein Feld fuer das Episoden-Update ausfuellen.')
      return
    }

    try {
      setIsUpdating(true)
      options.onRequest?.(JSON.stringify(payload, null, 2))
      const response = await updateAdminEpisode(episodeID, payload, authToken)
      options.onResponse?.(JSON.stringify(response, null, 2))
      await onRefresh()
      onSuccess(`Episode #${response.data.id} wurde aktualisiert.`)
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Episode konnte nicht aktualisiert werden.')
    } finally {
      setIsUpdating(false)
    }
  }

  const setCreateField = (field: keyof EpisodeManagerState['createFormValues'], value: string) => {
    setCreateFormValues((current) => {
      if (field === 'status') {
        return { ...current, status: value as EpisodeStatus }
      }
      return { ...current, [field]: value }
    })
  }

  const submitCreate = async (animeID: number) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const episodeNumber = createFormValues.number.trim()
    if (!episodeNumber) {
      onError('episode_number ist erforderlich')
      return
    }

    const payload = {
      anime_id: animeID,
      episode_number: episodeNumber,
      status: createFormValues.status,
      title: normalizeOptionalString(createFormValues.title),
    }

    try {
      setIsCreating(true)
      options.onRequest?.(JSON.stringify(payload, null, 2))
      const response = await createAdminEpisode(payload, authToken)
      options.onResponse?.(JSON.stringify(response, null, 2))
      await onRefresh()
      setCreateFormValues({ number: '', title: '', status: 'private' })
      setEditFormValues({
        id: String(response.data.id),
        number: response.data.episode_number,
        title: response.data.title || '',
        status: response.data.status,
        streamLink: response.data.stream_link || '',
      })
      setSelectedID(response.data.id)
      onSuccess(`Episode #${response.data.id} wurde erstellt.`)
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Episode konnte nicht erstellt werden.')
    } finally {
      setIsCreating(false)
    }
  }

  const applyBulkStatus = async (status: EpisodeStatus) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const ids = Object.keys(selectedIDs)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (ids.length === 0) {
      onError('Bitte mindestens eine Episode markieren.')
      return
    }

    try {
      setIsApplyingBulk(true)
      setBulkProgress({ done: 0, total: ids.length })
      options.onRequest?.(JSON.stringify({ ids, patch: { status } }, null, 2))
      const failed: number[] = []
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        try {
          await updateAdminEpisode(id, { status }, authToken)
        } catch {
          failed.push(id)
        } finally {
          setBulkProgress({ done: i + 1, total: ids.length })
        }
      }
      await onRefresh()
      if (failed.length > 0) {
        options.onResponse?.(JSON.stringify({ failed_episode_ids: failed }, null, 2))
        onError(`Bulk-Update teilweise fehlgeschlagen (${failed.length}/${ids.length}).`)
      } else {
        options.onResponse?.(JSON.stringify({ updated: ids.length, status }, null, 2))
        onSuccess(`Bulk-Update OK: ${ids.length} Episoden -> Status ${status}.`)
      }
    } finally {
      setIsApplyingBulk(false)
      setBulkProgress(null)
    }
  }

  const removeEpisode = async (episode: EpisodeListItem, animeID: number) => {
    void animeID
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (isApplyingBulk || isUpdating) return

    try {
      setRemovingIDs((current) => ({ ...current, [episode.id]: true }))
      options.onRequest?.(JSON.stringify({ episode_id: episode.id, action: 'remove_from_anime' }, null, 2))
      const response = await deleteAdminEpisode(episode.id, authToken)
      options.onResponse?.(JSON.stringify(response, null, 2))
      await onRefresh()
      setSelectedIDs((current) => {
        if (!current[episode.id]) return current
        const next = { ...current }
        delete next[episode.id]
        return next
      })
      if (selectedID === episode.id || parsePositiveInt(editFormValues.id) === episode.id) {
        setSelectedID(null)
        setEditFormValues({ id: '', number: '', title: '', status: '', streamLink: '' })
        setEditFormClearFlags({ title: false, streamLink: false })
      }
      onSuccess(
        `Episode ${episode.episode_number} wurde entfernt. Geloeschte Versions-Zuordnungen: ${response.data.deleted_episode_versions}.`,
      )
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Episode konnte nicht aus dem Anime entfernt werden.')
    } finally {
      setRemovingIDs((current) => {
        if (!current[episode.id]) return current
        const next = { ...current }
        delete next[episode.id]
        return next
      })
    }
  }

  const removeSelected = async (animeID: number) => {
    void animeID
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const ids = Object.keys(selectedIDs)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (ids.length === 0) {
      onError('Bitte mindestens eine Episode markieren.')
      return
    }

    let removed = 0
    let removedVersionLinks = 0
    const failed: number[] = []
    try {
      setIsApplyingBulk(true)
      setBulkProgress({ done: 0, total: ids.length })
      options.onRequest?.(JSON.stringify({ ids, action: 'remove_from_anime' }, null, 2))
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        try {
          const response = await deleteAdminEpisode(id, authToken)
          removed += 1
          removedVersionLinks += response.data.deleted_episode_versions
        } catch {
          failed.push(id)
        } finally {
          setBulkProgress({ done: i + 1, total: ids.length })
        }
      }
      await onRefresh()

      setSelectedIDs(() => {
        const next: Record<number, true> = {}
        for (const failedID of failed) next[failedID] = true
        return next
      })

      if (selectedID && ids.includes(selectedID) && !failed.includes(selectedID)) {
        setSelectedID(null)
        setEditFormValues({ id: '', number: '', title: '', status: '', streamLink: '' })
        setEditFormClearFlags({ title: false, streamLink: false })
      }

      if (failed.length > 0) {
        options.onResponse?.(
          JSON.stringify({ failed_episode_ids: failed, removed, removed_version_links: removedVersionLinks }, null, 2),
        )
        onError(
          `Bulk-Entfernen teilweise fehlgeschlagen (${failed.length}/${ids.length}). Erfolgreich entfernt: ${removed}, geloeschte Versions-Zuordnungen: ${removedVersionLinks}.`,
        )
      } else {
        options.onResponse?.(JSON.stringify({ removed, removed_version_links: removedVersionLinks }, null, 2))
        onSuccess(
          `Bulk-Entfernen OK: ${removed} Episoden entfernt, geloeschte Versions-Zuordnungen: ${removedVersionLinks}.`,
        )
      }
    } finally {
      setIsApplyingBulk(false)
      setBulkProgress(null)
    }
  }

  return {
    episodes,
    visibleEpisodes,
    statusCounts,
    selectedCount,
    selectedVisibleCount,
    allVisibleSelected,
    query,
    statusFilter,
    density,
    selectedID,
    selectedIDs,
    inlineEditID,
    inlineEditValues,
    editFormValues,
    editFormClearFlags,
    createFormValues,
    isCreating,
    isUpdating,
    isApplyingBulk,
    bulkProgress,
    removingIDs,
    setQuery,
    setStatusFilter,
    setDensity,
    selectEpisode,
    toggleSelected,
    toggleAllVisible,
    clearSelection,
    beginInlineEdit,
    cancelInlineEdit,
    setInlineField,
    saveInlineEdit,
    setEditField,
    setEditClearFlag,
    submitEdit,
    setCreateField,
    submitCreate,
    applyBulkStatus,
    removeSelected,
    removeEpisode,
  }
}
