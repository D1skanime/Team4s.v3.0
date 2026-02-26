import { useEffect, useMemo, useState } from 'react'

import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeManagerState } from '../../types/admin-anime'
import { buildEpisodePatchPayload, UseEpisodeManagerOptions } from './episode-manager/shared'
import { useEpisodeManagerBulkMutations } from './episode-manager/useEpisodeManagerBulkMutations'
import { useEpisodeManagerEditMutations } from './episode-manager/useEpisodeManagerEditMutations'
import { EpisodeManagerActions } from './episode-manager/types'

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
  const selectedEpisode = useMemo(() => episodes.find((episode) => episode.id === selectedID) ?? null, [episodes, selectedID])
  const hasEditChanges = useMemo(
    () => Object.keys(buildEpisodePatchPayload(selectedEpisode, editFormValues, editFormClearFlags)).length > 0,
    [editFormClearFlags, editFormValues, selectedEpisode],
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

  const setEditField = (field: keyof EpisodeManagerState['editFormValues'], value: string) => {
    setEditFormValues((current) => ({ ...current, [field]: value }))
  }

  const setEditClearFlag = (field: keyof EpisodeManagerState['editFormClearFlags'], value: boolean) => {
    setEditFormClearFlags((current) => ({ ...current, [field]: value }))
  }

  const setCreateField = (field: keyof EpisodeManagerState['createFormValues'], value: string) => {
    setCreateFormValues((current) => {
      if (field === 'status') return { ...current, status: value as EpisodeStatus }
      return { ...current, [field]: value }
    })
  }

  const { saveInlineEdit, submitEdit, submitCreate, cancelInlineEdit } = useEpisodeManagerEditMutations({
    authToken,
    hasAuthToken,
    selectedEpisode,
    inlineEditID,
    inlineEditValues,
    editFormValues,
    editFormClearFlags,
    createFormValues,
    onRefresh,
    onSuccess,
    onError,
    options,
    setIsUpdating,
    setIsCreating,
    setInlineEditID,
    setInlineEditValues,
    setEditFormValues,
    setSelectedID,
    setCreateFormValues,
  })

  const { applyBulkStatus, removeEpisode, removeSelected } = useEpisodeManagerBulkMutations({
    authToken,
    hasAuthToken,
    selectedID,
    selectedIDs,
    editFormValues,
    isApplyingBulk,
    isUpdating,
    onRefresh,
    onSuccess,
    onError,
    options,
    setIsApplyingBulk,
    setBulkProgress,
    setRemovingIDs,
    setSelectedIDs,
    setSelectedID,
    setEditFormValues,
    setEditFormClearFlags,
  })

  return {
    episodes,
    visibleEpisodes,
    selectedEpisode,
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
    hasEditChanges,
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
