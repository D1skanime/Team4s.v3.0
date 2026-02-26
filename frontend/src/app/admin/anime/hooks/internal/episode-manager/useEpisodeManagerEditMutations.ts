import { Dispatch, SetStateAction, useCallback } from 'react'

import { createAdminEpisode, updateAdminEpisode } from '@/lib/api'
import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeManagerState } from '../../../types/admin-anime'
import { normalizeOptionalString, parsePositiveInt } from '../../../utils/anime-helpers'
import { buildEpisodePatchPayload, UseEpisodeManagerOptions } from './shared'

interface UseEpisodeManagerEditMutationsParams {
  authToken: string
  hasAuthToken: boolean
  selectedEpisode: EpisodeListItem | null
  inlineEditID: number | null
  inlineEditValues: EpisodeManagerState['inlineEditValues']
  editFormValues: EpisodeManagerState['editFormValues']
  editFormClearFlags: EpisodeManagerState['editFormClearFlags']
  createFormValues: EpisodeManagerState['createFormValues']
  onRefresh: () => Promise<void>
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  options: UseEpisodeManagerOptions
  setIsUpdating: Dispatch<SetStateAction<boolean>>
  setIsCreating: Dispatch<SetStateAction<boolean>>
  setInlineEditID: Dispatch<SetStateAction<number | null>>
  setInlineEditValues: Dispatch<SetStateAction<EpisodeManagerState['inlineEditValues']>>
  setEditFormValues: Dispatch<SetStateAction<EpisodeManagerState['editFormValues']>>
  setSelectedID: Dispatch<SetStateAction<number | null>>
  setCreateFormValues: Dispatch<SetStateAction<EpisodeManagerState['createFormValues']>>
}

export function useEpisodeManagerEditMutations({
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
}: UseEpisodeManagerEditMutationsParams) {
  const cancelInlineEdit = useCallback(() => {
    setInlineEditID(null)
    setInlineEditValues({ number: '', title: '', status: 'private', clearTitle: false })
  }, [setInlineEditID, setInlineEditValues])

  const saveInlineEdit = useCallback(async () => {
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
  }, [
    authToken,
    cancelInlineEdit,
    hasAuthToken,
    inlineEditID,
    inlineEditValues,
    onError,
    onRefresh,
    onSuccess,
    options,
    setIsUpdating,
  ])

  const submitEdit = useCallback(async () => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const episodeID = parsePositiveInt(editFormValues.id)
    if (!episodeID) {
      onError('Episode-ID ist ungueltig.')
      return
    }

    const payload = buildEpisodePatchPayload(selectedEpisode, editFormValues, editFormClearFlags)

    if (Object.keys(payload).length === 0) {
      onError('Keine Aenderungen zum Speichern vorhanden.')
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
  }, [
    authToken,
    editFormClearFlags,
    editFormValues,
    hasAuthToken,
    onError,
    onRefresh,
    onSuccess,
    options,
    selectedEpisode,
    setIsUpdating,
  ])

  const submitCreate = useCallback(
    async (animeID: number) => {
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
    },
    [
      authToken,
      createFormValues,
      hasAuthToken,
      onError,
      onRefresh,
      onSuccess,
      options,
      setCreateFormValues,
      setEditFormValues,
      setIsCreating,
      setSelectedID,
    ],
  )

  return {
    saveInlineEdit,
    submitEdit,
    submitCreate,
    cancelInlineEdit,
  }
}

