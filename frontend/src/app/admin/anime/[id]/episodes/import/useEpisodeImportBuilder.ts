'use client'

import { useEffect, useMemo, useState } from 'react'
import { jellyfinSourceKey } from '@/lib/jellyfinSourceIdentity'

import {
  applyEpisodeImport,
  getEpisodeImportContext,
  previewEpisodeImport,
} from '@/lib/api'
import type {
  EpisodeImportApplyInput,
  EpisodeImportApplyMappingRow,
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
  hasReviewedMediaSource,
  markAllSuggestedConfirmed,
  markAllSuggestedSkipped,
  resolveEpisodeDisplayTitle,
  removeMappingFansubGroup,
  serializeEpisodeImportMappingRow,
  setMappingReleaseMeta,
  setMappingFansubGroups,
  setMappingTargets,
  skipEpisodeMappingRows,
  summarizeImportPreview,
  resolveMappingGroupEpisodeNumber,
  toggleMappingSkipped,
} from './episodeImportMapping'
import { applyEinteilerTitlePrefill } from './episodeImportEinteilerTitle'

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
  applyingRowId: string | null
  errorMessage: string | null
  applyErrorMessage: string | null
  summary: ReturnType<typeof summarizeImportPreview> | null
  canApply: boolean
  hasSuggestedRows: boolean
  episodeGroups: EpisodeGroup[]
  unmappedMappingRows: EpisodeImportMappingRow[]
  loadPreview: (jellyfinSeriesIDOverride?: string) => Promise<void>
  applyMappings: () => Promise<void>
  applyRow: (sourceKey: string) => Promise<void>
  setAniSearchID: (value: string) => void
  setSeasonOffset: (value: string) => void
  setTargets: (sourceKey: string, rawTargets: string) => void
  setReleaseMeta: (sourceKey: string, meta: { fansubGroupName?: string; releaseVersion?: string }) => void
  setSelectedFansubGroups: (sourceKey: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  addSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  removeSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  applyFansubGroupToEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  applyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  setEpisodeTitle: (episodeNumber: number, title: string) => void
  skipMapping: (sourceKey: string) => void
  skipAllSuggested: () => void
  confirmAllSuggested: () => void
  confirmEpisodeRows: (episodeNumber: number) => void
  skipEpisodeRows: (episodeNumber: number) => void
}

export function useEpisodeImportBuilder(animeID: number | null): UseEpisodeImportBuilderState {
  const [context, setContext] = useState<EpisodeImportContextResult | null>(null)
  const [preview, setPreview] = useState<EpisodeImportPreviewResult | null>(null)
  const [mappingRows, setMappings] = useState<EpisodeImportMappingRow[]>([])
  const mappings = useMemo(
    () => detectMappingConflicts(mappingRows, preview?.media_candidates),
    [mappingRows, preview],
  )
  const [applyResult, setApplyResult] = useState<EpisodeImportApplyResult | null>(null)
  const [anisearchID, setAniSearchID] = useState('')
  const [seasonOffset, setSeasonOffset] = useState('0')
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applyingRowId, setApplyingRowId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadContext() {
      if (!animeID) {
        setErrorMessage('Ungültige Anime-ID.')
        setIsLoadingContext(false)
        return
      }

      setIsLoadingContext(true)
      setErrorMessage(null)
      setApplyErrorMessage(null)
      try {
        const response = await getEpisodeImportContext(animeID)
        setContext(response.data)
        setAniSearchID(response.data.anisearch_id ?? '')
      } catch (error) {
        setErrorMessage(formatEpisodeImportError(error, 'Import-Kontext konnte nicht geladen werden.'))
      } finally {
        setIsLoadingContext(false)
      }
    }

    void loadContext()
  }, [animeID])

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
      const groupEpisodeNumber = resolveMappingGroupEpisodeNumber(row)
      if (groupEpisodeNumber != null) {
        const existing = groupMap.get(groupEpisodeNumber) ?? []
        existing.push(row)
        groupMap.set(groupEpisodeNumber, existing)
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
    return mappings.filter((row) => resolveMappingGroupEpisodeNumber(row) == null)
  }, [mappings])

  async function loadPreview(jellyfinSeriesIDOverride?: string) {
    if (!animeID) return
    setIsPreviewing(true)
    setErrorMessage(null)
    setApplyErrorMessage(null)
    setApplyResult(null)
    try {
      const response = await previewEpisodeImport(
        animeID,
        {
          anisearch_id: anisearchID.trim(),
          jellyfin_series_id: jellyfinSeriesIDOverride?.trim() || undefined,
          season_offset: Number.parseInt(seasonOffset, 10) || 0,
        },
      )
      const normalizedPreview = normalizePreviewResult(response.data)
      setPreview(normalizedPreview)
      setMappings(normalizedPreview.mappings)
    } catch (error) {
      setErrorMessage(formatEpisodeImportError(error, 'Vorschau konnte nicht geladen werden.'))
    } finally {
      setIsPreviewing(false)
    }
  }

  async function applyMappings() {
    if (!animeID || !preview || !canApply) return
    setIsApplying(true)
    setApplyErrorMessage(null)
    try {
      const response = await applyEpisodeImport(
        animeID,
        buildEpisodeImportApplyInput(animeID, preview, mappings),
      )
      setApplyResult(response.data)
    } catch (error) {
      setApplyErrorMessage(formatEpisodeImportError(error, 'Mapping konnte nicht angewendet werden.'))
    } finally {
      setIsApplying(false)
    }
  }

  async function applyRow(sourceKey: string) {
    if (!animeID || !preview) return
    const targetRow = mappings.find((row) => jellyfinSourceKey(row) === sourceKey)
    if (!targetRow || targetRow.status !== 'confirmed') return

    setApplyingRowId(sourceKey)
    setErrorMessage(null)
    try {
      await applyEpisodeImport(
        animeID,
        buildEpisodeImportApplyInput(animeID, preview, [targetRow]),
      )
      // Remove the applied row from local state
      setMappings((current) => current.filter((row) => jellyfinSourceKey(row) !== sourceKey))
    } catch (error) {
      setErrorMessage(formatEpisodeImportError(error, 'Einzelnes Mapping konnte nicht angewendet werden.'))
    } finally {
      setApplyingRowId(null)
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
    applyingRowId,
    errorMessage,
    applyErrorMessage,
    summary,
    canApply,
    hasSuggestedRows,
    episodeGroups,
    unmappedMappingRows,
    loadPreview,
    applyMappings,
    applyRow,
    setAniSearchID,
    setSeasonOffset,
    setTargets: (sourceKey, rawTargets) =>
      setMappings((current) => setMappingTargets(current, sourceKey, rawTargets)),
    setReleaseMeta: (sourceKey, meta) =>
      setMappings((current) => setMappingReleaseMeta(current, sourceKey, meta)),
    setSelectedFansubGroups: (sourceKey, fansubGroups) =>
      setMappings((current) => setMappingFansubGroups(current, sourceKey, fansubGroups)),
    addSelectedFansubGroup: (sourceKey, fansubGroup) =>
      setMappings((current) => addMappingFansubGroup(current, sourceKey, fansubGroup)),
    removeSelectedFansubGroup: (sourceKey, fansubGroup) =>
      setMappings((current) => removeMappingFansubGroup(current, sourceKey, fansubGroup)),
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
    skipMapping: (sourceKey) =>
      setMappings((current) => toggleMappingSkipped(current, sourceKey)),
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

export function buildEpisodeImportApplyInput(
  animeID: number,
  preview: EpisodeImportPreviewResult,
  mappings: EpisodeImportMappingRow[],
): EpisodeImportApplyInput {
  const reviewedMappings: EpisodeImportApplyMappingRow[] = []
  for (const row of detectMappingConflicts(mappings, preview.media_candidates ?? [])) {
    if (row.status === 'skipped') {
      reviewedMappings.push({ ...serializeEpisodeImportMappingRow(row), status: 'skipped' })
      continue
    }
    if (row.status !== 'confirmed' || !row.media_source_id?.trim() ||
      !hasReviewedMediaSource(row, preview.media_candidates ?? [])) {
      throw new Error('Die geprüfte Quelle fehlt oder wurde geändert. Bitte die Vorschau erneut laden.')
    }
    reviewedMappings.push({ ...serializeEpisodeImportMappingRow(row), status: 'confirmed', media_source_id: row.media_source_id })
  }
  return {
    anime_id: animeID,
    canonical_episodes: preview.canonical_episodes,
    media_candidates: preview.media_candidates ?? [],
    mappings: reviewedMappings,
  }
}

export function normalizePreviewResult(preview: EpisodeImportPreviewResult): EpisodeImportPreviewResult {
  return {
    ...preview,
    canonical_episodes: applyEinteilerTitlePrefill(
      preview.canonical_episodes ?? [],
      preview.is_einteiler ?? false,
      preview.anime_title,
    ),
    media_candidates: preview.media_candidates ?? [],
    mappings: detectMappingConflicts((preview.mappings ?? []).map((row) => {
      const candidates = (preview.media_candidates ?? []).filter(
        (candidate) => candidate.media_item_id === row.media_item_id,
      )
      // Seed only at the preview boundary. Apply must never repair a lost selector.
      const reviewedRow = {
        ...row,
        media_source_id: row.media_source_id ?? (candidates.length === 1 ? candidates[0].media_source_id : null),
      }
      const detectedGroupName = row.fansub_group_name?.trim()
      if ((row.fansub_groups?.length ?? 0) > 0 || !detectedGroupName) return reviewedRow
      return serializeEpisodeImportMappingRow({
        ...reviewedRow,
        fansub_groups: [{ name: detectedGroupName }],
      })
    }), preview.media_candidates ?? []),
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
