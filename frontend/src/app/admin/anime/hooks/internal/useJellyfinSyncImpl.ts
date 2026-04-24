import { useCallback, useState } from 'react'

import { getAnimeList, previewAdminAnimeFromJellyfin, searchAdminJellyfinSeries, syncAdminAnimeFromJellyfin } from '@/lib/api'
import {
  AdminAnimeJellyfinPreviewResult,
  AdminAnimeJellyfinSyncRequest,
  AdminAnimeJellyfinSyncResult,
  AdminJellyfinSeriesSearchItem,
} from '@/types/admin'
import { AnimeListItem, EpisodeStatus } from '@/types/anime'

import { CoverFilter, JellyfinSyncFeedback, JellyfinSyncState } from '../../types/admin-anime'
import { normalizeOptionalString, parsePositiveInt } from '../../utils/anime-helpers'
import { buildJellyfinFeedback, formatJellyfinActionError } from '../../utils/jellyfin-sync-feedback'

const ANIME_BROWSER_PER_PAGE = 20

interface JellyfinSyncActions {
  setSearchQuery: (q: string) => void
  selectSeries: (id: string) => void
  setSeasonInput: (s: string) => void
  setEpisodeStatus: (s: EpisodeStatus) => void
  setCleanupVersions: (value: boolean) => void
  setAllowMismatch: (value: boolean) => void
  search: () => Promise<void>
  preview: (animeID: number) => Promise<void>
  sync: (animeID: number, options?: { requireFreshPreview?: boolean }) => Promise<boolean>
  syncRow: (anime: AnimeListItem, selectedSeriesID?: string) => Promise<void>
  syncGlobal: (options: {
    total: number
    totalPages: number
    page: number
    letter: string
    query: string
    hasCover: CoverFilter
    currentPageItems: AnimeListItem[]
    contextAnimeID: number | null
    onContextTouched?: (animeID: number) => Promise<void>
    onBrowserRefresh?: () => Promise<void>
  }) => Promise<void>
  reset: () => void
}

export function useJellyfinSync(
  authToken: string,
  onSuccess: (msg: string) => void,
  onError: (msg: string) => void,
): JellyfinSyncState & JellyfinSyncActions {
  const [searchQuery, setSearchQuery] = useState('')
  const [seriesOptions, setSeriesOptions] = useState<AdminJellyfinSeriesSearchItem[]>([])
  const [selectedSeriesID, setSelectedSeriesID] = useState('')
  const [seasonInput, setSeasonInputState] = useState('1')
  const [episodeStatus, setEpisodeStatusState] = useState<EpisodeStatus>('private')
  const [cleanupVersions, setCleanupVersionsState] = useState(false)
  const [allowMismatch, setAllowMismatchState] = useState(false)
  const [previewResult, setPreviewResult] = useState<AdminAnimeJellyfinPreviewResult | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<AdminAnimeJellyfinSyncResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBulkSyncing, setIsBulkSyncing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; success: number; failed: number } | null>(null)
  const [syncingAnimeIDs, setSyncingAnimeIDs] = useState<Record<number, true>>({})
  const [searchFeedback, setSearchFeedback] = useState<JellyfinSyncFeedback | null>(null)
  const [previewFeedback, setPreviewFeedback] = useState<JellyfinSyncFeedback | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<JellyfinSyncFeedback | null>(null)

  const hasAuthToken = authToken.trim().length > 0

  const setSearchQueryValue = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const selectSeries = useCallback((value: string) => {
    setSelectedSeriesID(value)
    setPreviewResult(null)
    setLastSyncResult(null)
    setPreviewFeedback(null)
    setSyncFeedback(null)
  }, [])

  const setSeasonInput = useCallback((value: string) => {
    setSeasonInputState(value)
    setPreviewResult(null)
    setLastSyncResult(null)
    setPreviewFeedback(null)
    setSyncFeedback(null)
  }, [])

  const setEpisodeStatus = useCallback((value: EpisodeStatus) => {
    setEpisodeStatusState(value)
    setPreviewResult(null)
    setLastSyncResult(null)
    setPreviewFeedback(null)
    setSyncFeedback(null)
  }, [])

  const setCleanupVersions = useCallback((value: boolean) => {
    setCleanupVersionsState(value)
  }, [])

  const setAllowMismatch = useCallback((value: boolean) => {
    setAllowMismatchState(value)
  }, [])

  const search = useCallback(async () => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const query = searchQuery.trim()
    if (!query) {
      onError('Bitte einen Suchbegriff fuer Jellyfin angeben.')
      return
    }

    try {
      setIsSearching(true)
      setSearchFeedback(null)
      setPreviewFeedback(null)
      setSyncFeedback(null)
      setSeriesOptions([])
      setSelectedSeriesID('')
      setPreviewResult(null)
      setLastSyncResult(null)
      const response = await searchAdminJellyfinSeries(query, { limit: 50 }, authToken)
      setSeriesOptions(response.data)
      if (response.data.length === 1) {
        setSelectedSeriesID(response.data[0].jellyfin_series_id)
      }
      if (response.data.length === 0) {
        onSuccess('Keine Jellyfin-Serien fuer die Suche gefunden.')
      } else {
        const message =
          response.data.length === 1
            ? '1 Jellyfin-Treffer gefunden und direkt vorausgewaehlt.'
            : `${response.data.length} Jellyfin-Treffer gefunden.`
        setSearchFeedback(buildJellyfinFeedback('success', message))
        onSuccess(message)
      }
    } catch (error) {
      const feedback = formatJellyfinActionError(error, 'Jellyfin-Suche fehlgeschlagen.')
      setSearchFeedback(feedback)
      onError(feedback.message)
    } finally {
      setIsSearching(false)
    }
  }, [authToken, hasAuthToken, onError, onSuccess, searchQuery])

  const preview = useCallback(async (animeID: number) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const seasonNumber = parsePositiveInt(seasonInput)
    if (!seasonNumber) {
      onError('Season Number muss groesser als 0 sein.')
      return
    }
    const selected = selectedSeriesID.trim()
    if (!selected) {
      onError('Bitte zuerst einen Jellyfin-Treffer auswaehlen.')
      return
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      jellyfin_series_id: selected,
      season_number: seasonNumber,
      episode_status: episodeStatus,
    }

    try {
      setIsLoadingPreview(true)
      setPreviewFeedback(null)
      setSyncFeedback(null)
      setPreviewResult(null)
      const response = await previewAdminAnimeFromJellyfin(animeID, payload, authToken)
      setPreviewResult(response.data)
      if (response.data.accepted_unique_episodes === 0) {
        const feedback = buildJellyfinFeedback(
          'error',
          'Keine importierbaren Episoden in der Preview gefunden.',
          'Bitte Season-Nummer oder Serienauswahl pruefen.',
        )
        setPreviewFeedback(feedback)
        onError(feedback.message)
      } else {
        const message = `Preview geladen: ${response.data.jellyfin_series_name} | Treffer ${response.data.matched_episodes}/${response.data.scanned_episodes} | Pfad-gefiltert ${response.data.path_filtered_episodes}`
        setPreviewFeedback(buildJellyfinFeedback('success', message))
        onSuccess(message)
      }
    } catch (error) {
      const feedback = formatJellyfinActionError(error, 'Jellyfin-Preview fehlgeschlagen.')
      setPreviewFeedback(feedback)
      onError(feedback.message)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [authToken, episodeStatus, hasAuthToken, onError, onSuccess, seasonInput, selectedSeriesID])

  const sync = useCallback(async (animeID: number, options: { requireFreshPreview?: boolean } = {}) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return false
    }

    const seasonNumber = parsePositiveInt(seasonInput)
    if (!seasonNumber) {
      onError('Season Number muss groesser als 0 sein.')
      return false
    }

    const selected = selectedSeriesID.trim()
    if (!selected) {
      const feedback = buildJellyfinFeedback('error', 'Bitte zuerst einen Jellyfin-Treffer auswaehlen.')
      setSyncFeedback(feedback)
      onError(feedback.message)
      return false
    }
    if (
      options.requireFreshPreview !== false &&
      (!previewResult ||
        previewResult.anime_id !== animeID ||
        previewResult.jellyfin_series_id !== selected ||
        previewResult.season_number !== seasonNumber)
    ) {
      const feedback = buildJellyfinFeedback('error', 'Bitte zuerst eine aktuelle Jellyfin-Preview fuer diese Auswahl laden.')
      setSyncFeedback(feedback)
      onError(feedback.message)
      return false
    }

    if (options.requireFreshPreview !== false && previewResult && previewResult.accepted_unique_episodes === 0) {
      const feedback = buildJellyfinFeedback(
        'error',
        'Die aktuelle Preview enthaelt keine importierbaren Episoden.',
        'Bitte Season-Nummer oder Serienauswahl pruefen.',
      )
      setSyncFeedback(feedback)
      onError(feedback.message)
      return false
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      jellyfin_series_id: normalizeOptionalString(selectedSeriesID),
      season_number: seasonNumber,
      episode_status: episodeStatus,
      cleanup_provider_versions: cleanupVersions,
      allow_mismatch: allowMismatch,
    }

    try {
      setIsSyncing(true)
      setSyncFeedback(null)
      const response = await syncAdminAnimeFromJellyfin(animeID, payload, authToken)
      const result = response.data
      setLastSyncResult(result)
      const deletedInfo = result.deleted_versions ? ` | Geloescht -${result.deleted_versions}` : ''
      const message = `Jellyfin Sync OK: ${result.jellyfin_series_name} | Episoden +${result.imported_episodes}/~${result.updated_episodes} | Versionen +${result.imported_versions}/~${result.updated_versions}${deletedInfo}`
      setSyncFeedback(buildJellyfinFeedback('success', message))
      onSuccess(message)
      return true
    } catch (error) {
      const feedback = formatJellyfinActionError(error, 'Jellyfin Sync fehlgeschlagen.')
      setSyncFeedback(feedback)
      onError(feedback.message)
      return false
    } finally {
      setIsSyncing(false)
    }
  }, [allowMismatch, authToken, cleanupVersions, episodeStatus, hasAuthToken, onError, onSuccess, previewResult, seasonInput, selectedSeriesID])

  const syncRow = useCallback(async (anime: AnimeListItem, overrideSeriesID?: string) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    const seasonNumber = parsePositiveInt(seasonInput)
    if (!seasonNumber) {
      onError('Season Number muss groesser als 0 sein.')
      return
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      jellyfin_series_id: normalizeOptionalString(overrideSeriesID || ''),
      season_number: seasonNumber,
      episode_status: episodeStatus,
    }

    try {
      setSyncingAnimeIDs((current) => ({ ...current, [anime.id]: true }))
      const response = await syncAdminAnimeFromJellyfin(anime.id, payload, authToken)
      const result = response.data
      onSuccess(
        `Jellyfin Sync OK fuer #${anime.id} ${anime.title}: Episoden +${result.imported_episodes}/~${result.updated_episodes} | Versionen +${result.imported_versions}/~${result.updated_versions}`,
      )
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError(`Jellyfin Sync fuer #${anime.id} fehlgeschlagen.`)
    } finally {
      setSyncingAnimeIDs((current) => {
        if (!current[anime.id]) return current
        const next = { ...current }
        delete next[anime.id]
        return next
      })
    }
  }, [authToken, episodeStatus, hasAuthToken, onError, onSuccess, seasonInput])

  const syncGlobal = useCallback(async (options: {
    total: number
    totalPages: number
    page: number
    letter: string
    query: string
    hasCover: CoverFilter
    currentPageItems: AnimeListItem[]
    contextAnimeID: number | null
    onContextTouched?: (animeID: number) => Promise<void>
    onBrowserRefresh?: () => Promise<void>
  }) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (options.total <= 0) {
      onError('Keine Anime-Treffer zum Synchronisieren vorhanden.')
      return
    }
    const seasonNumber = parsePositiveInt(seasonInput)
    if (!seasonNumber) {
      onError('Season Number muss groesser als 0 sein.')
      return
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      season_number: seasonNumber,
      episode_status: episodeStatus,
    }
    const hasCoverParam = options.hasCover === 'all' ? undefined : options.hasCover === 'present'
    let done = 0
    let success = 0
    let failed = 0
    const failedIDs: number[] = []
    let contextTouched = false

    try {
      setIsBulkSyncing(true)
      setBulkProgress({ done: 0, total: options.total, success: 0, failed: 0 })
      for (let page = 1; page <= options.totalPages; page += 1) {
        const pageItems =
          page === options.page
            ? options.currentPageItems
            : (
                await getAnimeList({
                  page,
                  per_page: ANIME_BROWSER_PER_PAGE,
                  letter: options.letter || undefined,
                  q: options.query || undefined,
                  has_cover: hasCoverParam,
                  include_disabled: true,
                })
              ).data

        for (const anime of pageItems) {
          try {
            await syncAdminAnimeFromJellyfin(anime.id, payload, authToken)
            success += 1
            if (options.contextAnimeID && anime.id === options.contextAnimeID) contextTouched = true
          } catch {
            failed += 1
            if (failedIDs.length < 8) failedIDs.push(anime.id)
          } finally {
            done += 1
            setBulkProgress({ done, total: options.total, success, failed })
          }
        }
      }

      if (contextTouched && options.contextAnimeID && options.onContextTouched) {
        await options.onContextTouched(options.contextAnimeID)
      }
      if (options.onBrowserRefresh) {
        await options.onBrowserRefresh()
      }
      if (failed === 0) {
        onSuccess(`Jellyfin Global Sync beendet: ${success}/${done} Anime erfolgreich synchronisiert.`)
      } else {
        onError(
          `Jellyfin Global Sync beendet: ${success}/${done} ok, ${failed} fehlgeschlagen. Beispiel-IDs: ${failedIDs
            .map((id) => `#${id}`)
            .join(', ')}`,
        )
      }
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Jellyfin Global Sync fehlgeschlagen.')
    } finally {
      setIsBulkSyncing(false)
    }
  }, [authToken, episodeStatus, hasAuthToken, onError, onSuccess, seasonInput])

  const reset = useCallback(() => {
    setSeriesOptions([])
    setSelectedSeriesID('')
    setPreviewResult(null)
    setLastSyncResult(null)
    setAllowMismatchState(false)
    setSearchFeedback(null)
    setPreviewFeedback(null)
    setSyncFeedback(null)
  }, [])

  return {
    searchQuery,
    seriesOptions,
    selectedSeriesID,
    seasonInput,
    episodeStatus,
    cleanupVersions,
    allowMismatch,
    previewResult,
    lastSyncResult,
    isSearching,
    isLoadingPreview,
    isSyncing,
    isBulkSyncing,
    bulkProgress,
    syncingAnimeIDs,
    searchFeedback,
    previewFeedback,
    syncFeedback,
    setSearchQuery: setSearchQueryValue,
    selectSeries,
    setSeasonInput,
    setEpisodeStatus,
    setCleanupVersions,
    setAllowMismatch,
    search,
    preview,
    sync,
    syncRow,
    syncGlobal,
    reset,
  }
}
