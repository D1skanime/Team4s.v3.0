'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  applyEpisodeImport,
  getEpisodeImportContext,
  getRuntimeAuthToken,
  previewEpisodeImport,
} from '@/lib/api'
import type {
  EpisodeImportApplyResult,
  EpisodeImportContextResult,
  EpisodeImportMappingRow,
  EpisodeImportPreviewResult,
} from '@/types/episodeImport'

import { detectMappingConflicts, markMappingSkipped, setMappingTargets, summarizeImportPreview } from './episodeImportMapping'

interface UseEpisodeImportBuilderState {
  context: EpisodeImportContextResult | null
  preview: EpisodeImportPreviewResult | null
  mappings: EpisodeImportMappingRow[]
  applyResult: EpisodeImportApplyResult | null
  anisearchID: string
  seasonOffset: string
  isLoadingContext: boolean
  isPreviewing: boolean
  isApplying: boolean
  errorMessage: string | null
  summary: ReturnType<typeof summarizeImportPreview> | null
  canApply: boolean
  loadPreview: () => Promise<void>
  applyMappings: () => Promise<void>
  setAniSearchID: (value: string) => void
  setSeasonOffset: (value: string) => void
  setTargets: (mediaItemID: string, rawTargets: string) => void
  skipMapping: (mediaItemID: string) => void
}

export function useEpisodeImportBuilder(animeID: number | null): UseEpisodeImportBuilderState {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [context, setContext] = useState<EpisodeImportContextResult | null>(null)
  const [preview, setPreview] = useState<EpisodeImportPreviewResult | null>(null)
  const [mappings, setMappings] = useState<EpisodeImportMappingRow[]>([])
  const [applyResult, setApplyResult] = useState<EpisodeImportApplyResult | null>(null)
  const [anisearchID, setAniSearchID] = useState('')
  const [seasonOffset, setSeasonOffset] = useState('0')
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadContext() {
      if (!animeID) {
        setErrorMessage('Ungueltige Anime-ID.')
        setIsLoadingContext(false)
        return
      }

      setIsLoadingContext(true)
      setErrorMessage(null)
      try {
        const response = await getEpisodeImportContext(animeID, authToken)
        setContext(response.data)
        setAniSearchID(response.data.anisearch_id ?? '')
      } catch (error) {
        setErrorMessage(formatEpisodeImportError(error, 'Import-Kontext konnte nicht geladen werden.'))
      } finally {
        setIsLoadingContext(false)
      }
    }

    void loadContext()
  }, [animeID, authToken])

  const summary = useMemo(() => {
    if (!preview) return null
    return summarizeImportPreview({ ...preview, mappings })
  }, [preview, mappings])

  const canApply = useMemo(() => {
    if (!preview || mappings.length === 0) return false
    return mappings.every((row) => row.status === 'confirmed' || row.status === 'skipped')
  }, [preview, mappings])

  async function loadPreview() {
    if (!animeID) return
    setIsPreviewing(true)
    setErrorMessage(null)
    setApplyResult(null)
    try {
      const response = await previewEpisodeImport(
        animeID,
        {
          anisearch_id: anisearchID.trim(),
          season_offset: Number.parseInt(seasonOffset, 10) || 0,
        },
        authToken,
      )
      setPreview(response.data)
      setMappings(detectMappingConflicts(response.data.mappings))
    } catch (error) {
      setErrorMessage(formatEpisodeImportError(error, 'Preview konnte nicht geladen werden.'))
    } finally {
      setIsPreviewing(false)
    }
  }

  async function applyMappings() {
    if (!animeID || !preview || !canApply) return
    setIsApplying(true)
    setErrorMessage(null)
    try {
      const response = await applyEpisodeImport(
        animeID,
        {
          anime_id: animeID,
          canonical_episodes: preview.canonical_episodes,
          media_candidates: preview.media_candidates,
          mappings,
        },
        authToken,
      )
      setApplyResult(response.data)
    } catch (error) {
      setErrorMessage(formatEpisodeImportError(error, 'Mapping konnte nicht angewendet werden.'))
    } finally {
      setIsApplying(false)
    }
  }

  return {
    context,
    preview,
    mappings,
    applyResult,
    anisearchID,
    seasonOffset,
    isLoadingContext,
    isPreviewing,
    isApplying,
    errorMessage,
    summary,
    canApply,
    loadPreview,
    applyMappings,
    setAniSearchID,
    setSeasonOffset,
    setTargets: (mediaItemID, rawTargets) => setMappings((current) => setMappingTargets(current, mediaItemID, rawTargets)),
    skipMapping: (mediaItemID) => setMappings((current) => markMappingSkipped(current, mediaItemID)),
  }
}

function formatEpisodeImportError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}
