'use client'

import { useState } from 'react'

import { ApiError } from '@/lib/api'
import { linkAdminAnimeAniSearchSource } from '@/lib/api/admin/anime-core'
import { searchAdminAnimeCreateAniSearchCandidates } from '@/lib/api/admin-anime-intake'
import type {
  AdminAnimeAniSearchSearchCandidate,
  AdminAnimeAniSearchTakeoverResult,
} from '@/types/admin'

import { formatAdminError } from '../utils/studio-helpers'
import { extractAniSearchIDFromLinkInput } from '../utils/anime-helpers'

export interface AnimeEditAniSearchLinkConflict {
  existingTitle: string
  redirectPath: string
}

interface UseAnimeEditAniSearchLinkOptions {
  animeID: number
  onLinked: (result: { anisearchID: string; source: string }) => void
}

/**
 * Task 3 (quick-261018-l5r): State + Handler für die neue "AniSearch verknüpfen"-Karte in der
 * Anime-Bearbeitung -- Titel-Suche (wiederverwendet den Create-Flow-Suchendpunkt) und direkte
 * ID/URL-Eingabe, beide münden in genau einem additiven, sofort persistierenden
 * "Verknüpfen"-Request (POST /admin/anime/:id/anisearch/link, Task 1).
 */
export function useAnimeEditAniSearchLink({ animeID, onLinked }: UseAnimeEditAniSearchLinkOptions) {
  const [titleQuery, setTitleQuery] = useState('')
  const [idOrUrlInput, setIdOrUrlInput] = useState('')
  const [candidates, setCandidates] = useState<AdminAnimeAniSearchSearchCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [linkErrorMessage, setLinkErrorMessage] = useState<string | null>(null)
  const [linkConflict, setLinkConflict] = useState<AnimeEditAniSearchLinkConflict | null>(null)
  const [linkSuccessMessage, setLinkSuccessMessage] = useState<string | null>(null)
  const [linkTakeover, setLinkTakeover] = useState<AdminAnimeAniSearchTakeoverResult | null>(null)

  async function handleTitleSearch() {
    const query = titleQuery.trim()
    if (!query) {
      setLinkErrorMessage('Bitte zuerst einen Suchbegriff eingeben.')
      return
    }

    try {
      setIsSearching(true)
      setLinkErrorMessage(null)
      const response = await searchAdminAnimeCreateAniSearchCandidates(query, { limit: 8 })
      setCandidates(response.data)
    } catch (error) {
      setLinkErrorMessage(formatAdminError(error, 'AniSearch-Suche fehlgeschlagen.'))
    } finally {
      setIsSearching(false)
    }
  }

  function handleSelectCandidate(candidate: AdminAnimeAniSearchSearchCandidate) {
    setIdOrUrlInput(candidate.anisearch_id)
    setLinkErrorMessage(null)
    setLinkConflict(null)
  }

  async function handleLink() {
    const extractedID = extractAniSearchIDFromLinkInput(idOrUrlInput)
    if (!extractedID) {
      setLinkErrorMessage('Bitte zuerst eine AniSearch-ID oder -URL eingeben.')
      return
    }

    try {
      setIsLinking(true)
      setLinkErrorMessage(null)
      setLinkConflict(null)
      setLinkSuccessMessage(null)
      setLinkTakeover(null)
      const response = await linkAdminAnimeAniSearchSource(animeID, { anisearch_id: extractedID })
      setLinkSuccessMessage(`AniSearch-ID ${response.data.anisearch_id} wurde verknüpft.`)
      setLinkTakeover(response.data.takeover ?? null)
      onLinked({ anisearchID: response.data.anisearch_id, source: response.data.source })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.conflict) {
        setLinkConflict({
          existingTitle: error.conflict.existing_title,
          redirectPath: error.conflict.redirect_path,
        })
      } else {
        setLinkErrorMessage(formatAdminError(error, 'AniSearch-Verknüpfung fehlgeschlagen.'))
      }
    } finally {
      setIsLinking(false)
    }
  }

  return {
    titleQuery,
    setTitleQuery,
    idOrUrlInput,
    setIdOrUrlInput,
    candidates,
    isSearching,
    isLinking,
    linkErrorMessage,
    linkConflict,
    linkSuccessMessage,
    linkTakeover,
    handleTitleSearch,
    handleSelectCandidate,
    handleLink,
  }
}
