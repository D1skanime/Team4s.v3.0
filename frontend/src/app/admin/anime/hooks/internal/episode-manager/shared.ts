import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeManagerState } from '../../../types/admin-anime'
import { normalizeOptionalString } from '../../../utils/anime-helpers'

export interface UseEpisodeManagerOptions {
  onRequest?: (value: string | null) => void
  onResponse?: (value: string | null) => void
}

export type EpisodePatchPayload = { episode_number?: string; title?: string | null; stream_link?: string | null; status?: EpisodeStatus }

export function buildEpisodePatchPayload(
  selectedEpisode: EpisodeListItem | null,
  formValues: EpisodeManagerState['editFormValues'],
  clearFlags: EpisodeManagerState['editFormClearFlags'],
): EpisodePatchPayload {
  if (!selectedEpisode) return {}

  const payload: EpisodePatchPayload = {}
  const currentTitle = normalizeOptionalString(selectedEpisode.title || '')
  const currentStream = normalizeOptionalString((selectedEpisode.stream_links && selectedEpisode.stream_links[0]) || '')

  const number = normalizeOptionalString(formValues.number)
  if (number && number !== selectedEpisode.episode_number) payload.episode_number = number

  if (clearFlags.title) {
    if (currentTitle !== null) payload.title = null
  } else {
    const title = normalizeOptionalString(formValues.title)
    if (title !== null && title !== currentTitle) payload.title = title
  }

  if (clearFlags.streamLink) {
    if (currentStream !== null) payload.stream_link = null
  } else {
    const streamLink = normalizeOptionalString(formValues.streamLink)
    if (streamLink !== null && streamLink !== currentStream) payload.stream_link = streamLink
  }

  if (formValues.status && formValues.status !== selectedEpisode.status) {
    payload.status = formValues.status as EpisodeStatus
  }

  return payload
}

