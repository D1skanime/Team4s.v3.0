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
  EpisodeImportCanonicalEpisode,
  EpisodeImportContextResult,
  EpisodeImportMappingRow,
  EpisodeImportPreviewResult,
  EpisodeImportSelectedFansubGroup,
} from '@/types/episodeImport'

import {
  addMappingFansubGroup,
  applyFansubGroupFromEpisodeDown,
  applyFansubGroupToEpisodeRows,
  confirmEpisodeMappingRows,
  detectMappingConflicts,
  markAllSuggestedConfirmed,
  markAllSuggestedSkipped,
  markMappingSkipped,
  resolveEpisodeDisplayTitle,
  removeMappingFansubGroup,
  setMappingReleaseMeta,
  setMappingFansubGroups,
  setMappingTargets,
  skipEpisodeMappingRows,
  summarizeImportPreview,
} from './episodeImportMapping'

export interface EpisodeGroup {
  episodeNumber: number
  title: string | null
  existingEpisodeId: number | null
  /** Filler classification for the canonical episode, e.g. "filler", "canon", "mixed", "recap". */
  fillerType: string | null
  fillerNote: string | null
  coveredEpisodes: Array<{
    episodeNumber: number
    title: string | null
    fillerType: string | null
  }>
  lastCoveredEpisodeNumber: number
  rows: EpisodeImportMappingRow[]
}

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
  hasSuggestedRows: boolean
  episodeGroups: EpisodeGroup[]
  unmappedMappingRows: EpisodeImportMappingRow[]
  loadPreview: () => Promise<void>
  applyMappings: () => Promise<void>
  setAniSearchID: (value: string) => void
  setSeasonOffset: (value: string) => void
  setTargets: (mediaItemID: string, rawTargets: string) => void
  setReleaseMeta: (mediaItemID: string, meta: { fansubGroupName?: string; releaseVersion?: string }) => void
  setSelectedFansubGroups: (mediaItemID: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  addSelectedFansubGroup: (mediaItemID: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  removeSelectedFansubGroup: (mediaItemID: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  applyFansubGroupToEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  applyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  setEpisodeTitle: (episodeNumber: number, title: string) => void
  skipMapping: (mediaItemID: string) => void
  skipAllSuggested: () => void
  confirmAllSuggested: () => void
  confirmEpisodeRows: (episodeNumber: number) => void
  skipEpisodeRows: (episodeNumber: number) => void
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
        setErrorMessage('Ungültige Anime-ID.')
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

  const hasSuggestedRows = useMemo(
    () => mappings.some((row) => row.status === 'suggested'),
    [mappings],
  )

  // Build episode groups: group mapping rows by their first suggested episode number
  const episodeGroups = useMemo<EpisodeGroup[]>(() => {
    if (!preview) return []

    const canonicalMap = new Map<number, EpisodeImportCanonicalEpisode>()
    for (const ep of preview.canonical_episodes ?? []) {
      canonicalMap.set(ep.episode_number, ep)
    }

    const groupMap = new Map<number, EpisodeImportMappingRow[]>()
    for (const row of mappings) {
      const suggested = row.suggested_episode_numbers?.[0]
      if (suggested != null) {
        const existing = groupMap.get(suggested) ?? []
        existing.push(row)
        groupMap.set(suggested, existing)
      }
    }

    return Array.from(groupMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([episodeNumber, rows]) => {
        const ep = canonicalMap.get(episodeNumber)
        return {
          episodeNumber,
          title: ep ? resolveEpisodeDisplayTitle(ep) : null,
          existingEpisodeId: ep?.existing_episode_id ?? null,
          fillerType: ep?.filler_type ?? null,
          fillerNote: ep?.filler_note ?? null,
          coveredEpisodes: Array.from(
            new Set(
              rows.flatMap((row) => row.target_episode_numbers ?? []),
            ),
          )
            .filter((number) => number !== episodeNumber)
            .sort((left, right) => left - right)
            .map((number) => {
              const coveredEpisode = canonicalMap.get(number)
              return {
                episodeNumber: number,
                title: coveredEpisode ? resolveEpisodeDisplayTitle(coveredEpisode) : null,
                fillerType: coveredEpisode?.filler_type ?? null,
              }
            }),
          lastCoveredEpisodeNumber: rows.reduce((maxEpisode, row) => {
            const rowMax = Math.max(episodeNumber, ...(row.target_episode_numbers ?? [episodeNumber]))
            return Math.max(maxEpisode, rowMax)
          }, episodeNumber),
          rows,
        }
      })
  }, [preview, mappings])

  // Mapping rows that have no suggested episode (unmapped candidates)
  const unmappedMappingRows = useMemo<EpisodeImportMappingRow[]>(() => {
    return mappings.filter(
      (row) => !row.suggested_episode_numbers || row.suggested_episode_numbers.length === 0,
    )
  }, [mappings])

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
      const normalizedPreview = normalizePreviewResult(response.data)
      setPreview(normalizedPreview)
      setMappings(detectMappingConflicts(normalizedPreview.mappings))
    } catch (error) {
      setErrorMessage(formatEpisodeImportError(error, 'Vorschau konnte nicht geladen werden.'))
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
          media_candidates: preview.media_candidates ?? [],
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
    hasSuggestedRows,
    episodeGroups,
    unmappedMappingRows,
    loadPreview,
    applyMappings,
    setAniSearchID,
    setSeasonOffset,
    setTargets: (mediaItemID, rawTargets) =>
      setMappings((current) => setMappingTargets(current, mediaItemID, rawTargets)),
    setReleaseMeta: (mediaItemID, meta) =>
      setMappings((current) => setMappingReleaseMeta(current, mediaItemID, meta)),
    setSelectedFansubGroups: (mediaItemID, fansubGroups) =>
      setMappings((current) => setMappingFansubGroups(current, mediaItemID, fansubGroups)),
    addSelectedFansubGroup: (mediaItemID, fansubGroup) =>
      setMappings((current) => addMappingFansubGroup(current, mediaItemID, fansubGroup)),
    removeSelectedFansubGroup: (mediaItemID, fansubGroup) =>
      setMappings((current) => removeMappingFansubGroup(current, mediaItemID, fansubGroup)),
    applyFansubGroupToEpisode: (episodeNumber, fansubGroups) =>
      setMappings((current) => applyFansubGroupToEpisodeRows(current, episodeNumber, fansubGroups)),
    applyFansubGroupFromEpisode: (episodeNumber, fansubGroups) =>
      setMappings((current) => applyFansubGroupFromEpisodeDown(current, episodeNumber, fansubGroups)),
    setEpisodeTitle: (episodeNumber, title) =>
      setPreview((current) => {
        if (!current) return current
        const trimmed = title.trim()
        return {
          ...current,
          canonical_episodes: (current.canonical_episodes ?? []).map((episode) => {
            if (episode.episode_number !== episodeNumber) {
              return episode
            }
            const nextTitlesByLanguage = { ...(episode.titles_by_language ?? {}) }
            if (trimmed) {
              nextTitlesByLanguage.de = trimmed
            } else {
              delete nextTitlesByLanguage.de
            }
            return {
              ...episode,
              titles_by_language:
                Object.keys(nextTitlesByLanguage).length > 0 ? nextTitlesByLanguage : null,
              title: trimmed || episode.title || episode.existing_title || null,
            }
          }),
        }
      }),
    skipMapping: (mediaItemID) =>
      setMappings((current) => markMappingSkipped(current, mediaItemID)),
    skipAllSuggested: () =>
      setMappings((current) => markAllSuggestedSkipped(current)),
    confirmAllSuggested: () =>
      setMappings((current) => markAllSuggestedConfirmed(current)),
    confirmEpisodeRows: (episodeNumber) =>
      setMappings((current) => confirmEpisodeMappingRows(current, episodeNumber)),
    skipEpisodeRows: (episodeNumber) =>
      setMappings((current) => skipEpisodeMappingRows(current, episodeNumber)),
  }
}

function normalizePreviewResult(preview: EpisodeImportPreviewResult): EpisodeImportPreviewResult {
  return {
    ...preview,
    canonical_episodes: preview.canonical_episodes ?? [],
    media_candidates: preview.media_candidates ?? [],
    mappings: preview.mappings ?? [],
    unmapped_episodes: preview.unmapped_episodes ?? [],
    unmapped_media_item_ids: preview.unmapped_media_item_ids ?? [],
  }
}

function formatEpisodeImportError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}
