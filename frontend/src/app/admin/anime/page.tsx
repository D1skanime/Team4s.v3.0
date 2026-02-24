'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AnimeDetail, AnimeListItem, AnimeStatus, ContentType, EpisodeListItem, EpisodeStatus } from '@/types/anime'
import {
  AdminAnimeJellyfinPreviewResult,
  AdminAnimeJellyfinSyncRequest,
  AdminAnimePatchRequest,
  AdminEpisodePatchRequest,
  AdminJellyfinSeriesSearchItem,
  AnimeType,
  GenreToken,
} from '@/types/admin'
import { FansubGroup } from '@/types/fansub'
import {
  ApiError,
  createAdminEpisode,
  deleteAdminEpisode,
  getAnimeByID,
  getAnimeFansubs,
  getAnimeList,
  getAdminGenreTokens,
  getFansubBySlug,
  getRuntimeAuthToken,
  previewAdminAnimeFromJellyfin,
  searchAdminJellyfinSeries,
  syncAdminAnimeFromJellyfin,
  updateAdminAnime,
  updateAdminEpisode,
} from '@/lib/api'

import styles from '../admin.module.css'

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']
const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']
const ANIME_BROWSER_PER_PAGE = 20

function formatEpisodeStatusLabel(value: EpisodeStatus): string {
  switch (value) {
    case 'public':
      return 'oeffentlich'
    case 'private':
      return 'privat'
    case 'disabled':
    default:
      return 'deaktiviert'
  }
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeGenreToken(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function splitGenreTokens(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (!trimmed.includes(',')) return [normalizeGenreToken(trimmed)].filter(Boolean)
  return trimmed
    .split(',')
    .map((part) => normalizeGenreToken(part))
    .filter(Boolean)
}

function resolveCoverUrl(rawCoverImage?: string): string {
  const value = (rawCoverImage || '').trim()
  if (!value) {
    return '/covers/placeholder.jpg'
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/')) {
    return value
  }

  return `/covers/${value}`
}

function handleCoverImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied === 'true') {
    return
  }
  img.dataset.fallbackApplied = 'true'
  img.alt = ''
  img.src = '/covers/placeholder.jpg'
}

function resolveAnimeStatusClass(status: AnimeStatus): string {
  switch (status) {
    case 'ongoing':
      return 'statusOngoing'
    case 'done':
      return 'statusDone'
    case 'aborted':
      return 'statusAborted'
    case 'licensed':
      return 'statusLicensed'
    case 'disabled':
    default:
      return 'statusDisabled'
  }
}

function resolveEpisodeStatusClass(status: EpisodeStatus): string {
  switch (status) {
    case 'public':
      return 'statusPublic'
    case 'private':
      return 'statusPrivate'
    case 'disabled':
    default:
      return 'statusDisabled'
  }
}

function suggestNextEpisodeNumber(episodes: EpisodeListItem[]): string | null {
  const numeric = episodes
    .map((episode) => (episode.episode_number || '').trim())
    .filter((value) => /^\d+$/.test(value))
    .map((value) => ({ value, number: Number.parseInt(value, 10) }))
    .filter((item) => Number.isFinite(item.number) && item.number > 0)

  if (numeric.length === 0) {
    return null
  }

  const maxItem = numeric.reduce((acc, item) => (item.number > acc.number ? item : acc), numeric[0])
  const width = Math.max(2, maxItem.value.length)
  return String(maxItem.number + 1).padStart(width, '0')
}

function buildFansubStoryPreview(group: FansubGroup): string {
  const raw = (group.history || group.description || '').trim()
  if (!raw) return 'Keine Historie hinterlegt.'
  const normalized = raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const maxLength = 420
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export default function AdminAnimePage() {
  const [authToken, setAuthToken] = useState('')
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)
  const [isSubmittingEpisodeCreate, setIsSubmittingEpisodeCreate] = useState(false)
  const [isSubmittingEpisodeUpdate, setIsSubmittingEpisodeUpdate] = useState(false)
  const [removingEpisodeIDs, setRemovingEpisodeIDs] = useState<Record<number, true>>({})
  const [isLoadingContextAnime, setIsLoadingContextAnime] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const [contextAnimeIDInput, setContextAnimeIDInput] = useState('')
  const [contextAnime, setContextAnime] = useState<AnimeDetail | null>(null)
  const [contextFansubGroups, setContextFansubGroups] = useState<FansubGroup[]>([])
  const [isLoadingContextFansubs, setIsLoadingContextFansubs] = useState(false)
  const [isSyncingJellyfin, setIsSyncingJellyfin] = useState(false)
  const [isBulkSyncingJellyfin, setIsBulkSyncingJellyfin] = useState(false)
  const [bulkJellyfinProgress, setBulkJellyfinProgress] = useState<{
    done: number
    total: number
    success: number
    failed: number
  } | null>(null)
  const [syncingAnimeIDs, setSyncingAnimeIDs] = useState<Record<number, true>>({})
  const [jellyfinSeriesIDInput, setJellyfinSeriesIDInput] = useState('')
  const [jellyfinSearchQuery, setJellyfinSearchQuery] = useState('')
  const [isSearchingJellyfinSeries, setIsSearchingJellyfinSeries] = useState(false)
  const [jellyfinSeriesOptions, setJellyfinSeriesOptions] = useState<AdminJellyfinSeriesSearchItem[]>([])
  const [isLoadingJellyfinPreview, setIsLoadingJellyfinPreview] = useState(false)
  const [jellyfinPreviewResult, setJellyfinPreviewResult] = useState<AdminAnimeJellyfinPreviewResult | null>(null)
  const [jellyfinSeasonInput, setJellyfinSeasonInput] = useState('1')
  const [jellyfinEpisodeStatus, setJellyfinEpisodeStatus] = useState<EpisodeStatus>('private')
  const [jellyfinCleanupVersions, setJellyfinCleanupVersions] = useState(false)
  const [jellyfinAllowMismatch, setJellyfinAllowMismatch] = useState(false)
  const [isLoadingAnimeList, setIsLoadingAnimeList] = useState(false)
  const [animeListItems, setAnimeListItems] = useState<AnimeListItem[]>([])
  const [animeListPage, setAnimeListPage] = useState(1)
  const [animeListTotal, setAnimeListTotal] = useState(0)
  const [animeListTotalPages, setAnimeListTotalPages] = useState(1)
  const [animeListLetter, setAnimeListLetter] = useState('')
  const [animeListQueryInput, setAnimeListQueryInput] = useState('')
  const [animeListQuery, setAnimeListQuery] = useState('')
  const [animeListHasCover, setAnimeListHasCover] = useState<'all' | 'missing' | 'present'>('all')
  const [animeListCoverFailures, setAnimeListCoverFailures] = useState<Record<number, true>>({})

  const [updateAnimeID, setUpdateAnimeID] = useState('')
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateType, setUpdateType] = useState('')
  const [updateContentType, setUpdateContentType] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateYear, setUpdateYear] = useState('')
  const [updateMaxEpisodes, setUpdateMaxEpisodes] = useState('')
  const [updateTitleDE, setUpdateTitleDE] = useState('')
  const [updateTitleEN, setUpdateTitleEN] = useState('')
  const [updateGenreDraft, setUpdateGenreDraft] = useState('')
  const [updateGenreTokens, setUpdateGenreTokens] = useState<string[]>([])
  const [updateDescription, setUpdateDescription] = useState('')
  const [updateCoverImage, setUpdateCoverImage] = useState('')
  const [clearUpdateYear, setClearUpdateYear] = useState(false)
  const [clearUpdateMaxEpisodes, setClearUpdateMaxEpisodes] = useState(false)
  const [clearUpdateTitleDE, setClearUpdateTitleDE] = useState(false)
  const [clearUpdateTitleEN, setClearUpdateTitleEN] = useState(false)
  const [clearUpdateGenre, setClearUpdateGenre] = useState(false)
  const [clearUpdateDescription, setClearUpdateDescription] = useState(false)
  const [clearUpdateCoverImage, setClearUpdateCoverImage] = useState(false)

  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([])
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false)
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null)
  const [genreSuggestionLimit, setGenreSuggestionLimit] = useState(40)

  const [createEpisodeNumber, setCreateEpisodeNumber] = useState('')
  const [createEpisodeTitle, setCreateEpisodeTitle] = useState('')
  const [createEpisodeStatus, setCreateEpisodeStatus] = useState<EpisodeStatus>('private')
  const [updateEpisodeID, setUpdateEpisodeID] = useState('')
  const [updateEpisodeNumber, setUpdateEpisodeNumber] = useState('')
  const [updateEpisodeTitle, setUpdateEpisodeTitle] = useState('')
  const [updateEpisodeStatus, setUpdateEpisodeStatus] = useState('')
  const [updateEpisodeStreamLink, setUpdateEpisodeStreamLink] = useState('')
  const [clearUpdateEpisodeTitle, setClearUpdateEpisodeTitle] = useState(false)
  const [clearUpdateEpisodeStreamLink, setClearUpdateEpisodeStreamLink] = useState(false)
  const [selectedEpisodeID, setSelectedEpisodeID] = useState<number | null>(null)
  const [selectedEpisodeIDs, setSelectedEpisodeIDs] = useState<Record<number, true>>({})
  const [bulkEpisodeStatus, setBulkEpisodeStatus] = useState<EpisodeStatus | ''>('')
  const [isApplyingBulk, setIsApplyingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [inlineEditEpisodeID, setInlineEditEpisodeID] = useState<number | null>(null)
  const [inlineEditEpisodeNumber, setInlineEditEpisodeNumber] = useState('')
  const [inlineEditEpisodeTitle, setInlineEditEpisodeTitle] = useState('')
  const [inlineEditEpisodeStatus, setInlineEditEpisodeStatus] = useState<EpisodeStatus>('private')
  const [inlineEditClearTitle, setInlineEditClearTitle] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [episodeListQuery, setEpisodeListQuery] = useState('')
  const [episodeStatusFilter, setEpisodeStatusFilter] = useState<EpisodeStatus | 'all'>('all')
  const [episodeDensity, setEpisodeDensity] = useState<'compact' | 'comfortable'>('compact')

  const handledInitialContextParamRef = useRef(false)
  const episodeEditAnchorRef = useRef<HTMLDivElement | null>(null)
  const episodeFilterInputRef = useRef<HTMLInputElement | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const contextCardAnchorRef = useRef<HTMLDivElement | null>(null)
  const animePatchAnchorRef = useRef<HTMLDivElement | null>(null)
  const episodesAnchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setAuthToken(getRuntimeAuthToken())
  }, [])

  useEffect(() => {
    if (handledInitialContextParamRef.current) return
    handledInitialContextParamRef.current = true
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('context') || '').trim()
    if (!raw) return

    const animeID = parsePositiveInt(raw)
    if (!animeID) return

    loadContextAnimeByID(animeID)
      .then(() => setSuccessMessage(`Anime-Kontext #${animeID} geladen.`))
      .catch((error) => {
        if (error instanceof ApiError) setErrorMessage(error.message)
        else setErrorMessage('Anime-Kontext konnte nicht geladen werden.')
      })
      .finally(() => {
        window.history.replaceState(null, '', '/admin/anime')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const contextAnimeID = contextAnime?.id ?? null
    const contextAnimeTitle = contextAnime?.title ?? ''

    if (!contextAnimeID) {
      setJellyfinSearchQuery('')
      setJellyfinSeriesOptions([])
      setJellyfinPreviewResult(null)
      setJellyfinSeriesIDInput('')
      setJellyfinAllowMismatch(false)
      return
    }

    setJellyfinSearchQuery(contextAnimeTitle)
    setJellyfinSeriesOptions([])
    setJellyfinPreviewResult(null)
    setJellyfinSeriesIDInput('')
    setJellyfinAllowMismatch(false)
  }, [contextAnime])

  useEffect(() => {
    setJellyfinPreviewResult(null)
  }, [jellyfinSeriesIDInput, jellyfinSeasonInput, jellyfinEpisodeStatus])

  const hasAuthToken = authToken.length > 0
  const tokenPreview = useMemo(() => {
    if (!authToken) {
      return 'n/a'
    }

    return authToken.length > 24 ? `${authToken.slice(0, 24)}...` : authToken
  }, [authToken])

  useEffect(() => {
    if (!hasAuthToken) return
    if (genreTokens.length > 0) return

    setIsLoadingGenreTokens(true)
    setGenreTokensError(null)
    getAdminGenreTokens({ limit: 1000 }, authToken)
      .then((response) => setGenreTokens(response.data))
      .catch((error) => {
        console.error('admin/anime: failed to load genre tokens', error)
        if (error instanceof ApiError) setGenreTokensError(`(${error.status}) ${error.message}`)
        else setGenreTokensError('Genre-Vorschlaege konnten nicht geladen werden.')
      })
      .finally(() => setIsLoadingGenreTokens(false))
  }, [hasAuthToken, authToken, genreTokens.length])

  const visibleAnimeListItems = animeListItems

  const visibleEpisodes = useMemo(() => {
    if (!contextAnime) return []
    const query = episodeListQuery.trim().toLowerCase()

    let filtered = contextAnime.episodes
    if (episodeStatusFilter !== 'all') {
      filtered = filtered.filter((episode) => episode.status === episodeStatusFilter)
    }

    if (!query) return filtered

    return filtered.filter((episode) => {
      const number = (episode.episode_number || '').toLowerCase()
      const title = (episode.title || '').toLowerCase()
      return number.includes(query) || title.includes(query)
    })
  }, [contextAnime, episodeListQuery, episodeStatusFilter])

  const episodeStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 }
    for (const status of EPISODE_STATUSES) counts[status] = 0
    if (!contextAnime) return counts

    counts.all = contextAnime.episodes.length
    for (const episode of contextAnime.episodes) {
      counts[episode.status] = (counts[episode.status] ?? 0) + 1
    }
    return counts
  }, [contextAnime])

  const selectedCount = Object.keys(selectedEpisodeIDs).length
  const selectedVisibleCount = useMemo(() => {
    let count = 0
    for (const episode of visibleEpisodes) {
      if (selectedEpisodeIDs[episode.id]) count += 1
    }
    return count
  }, [visibleEpisodes, selectedEpisodeIDs])

  const allVisibleSelected = visibleEpisodes.length > 0 && selectedVisibleCount === visibleEpisodes.length

  const updateGenreValue = useMemo(() => updateGenreTokens.join(', '), [updateGenreTokens])
  const updateGenreSuggestions = useMemo(() => {
    const q = updateGenreDraft.trim().toLowerCase()
    const selected = new Set(updateGenreTokens.map((token) => token.toLowerCase()))
    const filtered = genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false
      if (!q) return true
      return token.name.toLowerCase().includes(q)
    })
    const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit
    return filtered.slice(0, limit)
  }, [updateGenreDraft, updateGenreTokens, genreTokens, genreSuggestionLimit])

  const updateGenreSuggestionsTotal = useMemo(() => {
    const q = updateGenreDraft.trim().toLowerCase()
    const selected = new Set(updateGenreTokens.map((token) => token.toLowerCase()))
    return genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false
      if (!q) return true
      return token.name.toLowerCase().includes(q)
    }).length
  }, [updateGenreDraft, updateGenreTokens, genreTokens])

  const nextEpisodeNumberSuggestion = useMemo(() => {
    if (!contextAnime) return null
    return suggestNextEpisodeNumber(contextAnime.episodes)
  }, [contextAnime])

  const episodeOpenID = useMemo(() => {
    return selectedEpisodeID ?? parsePositiveInt(updateEpisodeID) ?? null
  }, [selectedEpisodeID, updateEpisodeID])

  function clearMessages() {
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function formatError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return `(${error.status}) ${error.message}`
    }
    return fallback
  }

  function addUpdateGenreTokens(raw: string) {
    const tokens = splitGenreTokens(raw)
    if (tokens.length === 0) return

    setUpdateGenreTokens((current) => {
      const index = new Set(current.map((token) => token.toLowerCase()))
      const next = [...current]
      for (const token of tokens) {
        const key = token.toLowerCase()
        if (index.has(key)) continue
        index.add(key)
        next.push(token)
      }
      return next
    })
  }

  function removeUpdateGenreToken(name: string) {
    setUpdateGenreTokens((current) => current.filter((token) => token.toLowerCase() !== name.toLowerCase()))
  }

  function resetUpdateFormFromContext(anime: AnimeDetail) {
    setUpdateAnimeID(String(anime.id))
    setUpdateTitle(anime.title ?? '')
    setUpdateType((anime.type as AnimeType) ?? '')
    setUpdateContentType((anime.content_type as ContentType) ?? '')
    setUpdateStatus((anime.status as AnimeStatus) ?? '')
    setUpdateYear(anime.year ? String(anime.year) : '')
    setUpdateMaxEpisodes(anime.max_episodes ? String(anime.max_episodes) : '')
    setUpdateTitleDE(anime.title_de ?? '')
    setUpdateTitleEN(anime.title_en ?? '')
    setUpdateGenreTokens(splitGenreTokens(anime.genre ?? ''))
    setUpdateGenreDraft('')
    setUpdateDescription(anime.description ?? '')
    setUpdateCoverImage(anime.cover_image ?? '')

    setClearUpdateYear(false)
    setClearUpdateMaxEpisodes(false)
    setClearUpdateTitleDE(false)
    setClearUpdateTitleEN(false)
    setClearUpdateGenre(false)
    setClearUpdateDescription(false)
    setClearUpdateCoverImage(false)
  }

  const loadAnimeList = useCallback(async (page: number, letter: string, query: string, hasCover: 'all' | 'missing' | 'present') => {
    try {
      setIsLoadingAnimeList(true)
      const hasCoverParam = hasCover === 'all' ? undefined : hasCover === 'present'
      const response = await getAnimeList({
        page,
        per_page: ANIME_BROWSER_PER_PAGE,
        letter: letter || undefined,
        q: query || undefined,
        has_cover: hasCoverParam,
        include_disabled: true,
      })
      setAnimeListItems(response.data)
      setAnimeListTotal(response.meta.total)
      setAnimeListPage(response.meta.page)
      setAnimeListTotalPages(response.meta.total_pages)
    } finally {
      setIsLoadingAnimeList(false)
    }
  }, [])

  useEffect(() => {
    loadAnimeList(animeListPage, animeListLetter, animeListQuery, animeListHasCover).catch((error) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Anime-Liste konnte nicht geladen werden.')
      }
    })
  }, [animeListPage, animeListLetter, animeListQuery, animeListHasCover, loadAnimeList])

  async function loadContextAnimeByID(animeID: number) {
    try {
      setIsLoadingContextAnime(true)
      setIsLoadingContextFansubs(true)
      setContextFansubGroups([])
      const response = await getAnimeByID(animeID, { include_disabled: true })
      const anime = response.data
      setContextAnime(anime)
      setContextAnimeIDInput(String(animeID))

      // Prefill the edit form so "load context" feels like "open existing record".
      resetUpdateFormFromContext(anime)

      let fansubGroups: FansubGroup[] = []
      try {
        const fansubResponse = await getAnimeFansubs(animeID)
        const slugs = Array.from(
          new Set(
            fansubResponse.data
              .map((relation) => relation.fansub_group?.slug?.trim() || '')
              .filter((slug) => slug.length > 0),
          ),
        )
        const details = await Promise.allSettled(slugs.map((slug) => getFansubBySlug(slug)))
        fansubGroups = details
          .filter((item) => item.status === 'fulfilled')
          .map((item) => (item.status === 'fulfilled' ? item.value.data : null))
          .filter((item): item is FansubGroup => item !== null)
      } catch {
        fansubGroups = []
      }
      setContextFansubGroups(fansubGroups)
    } finally {
      setIsLoadingContextAnime(false)
      setIsLoadingContextFansubs(false)
    }
  }

  async function handleSelectAnimeFromBrowser(animeID: number) {
    clearMessages()
    try {
      await loadContextAnimeByID(animeID)
      setSuccessMessage(`Anime-Kontext #${animeID} geladen.`)
      setTimeout(() => {
        contextCardAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Anime-Kontext konnte nicht geladen werden.')
      }
    }
  }

  async function handleContextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const animeID = parsePositiveInt(contextAnimeIDInput)
    if (!animeID) {
      setErrorMessage('Bitte eine gueltige Anime-ID fuer den Kontext angeben.')
      return
    }

    try {
      await loadContextAnimeByID(animeID)
      setSuccessMessage(`Anime-Kontext #${animeID} geladen.`)
      setTimeout(() => {
        contextCardAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    } catch (error) {
      setContextAnime(null)
      setContextFansubGroups([])
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Anime-Kontext konnte nicht geladen werden.')
      }
    }
  }

  async function handleJellyfinSeriesSearch() {
    clearMessages()

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const query = jellyfinSearchQuery.trim()
    if (!query) {
      setErrorMessage('Bitte einen Suchbegriff fuer Jellyfin angeben.')
      return
    }

    try {
      setIsSearchingJellyfinSeries(true)
      const response = await searchAdminJellyfinSeries(query, { limit: 50 }, authToken)
      setJellyfinSeriesOptions(response.data)
      if (response.data.length === 0) {
        setSuccessMessage('Keine Jellyfin-Serien fuer die Suche gefunden.')
      } else {
        setSuccessMessage(`${response.data.length} Jellyfin-Treffer gefunden.`)
      }
    } catch (error) {
      setErrorMessage(formatError(error, 'Jellyfin-Suche fehlgeschlagen.'))
    } finally {
      setIsSearchingJellyfinSeries(false)
    }
  }

  async function handleJellyfinPreview() {
    clearMessages()

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (!contextAnime) {
      setErrorMessage('Bitte zuerst einen Anime-Kontext laden.')
      return
    }

    const selectedSeriesID = jellyfinSeriesIDInput.trim()
    if (!selectedSeriesID) {
      setErrorMessage('Bitte zuerst einen Jellyfin-Treffer auswaehlen.')
      return
    }

    const seasonNumber = parsePositiveInt(jellyfinSeasonInput)
    if (!seasonNumber) {
      setErrorMessage('Season Number muss groesser als 0 sein.')
      return
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      jellyfin_series_id: selectedSeriesID,
      season_number: seasonNumber,
      episode_status: jellyfinEpisodeStatus,
    }

    try {
      setIsLoadingJellyfinPreview(true)
      const response = await previewAdminAnimeFromJellyfin(contextAnime.id, payload, authToken)
      setJellyfinPreviewResult(response.data)
      setSuccessMessage(
        `Preview geladen: ${response.data.jellyfin_series_name} | Treffer ${response.data.matched_episodes}/${response.data.scanned_episodes} | Pfad-gefiltert ${response.data.path_filtered_episodes}`,
      )
    } catch (error) {
      setErrorMessage(formatError(error, 'Jellyfin-Preview fehlgeschlagen.'))
    } finally {
      setIsLoadingJellyfinPreview(false)
    }
  }

  async function handleJellyfinSync() {
    clearMessages()

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (!contextAnime) {
      setErrorMessage('Bitte zuerst einen Anime-Kontext laden.')
      return
    }

    const seasonNumber = parsePositiveInt(jellyfinSeasonInput)
    if (!seasonNumber) {
      setErrorMessage('Season Number muss groesser als 0 sein.')
      return
    }
    const payload: AdminAnimeJellyfinSyncRequest = {
      jellyfin_series_id: normalizeOptionalString(jellyfinSeriesIDInput),
      season_number: seasonNumber,
      episode_status: jellyfinEpisodeStatus,
      cleanup_provider_versions: jellyfinCleanupVersions,
      allow_mismatch: jellyfinAllowMismatch,
    }

    const selectedSeriesID = jellyfinSeriesIDInput.trim()
    if (
      selectedSeriesID &&
      (!jellyfinPreviewResult ||
        jellyfinPreviewResult.anime_id !== contextAnime.id ||
        jellyfinPreviewResult.jellyfin_series_id !== selectedSeriesID ||
        jellyfinPreviewResult.season_number !== seasonNumber)
    ) {
      setErrorMessage('Bitte zuerst eine aktuelle Jellyfin-Preview fuer diese Auswahl laden.')
      return
    }

    try {
      setIsSyncingJellyfin(true)
      const response = await syncAdminAnimeFromJellyfin(contextAnime.id, payload, authToken)

      await loadContextAnimeByID(contextAnime.id)
      const result = response.data
      const deletedInfo = result.deleted_versions ? ` | Geloescht -${result.deleted_versions}` : ''
      setSuccessMessage(
        `Jellyfin Sync OK: ${result.jellyfin_series_name} | Episoden +${result.imported_episodes}/~${result.updated_episodes} | Versionen +${result.imported_versions}/~${result.updated_versions}${deletedInfo}`,
      )
      await loadAnimeList(animeListPage, animeListLetter, animeListQuery, animeListHasCover)
    } catch (error) {
      setErrorMessage(formatError(error, 'Jellyfin Sync fehlgeschlagen.'))
    } finally {
      setIsSyncingJellyfin(false)
    }
  }

  async function handleAnimeRowJellyfinSync(anime: AnimeListItem) {
    clearMessages()

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const seasonNumber = parsePositiveInt(jellyfinSeasonInput)
    if (!seasonNumber) {
      setErrorMessage('Season Number muss groesser als 0 sein.')
      return
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      jellyfin_series_id:
        contextAnime?.id === anime.id ? normalizeOptionalString(jellyfinSeriesIDInput) : undefined,
      season_number: seasonNumber,
      episode_status: jellyfinEpisodeStatus,
    }

    try {
      setSyncingAnimeIDs((current) => ({ ...current, [anime.id]: true }))
      const response = await syncAdminAnimeFromJellyfin(anime.id, payload, authToken)
      const result = response.data

      if (contextAnime?.id === anime.id) {
        await loadContextAnimeByID(anime.id)
      }
      await loadAnimeList(animeListPage, animeListLetter, animeListQuery, animeListHasCover)

      setSuccessMessage(
        `Jellyfin Sync OK fuer #${anime.id} ${anime.title}: Episoden +${result.imported_episodes}/~${result.updated_episodes} | Versionen +${result.imported_versions}/~${result.updated_versions}`,
      )
    } catch (error) {
      setErrorMessage(formatError(error, `Jellyfin Sync fuer #${anime.id} fehlgeschlagen.`))
    } finally {
      setSyncingAnimeIDs((current) => {
        if (!current[anime.id]) return current
        const next = { ...current }
        delete next[anime.id]
        return next
      })
    }
  }

  async function handleGlobalJellyfinSync() {
    clearMessages()

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (animeListTotal <= 0) {
      setErrorMessage('Keine Anime-Treffer zum Synchronisieren vorhanden.')
      return
    }

    const seasonNumber = parsePositiveInt(jellyfinSeasonInput)
    if (!seasonNumber) {
      setErrorMessage('Season Number muss groesser als 0 sein.')
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Alle Treffer synchronisieren? (${animeListTotal} Anime, Seiten: ${animeListTotalPages})\nDas kann je nach Umfang laenger dauern.`,
      )
      if (!confirmed) return
    }

    const payload: AdminAnimeJellyfinSyncRequest = {
      season_number: seasonNumber,
      episode_status: jellyfinEpisodeStatus,
    }

    const pageSnapshot = animeListPage
    const letterSnapshot = animeListLetter
    const querySnapshot = animeListQuery
    const hasCoverSnapshot = animeListHasCover
    const totalPagesSnapshot = animeListTotalPages
    const totalSnapshot = animeListTotal
    const hasCoverParam = hasCoverSnapshot === 'all' ? undefined : hasCoverSnapshot === 'present'

    let done = 0
    let success = 0
    let failed = 0
    const failedIDs: number[] = []
    const contextAnimeID = contextAnime?.id ?? null
    let contextTouched = false

    try {
      setIsBulkSyncingJellyfin(true)
      setBulkJellyfinProgress({ done: 0, total: totalSnapshot, success: 0, failed: 0 })

      for (let page = 1; page <= totalPagesSnapshot; page += 1) {
        const pageItems =
          page === pageSnapshot
            ? animeListItems
            : (
                await getAnimeList({
                  page,
                  per_page: ANIME_BROWSER_PER_PAGE,
                  letter: letterSnapshot || undefined,
                  q: querySnapshot || undefined,
                  has_cover: hasCoverParam,
                  include_disabled: true,
                })
              ).data

        for (const anime of pageItems) {
          try {
            await syncAdminAnimeFromJellyfin(anime.id, payload, authToken)
            success += 1
            if (contextAnimeID && anime.id === contextAnimeID) contextTouched = true
          } catch {
            failed += 1
            if (failedIDs.length < 8) {
              failedIDs.push(anime.id)
            }
          } finally {
            done += 1
            setBulkJellyfinProgress({ done, total: totalSnapshot, success, failed })
          }
        }
      }

      if (contextTouched && contextAnimeID) {
        await loadContextAnimeByID(contextAnimeID)
      }
      await loadAnimeList(pageSnapshot, letterSnapshot, querySnapshot, hasCoverSnapshot)

      if (failed === 0) {
        setSuccessMessage(`Jellyfin Global Sync beendet: ${success}/${done} Anime erfolgreich synchronisiert.`)
      } else {
        setErrorMessage(
          `Jellyfin Global Sync beendet: ${success}/${done} ok, ${failed} fehlgeschlagen. Beispiel-IDs: ${failedIDs
            .map((id) => `#${id}`)
            .join(', ')}`,
        )
      }
    } catch (error) {
      setErrorMessage(formatError(error, 'Jellyfin Global Sync fehlgeschlagen.'))
    } finally {
      setIsBulkSyncingJellyfin(false)
    }
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLastRequest(null)
    setLastResponse(null)

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const animeID = parsePositiveInt(updateAnimeID) ?? contextAnime?.id ?? null
    if (!animeID) {
      setErrorMessage('Anime-ID ist ungueltig.')
      return
    }

    const payload: AdminAnimePatchRequest = {}
    const title = normalizeOptionalString(updateTitle)
    if (title) {
      payload.title = title
    }

    if (updateType) {
      payload.type = updateType as AnimeType
    }
    if (updateContentType) {
      payload.content_type = updateContentType as ContentType
    }
    if (updateStatus) {
      payload.status = updateStatus as AnimeStatus
    }

    if (clearUpdateYear) {
      payload.year = null
    } else if (updateYear.trim()) {
      const year = parsePositiveInt(updateYear)
      if (!year) {
        setErrorMessage('year muss groesser als 0 sein')
        return
      }
      payload.year = year
    }

    if (clearUpdateMaxEpisodes) {
      payload.max_episodes = null
    } else if (updateMaxEpisodes.trim()) {
      const maxEpisodes = parsePositiveInt(updateMaxEpisodes)
      if (!maxEpisodes) {
        setErrorMessage('max_episodes muss groesser als 0 sein')
        return
      }
      payload.max_episodes = maxEpisodes
    }

    const titleDE = normalizeOptionalString(updateTitleDE)
    const titleEN = normalizeOptionalString(updateTitleEN)
    const genre = normalizeOptionalString(updateGenreValue)
    const description = normalizeOptionalString(updateDescription)
    const coverImage = normalizeOptionalString(updateCoverImage)

    if (clearUpdateTitleDE) payload.title_de = null
    else if (titleDE) payload.title_de = titleDE

    if (clearUpdateTitleEN) payload.title_en = null
    else if (titleEN) payload.title_en = titleEN

    if (clearUpdateGenre) payload.genre = null
    else if (genre) payload.genre = genre

    if (clearUpdateDescription) payload.description = null
    else if (description) payload.description = description

    if (clearUpdateCoverImage) payload.cover_image = null
    else if (coverImage) payload.cover_image = coverImage

    if (Object.keys(payload).length === 0) {
      setErrorMessage('Mindestens ein Feld fuer das Update ausfuellen.')
      return
    }

    try {
      setIsSubmittingUpdate(true)
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await updateAdminAnime(animeID, payload)
      setSuccessMessage(`Anime #${response.data.id} wurde aktualisiert.`)
      setLastResponse(JSON.stringify(response, null, 2))
      await loadContextAnimeByID(response.data.id)
    } catch (error) {
      console.error('admin/anime: update failed', error)
      setErrorMessage(formatError(error, 'Anime konnte nicht aktualisiert werden.'))
    } finally {
      setIsSubmittingUpdate(false)
    }
  }

  function jumpToEpisodes() {
    episodesAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => {
      episodeFilterInputRef.current?.focus()
    }, 150)

    if (!contextAnime) return
    if (selectedEpisodeID) return
    if (contextAnime.episodes.length === 0) return
    handleEpisodeSelect(contextAnime.episodes[0])
  }

  async function handleEpisodeCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLastRequest(null)
    setLastResponse(null)

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (!contextAnime) {
      setErrorMessage('Bitte zuerst einen Anime-Kontext laden.')
      return
    }

    const episodeNumber = createEpisodeNumber.trim()
    if (!episodeNumber) {
      setErrorMessage('episode_number ist erforderlich')
      return
    }

    try {
      setIsSubmittingEpisodeCreate(true)
      const payload = {
        anime_id: contextAnime.id,
        episode_number: episodeNumber,
        status: createEpisodeStatus,
        title: normalizeOptionalString(createEpisodeTitle),
      }
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await createAdminEpisode(payload)
      setSuccessMessage(`Episode #${response.data.id} wurde fuer Anime #${contextAnime.id} erstellt.`)
      setLastResponse(JSON.stringify(response, null, 2))
      setCreateEpisodeNumber('')
      setCreateEpisodeTitle('')
      setCreateEpisodeStatus('private')
      setUpdateEpisodeID(String(response.data.id))
      await loadContextAnimeByID(contextAnime.id)
    } catch (error) {
      console.error('admin/anime: episode create failed', error)
      setErrorMessage(formatError(error, 'Episode konnte nicht erstellt werden.'))
    } finally {
      setIsSubmittingEpisodeCreate(false)
    }
  }

  function resetEpisodeEditorSelection() {
    setSelectedEpisodeID(null)
    setUpdateEpisodeID('')
    setUpdateEpisodeNumber('')
    setUpdateEpisodeTitle('')
    setUpdateEpisodeStatus('private')
    setUpdateEpisodeStreamLink('')
    setClearUpdateEpisodeTitle(false)
    setClearUpdateEpisodeStreamLink(false)
    cancelInlineEpisodeEdit()
  }

  function handleEpisodeSelect(episode: EpisodeListItem) {
    setSelectedEpisodeID(episode.id)
    setUpdateEpisodeID(String(episode.id))
    setUpdateEpisodeNumber(episode.episode_number)
    setUpdateEpisodeTitle(episode.title ?? '')
    setUpdateEpisodeStatus(episode.status)
    setUpdateEpisodeStreamLink((episode.stream_links && episode.stream_links[0]) || '')
    setClearUpdateEpisodeTitle(false)
    setClearUpdateEpisodeStreamLink(false)
    setSuccessMessage(`Episode #${episode.id} zum Bearbeiten geladen.`)

    // On small screens we still scroll to the edit form.
    setTimeout(() => {
      if (typeof window === 'undefined') return
      if (window.matchMedia && window.matchMedia('(max-width: 979px)').matches) {
        episodeEditAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 0)
  }

  function toggleEpisodeSelected(episodeID: number) {
    setSelectedEpisodeIDs((current) => {
      if (current[episodeID]) {
        const next = { ...current }
        delete next[episodeID]
        return next
      }
      return { ...current, [episodeID]: true }
    })
  }

  function toggleSelectAllVisibleEpisodes() {
    setSelectedEpisodeIDs((current) => {
      const next = { ...current }
      const visibleIDs = visibleEpisodes.map((episode) => episode.id)
      if (visibleIDs.length === 0) return next

      const currentlyAllVisibleSelected = visibleIDs.every((id) => next[id])
      if (currentlyAllVisibleSelected) {
        for (const id of visibleIDs) delete next[id]
      } else {
        for (const id of visibleIDs) next[id] = true
      }
      return next
    })
  }

  function clearEpisodeSelection() {
    setSelectedEpisodeIDs({})
  }

  function beginInlineEpisodeEdit(episode: EpisodeListItem) {
    setInlineEditEpisodeID(episode.id)
    setInlineEditEpisodeNumber(episode.episode_number)
    setInlineEditEpisodeTitle(episode.title ?? '')
    setInlineEditEpisodeStatus(episode.status)
    setInlineEditClearTitle(false)
  }

  function cancelInlineEpisodeEdit() {
    setInlineEditEpisodeID(null)
    setInlineEditEpisodeNumber('')
    setInlineEditEpisodeTitle('')
    setInlineEditEpisodeStatus('private')
    setInlineEditClearTitle(false)
  }

  async function saveInlineEpisodeEdit() {
    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!inlineEditEpisodeID) {
      setErrorMessage('Keine Episode zum Bearbeiten ausgewaehlt.')
      return
    }

    const payload: { episode_number?: string; title?: string | null; status?: EpisodeStatus } = {}
    const episodeNumber = normalizeOptionalString(inlineEditEpisodeNumber)
    const episodeTitle = normalizeOptionalString(inlineEditEpisodeTitle)

    if (episodeNumber) payload.episode_number = episodeNumber
    if (inlineEditClearTitle) payload.title = null
    else if (episodeTitle) payload.title = episodeTitle
    payload.status = inlineEditEpisodeStatus

    if (!payload.episode_number && payload.title === undefined && !payload.status) {
      setErrorMessage('Mindestens ein Feld fuer das Episoden-Update ausfuellen.')
      return
    }

    clearMessages()
    setLastRequest(JSON.stringify(payload, null, 2))
    try {
      setIsSubmittingEpisodeUpdate(true)
      const response = await updateAdminEpisode(inlineEditEpisodeID, payload)
      setSuccessMessage(`Episode #${response.data.id} wurde aktualisiert.`)
      setLastResponse(JSON.stringify(response, null, 2))
      if (contextAnime) {
        await loadContextAnimeByID(contextAnime.id)
      }
      cancelInlineEpisodeEdit()
    } catch (error) {
      console.error('admin/anime: inline episode update failed', error)
      setErrorMessage(formatError(error, 'Episode konnte nicht aktualisiert werden.'))
    } finally {
      setIsSubmittingEpisodeUpdate(false)
    }
  }

  async function handleRemoveEpisodeFromAnime(episode: EpisodeListItem) {
    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!contextAnime) {
      setErrorMessage('Bitte zuerst einen Anime-Kontext laden.')
      return
    }
    if (isApplyingBulk || isSubmittingEpisodeUpdate) {
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Episode ${episode.episode_number} aus Anime #${contextAnime.id} entfernen?\nDas entfernt nur lokale Zuordnungen (DB), nicht die Datei in Jellyfin/Emby.`,
      )
      if (!confirmed) return
    }

    clearMessages()
    setLastRequest(JSON.stringify({ episode_id: episode.id, action: 'remove_from_anime' }, null, 2))
    try {
      setRemovingEpisodeIDs((current) => ({ ...current, [episode.id]: true }))
      const response = await deleteAdminEpisode(episode.id)
      setLastResponse(JSON.stringify(response, null, 2))

      setSelectedEpisodeIDs((current) => {
        if (!current[episode.id]) return current
        const next = { ...current }
        delete next[episode.id]
        return next
      })

      if (selectedEpisodeID === episode.id || parsePositiveInt(updateEpisodeID) === episode.id) {
        resetEpisodeEditorSelection()
      }

      await loadContextAnimeByID(contextAnime.id)
      setSuccessMessage(
        `Episode ${episode.episode_number} wurde entfernt. Geloeschte Versions-Zuordnungen: ${response.data.deleted_episode_versions}.`,
      )
    } catch (error) {
      console.error('admin/anime: episode remove failed', error)
      setErrorMessage(formatError(error, 'Episode konnte nicht aus dem Anime entfernt werden.'))
    } finally {
      setRemovingEpisodeIDs((current) => {
        if (!current[episode.id]) return current
        const next = { ...current }
        delete next[episode.id]
        return next
      })
    }
  }

  async function removeSelectedEpisodesFromAnime() {
    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!contextAnime) {
      setErrorMessage('Bitte zuerst einen Anime-Kontext laden.')
      return
    }

    const ids = Object.keys(selectedEpisodeIDs)
      .map((raw) => Number.parseInt(raw, 10))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (ids.length === 0) {
      setErrorMessage('Bitte mindestens eine Episode markieren.')
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `${ids.length} markierte Episoden aus Anime #${contextAnime.id} entfernen?\nDas entfernt nur lokale Zuordnungen (DB), nicht die Datei in Jellyfin/Emby.`,
      )
      if (!confirmed) return
    }

    clearMessages()
    setIsApplyingBulk(true)
    setBulkProgress({ done: 0, total: ids.length })
    setLastRequest(JSON.stringify({ ids, action: 'remove_from_anime' }, null, 2))

    const failed: number[] = []
    let removed = 0
    let removedVersionLinks = 0
    try {
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        try {
          const response = await deleteAdminEpisode(id)
          removed += 1
          removedVersionLinks += response.data.deleted_episode_versions
        } catch {
          failed.push(id)
        } finally {
          setBulkProgress({ done: i + 1, total: ids.length })
        }
      }

      await loadContextAnimeByID(contextAnime.id)

      if (selectedEpisodeID && ids.includes(selectedEpisodeID) && !failed.includes(selectedEpisodeID)) {
        resetEpisodeEditorSelection()
      }

      setSelectedEpisodeIDs(() => {
        const next: Record<number, true> = {}
        for (const failedID of failed) next[failedID] = true
        return next
      })

      if (failed.length > 0) {
        setErrorMessage(
          `Bulk-Entfernen teilweise fehlgeschlagen (${failed.length}/${ids.length}). Erfolgreich entfernt: ${removed}, geloeschte Versions-Zuordnungen: ${removedVersionLinks}.`,
        )
        setLastResponse(JSON.stringify({ failed_episode_ids: failed, removed, removed_version_links: removedVersionLinks }, null, 2))
      } else {
        setSuccessMessage(
          `Bulk-Entfernen OK: ${removed} Episoden entfernt, geloeschte Versions-Zuordnungen: ${removedVersionLinks}.`,
        )
        setLastResponse(JSON.stringify({ removed, removed_version_links: removedVersionLinks }, null, 2))
      }
    } finally {
      setIsApplyingBulk(false)
      setBulkProgress(null)
    }
  }

  async function applyBulkEpisodeStatus(status: EpisodeStatus) {
    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const ids = Object.keys(selectedEpisodeIDs)
      .map((raw) => Number.parseInt(raw, 10))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (ids.length === 0) {
      setErrorMessage('Bitte mindestens eine Episode markieren.')
      return
    }

    clearMessages()
    setIsApplyingBulk(true)
    setBulkProgress({ done: 0, total: ids.length })
    setLastRequest(JSON.stringify({ ids, patch: { status } }, null, 2))

    const failed: number[] = []
    try {
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        try {
          await updateAdminEpisode(id, { status })
        } catch {
          failed.push(id)
        } finally {
          setBulkProgress({ done: i + 1, total: ids.length })
        }
      }

      if (contextAnime) {
        await loadContextAnimeByID(contextAnime.id)
      }

      if (failed.length > 0) {
        setErrorMessage(`Bulk-Update teilweise fehlgeschlagen (${failed.length}/${ids.length}).`)
        setLastResponse(JSON.stringify({ failed_episode_ids: failed }, null, 2))
      } else {
        setSuccessMessage(`Bulk-Update OK: ${ids.length} Episoden -> Status ${status}.`)
        setLastResponse(JSON.stringify({ updated: ids.length, status }, null, 2))
      }
    } finally {
      setIsApplyingBulk(false)
      setBulkProgress(null)
    }
  }

  async function uploadCoverFile(file: File): Promise<string> {
    const form = new FormData()
    form.set('file', file)

    const response = await fetch('/api/admin/upload-cover', {
      method: 'POST',
      body: form,
    })

    if (!response.ok) {
      let message = `Upload fehlgeschlagen (${response.status}).`
      try {
        const body = (await response.json()) as { error?: { message?: string } }
        if (body.error?.message) {
          message = body.error.message
        }
      } catch {
        // ignore
      }
      throw new Error(message)
    }

    const body = (await response.json()) as { data?: { file_name?: string } }
    const fileName = (body.data?.file_name || '').trim()
    if (!fileName) {
      throw new Error('Upload fehlgeschlagen: keine Datei erhalten.')
    }
    return fileName
  }

  async function uploadAndSetCover(file: File) {
    clearMessages()
    setIsUploadingCover(true)

    try {
      const fileName = await uploadCoverFile(file)
      setUpdateCoverImage(fileName)
      setClearUpdateCoverImage(false)

      const animeID = parsePositiveInt(updateAnimeID) ?? contextAnime?.id ?? null
      if (!hasAuthToken) {
        setSuccessMessage(`Cover hochgeladen: ${fileName} (Token fehlt, bitte auf /auth anmelden und dann patchen).`)
        return
      }
      if (!animeID) {
        setSuccessMessage(`Cover hochgeladen: ${fileName} (keine Anime-ID gesetzt, bitte Anime-Kontext laden oder ID eintragen).`)
        return
      }

      await updateAdminAnime(animeID, { cover_image: fileName })
      await loadContextAnimeByID(animeID)
      setSuccessMessage(`Cover hochgeladen und gesetzt: ${fileName}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cover Upload fehlgeschlagen.'
      setErrorMessage(message)
    } finally {
      setIsUploadingCover(false)
    }
  }

  async function handleEpisodeUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLastRequest(null)
    setLastResponse(null)

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const episodeID = parsePositiveInt(updateEpisodeID)
    if (!episodeID) {
      setErrorMessage('Episode-ID ist ungueltig.')
      return
    }

    const payload: AdminEpisodePatchRequest = {}
    const episodeNumber = normalizeOptionalString(updateEpisodeNumber)
    const episodeTitle = normalizeOptionalString(updateEpisodeTitle)
    const streamLink = normalizeOptionalString(updateEpisodeStreamLink)

    if (episodeNumber) {
      payload.episode_number = episodeNumber
    }
    if (clearUpdateEpisodeTitle) payload.title = null
    else if (episodeTitle) payload.title = episodeTitle
    if (clearUpdateEpisodeStreamLink) payload.stream_link = null
    else if (streamLink) payload.stream_link = streamLink
    if (updateEpisodeStatus) {
      payload.status = updateEpisodeStatus as EpisodeStatus
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage('Mindestens ein Feld fuer das Episoden-Update ausfuellen.')
      return
    }

    try {
      setIsSubmittingEpisodeUpdate(true)
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await updateAdminEpisode(episodeID, payload)
      setSuccessMessage(`Episode #${response.data.id} wurde aktualisiert.`)
      setLastResponse(JSON.stringify(response, null, 2))
      if (contextAnime) {
        await loadContextAnimeByID(contextAnime.id)
      }
    } catch (error) {
      console.error('admin/anime: episode update failed', error)
      setErrorMessage(formatError(error, 'Episode konnte nicht aktualisiert werden.'))
    } finally {
      setIsSubmittingEpisodeUpdate(false)
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/auth">Auth</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Admin Studio: Anime + Episoden</h1>
        <p className={styles.subtitle}>Ein zusammenhaengender Workflow: Anime laden, dann Episoden direkt dazu verwalten.</p>
        <p className={styles.tokenPreview}>Token: {hasAuthToken ? tokenPreview : 'nicht vorhanden'}</p>
      </header>

      {!hasAuthToken ? (
        <div className={styles.errorBox}>Kein Access-Token gefunden. Bitte zuerst auf /auth anmelden.</div>
      ) : null}

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
      {lastRequest ? (
        <pre className={styles.resultBox}>
          {'LAST REQUEST\n'}
          {lastRequest}
        </pre>
      ) : null}
      {lastResponse ? (
        <pre className={styles.resultBox}>
          {'LAST RESPONSE\n'}
          {lastResponse}
        </pre>
      ) : null}

      <div className={styles.splitLayout}>
        <section className={`${styles.panel} ${styles.browserColumn}`}>
          <h2>Anime Browser</h2>
          <p className={styles.hint}>Anime aus der Datenbank durchsuchen und direkt bearbeiten.</p>
            <div className={styles.form}>
              <div className={styles.gridTwo}>
                <div className={styles.field}>
                  <label htmlFor="anime-browser-letter">API Filter (A-Z)</label>
                  <select
                  id="anime-browser-letter"
                  value={animeListLetter}
                  onChange={(event) => {
                    setAnimeListLetter(event.target.value)
                    setAnimeListPage(1)
                  }}
                  disabled={isLoadingAnimeList}
                >
                  <option value="">Alle</option>
                  <option value="0">0-9</option>
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="anime-browser-query">Suche (Server)</label>
                  <div className={styles.inputRow}>
                  <input
                    id="anime-browser-query"
                    value={animeListQueryInput}
                    onChange={(event) => setAnimeListQueryInput(event.target.value)}
                    disabled={isLoadingAnimeList}
                    placeholder="z. B. attack"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        setAnimeListQuery(animeListQueryInput.trim())
                        setAnimeListPage(1)
                      }
                    }}
                  />
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isLoadingAnimeList || animeListQueryInput.length === 0}
                    onClick={() => setAnimeListQueryInput('')}
                    aria-label="Suche leeren"
                    title="Suche leeren"
                  >
                    X
                  </button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="anime-browser-has-cover">Cover</label>
                  <select
                    id="anime-browser-has-cover"
                    value={animeListHasCover}
                    onChange={(event) => {
                      setAnimeListHasCover(event.target.value as 'all' | 'missing' | 'present')
                      setAnimeListPage(1)
                    }}
                    disabled={isLoadingAnimeList}
                  >
                    <option value="all">Alle</option>
                    <option value="missing">Nur ohne Cover</option>
                    <option value="present">Nur mit Cover</option>
                  </select>
                </div>
              </div>

            <div className={styles.hint}>
              Gesamt: {animeListTotal} | Seite {animeListPage} / {animeListTotalPages}
              {animeListQuery ? ` | Suche: ${animeListQuery}` : ''}
              {animeListHasCover !== 'all' ? ` | Cover: ${animeListHasCover === 'missing' ? 'ohne' : 'mit'}` : ''}
              {' | '}
              Treffer: {visibleAnimeListItems.length}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isLoadingAnimeList}
                onClick={() => {
                  setAnimeListQuery(animeListQueryInput.trim())
                  setAnimeListPage(1)
                }}
              >
                Suchen
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isLoadingAnimeList || (!animeListQueryInput && !animeListQuery)}
                onClick={() => {
                  setAnimeListQueryInput('')
                  setAnimeListQuery('')
                  setAnimeListHasCover('all')
                  setAnimeListPage(1)
                }}
              >
                Reset
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isLoadingAnimeList || animeListPage <= 1}
                onClick={() => setAnimeListPage((current) => Math.max(1, current - 1))}
              >
                Vorherige Seite
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isLoadingAnimeList || animeListPage >= animeListTotalPages}
                onClick={() => setAnimeListPage((current) => Math.min(animeListTotalPages, current + 1))}
              >
                Naechste Seite
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isLoadingAnimeList}
                onClick={() => {
                  loadAnimeList(animeListPage, animeListLetter, animeListQuery, animeListHasCover).catch((error) => {
                    if (error instanceof ApiError) {
                      setErrorMessage(error.message)
                    } else {
                      setErrorMessage('Anime-Liste konnte nicht geladen werden.')
                    }
                  })
                }}
              >
                Neu laden
              </button>
              <button
                className={styles.button}
                type="button"
                disabled={!hasAuthToken || isLoadingAnimeList || isBulkSyncingJellyfin || isSyncingJellyfin || animeListTotal <= 0}
                onClick={handleGlobalJellyfinSync}
              >
                {isBulkSyncingJellyfin ? 'Globaler Sync laeuft...' : 'Alle Treffer syncen'}
              </button>
            </div>
            {bulkJellyfinProgress ? (
              <p className={styles.hint}>
                Jellyfin Global Sync: {bulkJellyfinProgress.done}/{bulkJellyfinProgress.total} | ok:{' '}
                {bulkJellyfinProgress.success} | fehler: {bulkJellyfinProgress.failed}
              </p>
            ) : null}

            {isLoadingAnimeList ? <p className={styles.hint}>Anime-Liste wird geladen...</p> : null}
            {!isLoadingAnimeList && visibleAnimeListItems.length === 0 ? (
              <p className={styles.hint}>Keine Anime gefunden.</p>
            ) : null}
            {!isLoadingAnimeList && visibleAnimeListItems.length > 0 ? (
              <div className={styles.episodeList}>
                {visibleAnimeListItems.map((anime) => (
                  <div
                    key={anime.id}
                    className={`${styles.animeRow} ${contextAnime?.id === anime.id ? styles.animeRowActive : ''}`}
                  >
                    {(() => {
                      const raw = (anime.cover_image || '').trim()
                      const hasCover = raw.length > 0
                      const coverFailed = Boolean(animeListCoverFailures[anime.id])
                      const coverMissing = !hasCover || coverFailed
                      return (
                    <img
                      className={styles.animeThumb}
                      src={coverMissing ? '/covers/placeholder.jpg' : resolveCoverUrl(raw)}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        setAnimeListCoverFailures((current) => {
                          if (current[anime.id]) return current
                          return { ...current, [anime.id]: true }
                        })
                        handleCoverImgError(event)
                      }}
                    />
                      )
                    })()}
                    <div className={styles.animeMeta}>
                      <div className={styles.animeTitleLine}>
                        <p className={styles.animeTitleText}>
                          #{anime.id} | {anime.title}
                        </p>
                        <div className={styles.badgeRow}>
                          {(() => {
                            const raw = (anime.cover_image || '').trim()
                            const hasCover = raw.length > 0
                            const coverFailed = Boolean(animeListCoverFailures[anime.id])
                            const coverMissing = !hasCover || coverFailed
                            return coverMissing ? <span className={styles.coverMissingBadge}>cover fehlt</span> : null
                          })()}
                          <span className={`${styles.statusBadge} ${styles[resolveAnimeStatusClass(anime.status)]}`}>
                            {anime.status}
                          </span>
                        </div>
                      </div>
                      <p className={styles.hint}>
                        Typ: {anime.type} | Jahr: {anime.year ?? '-'} | Max Episoden: {anime.max_episodes ?? '-'}
                      </p>
                      <div className={styles.actions}>
                        <button
                          className={styles.button}
                          type="button"
                          onClick={() => handleSelectAnimeFromBrowser(anime.id)}
                          disabled={isLoadingContextAnime}
                        >
                          Bearbeiten
                        </button>
                        <a
                          href={`/anime/${anime.id}`}
                          className={styles.buttonSecondary}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Oeffnen
                        </a>
                        <button
                          className={styles.buttonSecondary}
                          type="button"
                          onClick={() => handleAnimeRowJellyfinSync(anime)}
                          disabled={!hasAuthToken || isSyncingJellyfin || isBulkSyncingJellyfin || Boolean(syncingAnimeIDs[anime.id])}
                        >
                          {syncingAnimeIDs[anime.id] ? 'Sync...' : 'Sync'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

          <section className={`${styles.panel} ${styles.contextPanel} ${styles.contextColumn}`}>
            <h2>Arbeitskontext (Anime)</h2>
            <p className={styles.hint}>
              Lade einen Anime, damit Episoden im selben Kontext erstellt und bearbeitet werden koennen.
            </p>
            <form className={styles.form} onSubmit={handleContextSubmit}>
              <div className={styles.gridTwo}>
                <div className={styles.field}>
                  <label htmlFor="context-anime-id">Anime ID</label>
                  <input
                    id="context-anime-id"
                    value={contextAnimeIDInput}
                    onChange={(event) => setContextAnimeIDInput(event.target.value)}
                    disabled={isLoadingContextAnime}
                    placeholder="z. B. 13394"
                  />
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} type="submit" disabled={isLoadingContextAnime}>
                  {isLoadingContextAnime ? 'Lade...' : 'Anime-Kontext laden'}
                </button>
                <Link href="/admin/episodes" className={styles.buttonSecondary}>
                  Separater Episoden-Modus
                </Link>
                <Link href="/admin/anime/create" className={styles.buttonSecondary}>
                  Neuen Anime erstellen
                </Link>
              </div>
            </form>

            {contextAnime ? (
              <div className={styles.contextCard}>
                <div ref={contextCardAnchorRef} />
                <p className={styles.contextTitle}>
                  Kontext aktiv: #{contextAnime.id} {contextAnime.title}
                </p>
                <p className={styles.hint}>
                  Typ: {contextAnime.type} | Status: {contextAnime.status} | Episoden im Datensatz: {contextAnime.episodes.length}
                </p>
                <p className={styles.contextDescription}>
                  {contextAnime.description?.trim() || 'Keine Beschreibung hinterlegt.'}
                </p>
                <div className={styles.actions}>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    onClick={() => animePatchAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Zu Anime Patch
                  </button>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    onClick={jumpToEpisodes}
                  >
                    Zu Episoden
                  </button>
                  <Link href={`/admin/anime/${contextAnime.id}/versions`} className={styles.buttonSecondary}>
                    Zu Versionen
                  </Link>
                  <a
                    href={`/anime/${contextAnime.id}`}
                    className={styles.buttonSecondary}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Anime oeffnen
                  </a>
                </div>
                <details className={styles.details}>
                  <summary>Jellyfin Sync</summary>
                  <div className={styles.detailsInner}>
                    <p className={styles.hint}>
                      1) Suche Serien nach Name/Ordner, 2) Treffer waehlen, 3) JSON-Preview pruefen, 4) Sync anwenden.
                    </p>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <label htmlFor="jellyfin-search-query">Jellyfin Suche (Series)</label>
                        <div className={styles.inputRow}>
                          <input
                            id="jellyfin-search-query"
                            value={jellyfinSearchQuery}
                            onChange={(event) => setJellyfinSearchQuery(event.target.value)}
                            disabled={isSyncingJellyfin || isSearchingJellyfinSeries || isLoadingJellyfinPreview}
                            placeholder="z. B. Naruto"
                          />
                          <button
                            className={styles.buttonSecondary}
                            type="button"
                            onClick={handleJellyfinSeriesSearch}
                            disabled={isSyncingJellyfin || isSearchingJellyfinSeries || isLoadingJellyfinPreview}
                          >
                            {isSearchingJellyfinSeries ? 'Suche...' : 'Suchen'}
                          </button>
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="jellyfin-series-select">Trefferliste (Name + voller Pfad)</label>
                        <select
                          id="jellyfin-series-select"
                          value={jellyfinSeriesIDInput}
                          onChange={(event) => setJellyfinSeriesIDInput(event.target.value)}
                          disabled={isSyncingJellyfin || isSearchingJellyfinSeries || isLoadingJellyfinPreview}
                        >
                          <option value="">-- Treffer auswaehlen --</option>
                          {jellyfinSeriesOptions.map((item) => (
                            <option key={item.jellyfin_series_id} value={item.jellyfin_series_id}>
                              {item.name}
                              {item.production_year ? ` (${item.production_year})` : ''} -{' '}
                              {item.path?.trim() || '(ohne Pfad)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <label htmlFor="jellyfin-series-id">Jellyfin Series ID</label>
                        <input
                          id="jellyfin-series-id"
                          value={jellyfinSeriesIDInput}
                          onChange={(event) => setJellyfinSeriesIDInput(event.target.value)}
                          disabled={isSyncingJellyfin || isLoadingJellyfinPreview}
                          placeholder="z. B. 2dd78be87c3740a781eb479cca260361"
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="jellyfin-season-number">Season Number</label>
                        <input
                          id="jellyfin-season-number"
                          value={jellyfinSeasonInput}
                          onChange={(event) => setJellyfinSeasonInput(event.target.value)}
                          disabled={isSyncingJellyfin || isLoadingJellyfinPreview}
                          placeholder="1"
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="jellyfin-episode-status">Status fuer neue Episoden</label>
                        <select
                          id="jellyfin-episode-status"
                          value={jellyfinEpisodeStatus}
                          onChange={(event) => setJellyfinEpisodeStatus(event.target.value as EpisodeStatus)}
                          disabled={isSyncingJellyfin || isLoadingJellyfinPreview}
                        >
                          {EPISODE_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {formatEpisodeStatusLabel(value)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>Sync-Regel</label>
                        <p className={styles.hint}>
                          DB-first aktiv: vorhandene DB-Werte werden durch Jellyfin-Sync nicht ueberschrieben.
                          Manuelle Korrekturen (z. B. falsche Jellyfin-ID) bleiben im Version-Editor moeglich.
                        </p>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={jellyfinCleanupVersions}
                            onChange={(event) => setJellyfinCleanupVersions(event.target.checked)}
                            disabled={isSyncingJellyfin || isLoadingJellyfinPreview}
                          />
                          Bestehende Jellyfin-Versionen vorher entfernen
                        </label>
                        <p className={styles.hint}>
                          Aktivieren wenn ein falscher Anime synchronisiert wurde. Loescht alle Jellyfin-Versionen
                          (nicht Fansub-Versionen) vor dem Re-Import.
                        </p>
                        {jellyfinCleanupVersions && jellyfinPreviewResult && jellyfinPreviewResult.existing_jellyfin_versions > 0 && (
                          <p className={styles.hintWarning}>
                            Achtung: {jellyfinPreviewResult.existing_jellyfin_versions} bestehende Jellyfin-Versionen
                            werden unwiderruflich geloescht!
                          </p>
                        )}
                      </div>
                      <div className={styles.field}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={jellyfinAllowMismatch}
                            onChange={(event) => setJellyfinAllowMismatch(event.target.checked)}
                            disabled={isSyncingJellyfin || isLoadingJellyfinPreview}
                          />
                          Mismatch-Guard uebersteuern (nur wenn Preview geprueft)
                        </label>
                        <p className={styles.hint}>
                          Standard: Sync blockiert bei deutlich zu vielen eindeutigen Episoden im Vergleich zu
                          max_episodes.
                        </p>
                        {jellyfinAllowMismatch ? (
                          <p className={styles.hintWarning}>
                            Achtung: Guard ist deaktiviert. Falsche Zuordnung kann erneut TV/OVA mischen.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.buttonSecondary}
                        type="button"
                        onClick={handleJellyfinPreview}
                        disabled={isSyncingJellyfin || isLoadingJellyfinPreview || jellyfinSeriesIDInput.trim() === ''}
                      >
                        {isLoadingJellyfinPreview ? 'Preview laeuft...' : 'JSON Preview laden'}
                      </button>
                      <button
                        className={styles.button}
                        type="button"
                        onClick={handleJellyfinSync}
                        disabled={
                          isSyncingJellyfin ||
                          isBulkSyncingJellyfin ||
                          jellyfinSeriesIDInput.trim() === '' ||
                          !jellyfinPreviewResult
                        }
                      >
                        {isSyncingJellyfin ? 'Sync laeuft...' : 'Sync anwenden'}
                      </button>
                    </div>
                    {jellyfinPreviewResult ? (
                      <>
                        <p className={styles.hint}>
                          Preview: {jellyfinPreviewResult.jellyfin_series_name} | Pfad:{' '}
                          {jellyfinPreviewResult.jellyfin_series_path || '(unbekannt)'} | Episode-Treffer:{' '}
                          {jellyfinPreviewResult.matched_episodes}/{jellyfinPreviewResult.scanned_episodes} |
                          Pfad-gefiltert: {jellyfinPreviewResult.path_filtered_episodes} | Eindeutig akzeptiert:{' '}
                          {jellyfinPreviewResult.accepted_unique_episodes} | Bestehende Jellyfin-Versionen:{' '}
                          {jellyfinPreviewResult.existing_jellyfin_versions}
                        </p>
                        {jellyfinPreviewResult.mismatch_detected && jellyfinPreviewResult.mismatch_reason ? (
                          <p className={styles.hintWarning}>Guard-Hinweis: {jellyfinPreviewResult.mismatch_reason}</p>
                        ) : null}
                        <pre className={styles.resultBox}>
                          {JSON.stringify(jellyfinPreviewResult, null, 2)}
                        </pre>
                      </>
                    ) : null}
                  </div>
                </details>
                <div className={styles.coverRow}>
                  <img
                    className={styles.coverPreview}
                    src={resolveCoverUrl(contextAnime.cover_image)}
                    alt={`Cover ${contextAnime.title}`}
                    loading="lazy"
                    onError={handleCoverImgError}
                  />
                  <div className={styles.coverMeta}>
                    <p className={styles.hint}>cover_image: {contextAnime.cover_image || '(leer)'}</p>
                    <p className={styles.hint}>
                      Tipp: lokale Covers liegen unter <code>/covers/&lt;datei&gt;</code> (z. B. <code>5bc0ef2c.jpg</code>).
                    </p>
                  </div>
                </div>
                <div className={styles.contextFansubSection}>
                  <p className={styles.hint}>Fansub-Historie ({contextFansubGroups.length})</p>
                  {isLoadingContextFansubs ? <p className={styles.hint}>Fansub-Daten werden geladen...</p> : null}
                  {!isLoadingContextFansubs && contextFansubGroups.length === 0 ? (
                    <p className={styles.hint}>Keine Fansub-Verknuepfung fuer diesen Anime vorhanden.</p>
                  ) : null}
                  {!isLoadingContextFansubs && contextFansubGroups.length > 0 ? (
                    <div className={styles.contextFansubGrid}>
                      {contextFansubGroups.map((group) => (
                        <article key={group.id} className={styles.contextFansubCard}>
                          <p className={styles.contextFansubTitle}>
                            <a href={`/fansubs/${group.slug}`} target="_blank" rel="noreferrer">
                              {group.name}
                            </a>
                          </p>
                          <p className={styles.contextFansubStory}>{buildFansubStoryPreview(group)}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <div className={styles.editColumn}>
      <section className={`${styles.panel} ${styles.editPanel}`}>
        <div ref={animePatchAnchorRef} />
        <h2>Anime bearbeiten (Patch)</h2>
        <p className={styles.hint}>
          Nur ausgewaehlte Felder werden gesendet. Fuer nullable Felder kannst du explizit Wert loeschen (null) waehlen. Ohne ID
          wird die aktuelle Kontext-ID verwendet.
        </p>
        <form className={styles.form} onSubmit={handleUpdateSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="update-anime-id">Anime ID *</label>
              <input
                id="update-anime-id"
                value={updateAnimeID}
                onChange={(event) => setUpdateAnimeID(event.target.value)}
                disabled={isSubmittingUpdate}
                placeholder="z. B. 13394"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="update-title">Title</label>
              <input
                id="update-title"
                value={updateTitle}
                onChange={(event) => setUpdateTitle(event.target.value)}
                disabled={isSubmittingUpdate}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="update-type">Type</label>
              <select
                id="update-type"
                value={updateType}
                onChange={(event) => setUpdateType(event.target.value)}
                disabled={isSubmittingUpdate}
              >
                <option value="">-- unveraendert --</option>
                {ANIME_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-content-type">Content Type</label>
              <select
                id="update-content-type"
                value={updateContentType}
                onChange={(event) => setUpdateContentType(event.target.value)}
                disabled={isSubmittingUpdate}
              >
                <option value="">-- unveraendert --</option>
                {CONTENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-status">Status</label>
              <select
                id="update-status"
                value={updateStatus}
                onChange={(event) => setUpdateStatus(event.target.value)}
                disabled={isSubmittingUpdate}
              >
                <option value="">-- unveraendert --</option>
                {ANIME_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="update-year">Year</label>
              <input
                id="update-year"
                value={updateYear}
                onChange={(event) => setUpdateYear(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateYear}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateYear}
                  onChange={(event) => setClearUpdateYear(event.target.checked)}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-max-episodes">Max Episodes</label>
              <input
                id="update-max-episodes"
                value={updateMaxEpisodes}
                onChange={(event) => setUpdateMaxEpisodes(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateMaxEpisodes}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateMaxEpisodes}
                  onChange={(event) => setClearUpdateMaxEpisodes(event.target.checked)}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-title-de">Title DE</label>
              <input
                id="update-title-de"
                value={updateTitleDE}
                onChange={(event) => setUpdateTitleDE(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateTitleDE}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateTitleDE}
                  onChange={(event) => setClearUpdateTitleDE(event.target.checked)}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-title-en">Title EN</label>
              <input
                id="update-title-en"
                value={updateTitleEN}
                onChange={(event) => setUpdateTitleEN(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateTitleEN}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateTitleEN}
                  onChange={(event) => setClearUpdateTitleEN(event.target.checked)}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="update-genre">Genre</label>
              {updateGenreTokens.length > 0 ? (
                <div className={styles.chipRow} aria-label="Ausgewaehlte Genres">
                  {updateGenreTokens.map((token) => (
                    <button
                      key={token}
                      type="button"
                      className={`${styles.chip} ${styles.chipActive}`}
                      onClick={() => removeUpdateGenreToken(token)}
                      disabled={isSubmittingUpdate || clearUpdateGenre}
                      title="Klicken zum Entfernen"
                    >
                      {token} x
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.hint}>Noch keine Genres gesetzt.</p>
              )}

              <div className={styles.inputRow}>
                <input
                  id="update-genre"
                  value={updateGenreDraft}
                  onChange={(event) => setUpdateGenreDraft(event.target.value)}
                  disabled={isSubmittingUpdate || clearUpdateGenre}
                  placeholder="Genre hinzufuegen (Komma getrennt)"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addUpdateGenreTokens(updateGenreDraft)
                      setUpdateGenreDraft('')
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  disabled={isSubmittingUpdate || clearUpdateGenre || updateGenreDraft.trim().length === 0}
                  onClick={() => {
                    addUpdateGenreTokens(updateGenreDraft)
                    setUpdateGenreDraft('')
                  }}
                >
                  Hinzufuegen
                </button>
              </div>

              {isLoadingGenreTokens ? <p className={styles.hint}>Genre-Vorschlaege werden geladen...</p> : null}
              {genreTokensError ? <p className={styles.hint}>Hinweis: {genreTokensError}</p> : null}
              {!isLoadingGenreTokens && !clearUpdateGenre && updateGenreSuggestions.length > 0 ? (
                <>
                  <p className={styles.hint}>
                    Vorschlaege: {updateGenreSuggestions.length}/{updateGenreSuggestionsTotal} (geladen: {genreTokens.length})
                  </p>
                  <div className={styles.chipBox} aria-label="Genre Vorschlaege">
                    <div className={styles.chipRow}>
                      {updateGenreSuggestions.map((token) => (
                        <button
                          key={token.name}
                          type="button"
                          className={styles.chip}
                          onClick={() => addUpdateGenreTokens(token.name)}
                          disabled={isSubmittingUpdate || clearUpdateGenre}
                          title={`+ ${token.name} (x${token.count})`}
                        >
                          {token.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      disabled={isSubmittingUpdate || clearUpdateGenre || genreSuggestionLimit >= 1000}
                      onClick={() => setGenreSuggestionLimit((current) => Math.min(1000, current + 40))}
                    >
                      Mehr
                    </button>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      disabled={isSubmittingUpdate || clearUpdateGenre || genreSuggestionLimit <= 40}
                      onClick={() => setGenreSuggestionLimit(40)}
                    >
                      Weniger
                    </button>
                  </div>
                </>
              ) : null}
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateGenre}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setClearUpdateGenre(checked)
                    if (checked) {
                      setUpdateGenreTokens([])
                      setUpdateGenreDraft('')
                    }
                  }}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
              <p className={styles.hint}>Aktuell: {updateGenreValue || '(leer)'}</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-cover-image">Cover Image</label>
              <input
                id="update-cover-image"
                value={updateCoverImage}
                onChange={(event) => setUpdateCoverImage(event.target.value)}
                disabled={isSubmittingUpdate || isUploadingCover || clearUpdateCoverImage}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateCoverImage}
                  onChange={(event) => setClearUpdateCoverImage(event.target.checked)}
                  disabled={isSubmittingUpdate || isUploadingCover}
                />
                Wert loeschen (null)
              </label>
              <div className={styles.coverInline}>
                <img
                  className={styles.coverPreviewSmall}
                  src={resolveCoverUrl(clearUpdateCoverImage ? '' : updateCoverImage || contextAnime?.cover_image)}
                  alt="Cover Vorschau"
                  loading="lazy"
                  onError={handleCoverImgError}
                />
                <div className={styles.actions}>
                  <a
                    className={styles.buttonSecondary}
                    href={resolveCoverUrl(clearUpdateCoverImage ? '' : updateCoverImage || contextAnime?.cover_image)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cover oeffnen
                  </a>
                </div>
                <div className={styles.actions}>
                  <input
                    ref={coverFileInputRef}
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      try {
                        await uploadAndSetCover(file)
                      } finally {
                        event.target.value = ''
                      }
                    }}
                    disabled={isUploadingCover || isSubmittingUpdate}
                  />
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isUploadingCover || isSubmittingUpdate}
                    onClick={() => coverFileInputRef.current?.click()}
                  >
                    {isUploadingCover ? 'Upload...' : 'Cover hochladen (lokal)'}
                  </button>
                  {contextAnime?.cover_image ? (
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      disabled={isUploadingCover || isSubmittingUpdate}
                      onClick={() => {
                        setUpdateCoverImage(contextAnime.cover_image || '')
                        setClearUpdateCoverImage(false)
                      }}
                    >
                      Kontext-Cover einsetzen
                    </button>
                  ) : null}
                  {contextAnime ? (
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      disabled={isUploadingCover || isSubmittingUpdate}
                      onClick={async () => {
                        clearMessages()
                        if (!hasAuthToken) {
                          setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
                          return
                        }
                        setIsUploadingCover(true)
                        try {
                          await updateAdminAnime(contextAnime.id, { cover_image: null })
                          await loadContextAnimeByID(contextAnime.id)
                          setUpdateCoverImage('')
                          setClearUpdateCoverImage(false)
                          setSuccessMessage('Cover entfernt (cover_image = null).')
                        } catch (error) {
                          setErrorMessage(formatError(error, 'Cover konnte nicht entfernt werden.'))
                        } finally {
                          setIsUploadingCover(false)
                        }
                      }}
                    >
                      Cover entfernen
                    </button>
                  ) : null}
                </div>
                <p className={styles.hint}>
                  Hinweis: Upload ist fuer lokale Entwicklung gedacht und speichert nach <code>frontend/public/covers</code>.
                </p>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-description">Description</label>
              <textarea
                id="update-description"
                value={updateDescription}
                onChange={(event) => setUpdateDescription(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateDescription}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateDescription}
                  onChange={(event) => setClearUpdateDescription(event.target.checked)}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.buttonSecondary} type="submit" disabled={isSubmittingUpdate}>
              {isSubmittingUpdate ? 'Speichern...' : 'Anime aktualisieren'}
            </button>
            {contextAnime ? (
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isSubmittingUpdate}
                onClick={() => setUpdateAnimeID(String(contextAnime.id))}
              >
                Kontext-ID #{contextAnime.id} einsetzen
              </button>
            ) : null}
            {contextAnime ? (
              <button
                className={styles.buttonSecondary}
                type="button"
                disabled={isSubmittingUpdate}
                onClick={() => resetUpdateFormFromContext(contextAnime)}
              >
                Patch-Form aus Kontext neu fuellen
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className={`${styles.panel} ${styles.editPanel}`}>
        <div ref={episodesAnchorRef} />
        <h2>Episoden verwalten</h2>
        {!contextAnime ? (
          <p className={styles.hint}>Bitte zuerst oben einen Anime-Kontext laden.</p>
        ) : (
          <>
            <p className={styles.hint}>
              Anime #{contextAnime.id}: {contextAnime.title} | Episoden: {contextAnime.episodes.length}
            </p>
                <div className={styles.episodeManager}>
                  <div className={styles.episodeManagerLeft}>
                    <div className={styles.gridTwo}>
                      <div className={styles.field}>
                        <label htmlFor="episode-filter">Filter</label>
                        <input
                          id="episode-filter"
                          ref={episodeFilterInputRef}
                          value={episodeListQuery}
                          onChange={(event) => setEpisodeListQuery(event.target.value)}
                          placeholder="z. B. 01 oder titel"
                          disabled={isSubmittingEpisodeUpdate || isSubmittingEpisodeCreate}
                        />
                  </div>
                  <div className={styles.field}>
                    <label>Anzeige</label>
                    <p className={styles.hint}>
                      {visibleEpisodes.length} von {contextAnime.episodes.length} | Auswahl: {selectedVisibleCount}/
                      {visibleEpisodes.length} sichtbar, {selectedCount} gesamt
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label>Status</label>
                    <div className={styles.chipRow} role="group" aria-label="Status Filter">
                      <button
                        type="button"
                        className={`${styles.chip} ${episodeStatusFilter === 'all' ? styles.chipActive : ''}`}
                        onClick={() => setEpisodeStatusFilter('all')}
                        disabled={isSubmittingEpisodeUpdate || isSubmittingEpisodeCreate || isApplyingBulk}
                      >
                        alle ({episodeStatusCounts.all})
                      </button>
                      {EPISODE_STATUSES.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`${styles.chip} ${episodeStatusFilter === value ? styles.chipActive : ''}`}
                          onClick={() => setEpisodeStatusFilter(value)}
                          disabled={isSubmittingEpisodeUpdate || isSubmittingEpisodeCreate || isApplyingBulk}
                        >
                          {formatEpisodeStatusLabel(value)} ({episodeStatusCounts[value] ?? 0})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Dichte</label>
                    <div className={styles.chipRow} role="group" aria-label="Listen Dichte">
                      <button
                        type="button"
                        className={`${styles.chip} ${episodeDensity === 'compact' ? styles.chipActive : ''}`}
                        onClick={() => setEpisodeDensity('compact')}
                        disabled={isSubmittingEpisodeUpdate || isSubmittingEpisodeCreate || isApplyingBulk}
                      >
                        kompakt
                      </button>
                      <button
                        type="button"
                        className={`${styles.chip} ${episodeDensity === 'comfortable' ? styles.chipActive : ''}`}
                        onClick={() => setEpisodeDensity('comfortable')}
                        disabled={isSubmittingEpisodeUpdate || isSubmittingEpisodeCreate || isApplyingBulk}
                      >
                        komfortabel
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isApplyingBulk || isSubmittingEpisodeUpdate || visibleEpisodes.length === 0}
                    onClick={() => toggleSelectAllVisibleEpisodes()}
                  >
                    {allVisibleSelected ? 'Sichtbare abwaehlen' : 'Sichtbare auswaehlen'} ({visibleEpisodes.length})
                  </button>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isApplyingBulk || isSubmittingEpisodeUpdate || selectedCount === 0}
                    onClick={() => clearEpisodeSelection()}
                  >
                    Auswahl leeren ({selectedCount})
                  </button>
                  <select
                    value={bulkEpisodeStatus}
                    onChange={(event) => setBulkEpisodeStatus(event.target.value as EpisodeStatus)}
                    disabled={isApplyingBulk || isSubmittingEpisodeUpdate}
                  >
                    <option value="">Bulk: Status setzen...</option>
                    {EPISODE_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {formatEpisodeStatusLabel(value)}
                      </option>
                    ))}
                  </select>
                  <button
                    className={styles.button}
                    type="button"
                    disabled={
                      isApplyingBulk ||
                      isSubmittingEpisodeUpdate ||
                      bulkEpisodeStatus === '' ||
                      Object.keys(selectedEpisodeIDs).length === 0
                    }
                    onClick={() => applyBulkEpisodeStatus(bulkEpisodeStatus as EpisodeStatus)}
                  >
                    {isApplyingBulk && bulkProgress
                      ? `Bulk... ${bulkProgress.done}/${bulkProgress.total}`
                      : 'Bulk anwenden'}
                  </button>
                  <button
                    className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                    type="button"
                    disabled={isApplyingBulk || isSubmittingEpisodeUpdate || selectedCount === 0}
                    onClick={() => removeSelectedEpisodesFromAnime()}
                  >
                    {isApplyingBulk && bulkProgress
                      ? `Entfernen... ${bulkProgress.done}/${bulkProgress.total}`
                      : `Aus Anime entfernen (${selectedCount})`}
                  </button>
                </div>

                {contextAnime.episodes.length === 0 ? (
                  <p className={styles.hint}>Noch keine Episoden vorhanden.</p>
                ) : (
                  <div
                    className={`${styles.episodeTable} ${
                      episodeDensity === 'compact' ? styles.episodeTableCompact : styles.episodeTableComfortable
                    }`}
                  >
                    <div className={styles.episodeTableHeader} role="row">
                      <span className={styles.episodeHeaderCell} aria-hidden="true" />
                      <span className={styles.episodeHeaderCell}>Nr</span>
                      <span className={styles.episodeHeaderCell}>Titel</span>
                      <span className={styles.episodeHeaderCell}>Status</span>
                      <span className={styles.episodeHeaderCell}>ID</span>
                      <span className={styles.episodeHeaderCell}>Aktion</span>
                    </div>
                    {visibleEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        className={`${styles.episodeTableRow} ${
                          selectedEpisodeID === episode.id ? styles.episodeTableRowSelected : ''
                        } ${inlineEditEpisodeID === episode.id ? '' : styles.episodeTableRowClickable}`}
                        role={inlineEditEpisodeID === episode.id ? undefined : 'button'}
                        tabIndex={inlineEditEpisodeID === episode.id ? undefined : 0}
                        onKeyDown={
                          inlineEditEpisodeID === episode.id
                            ? undefined
                            : (event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return
                                event.preventDefault()
                                handleEpisodeSelect(episode)
                              }
                        }
                        onClick={
                          inlineEditEpisodeID === episode.id
                            ? undefined
                            : (event) => {
                                if (isApplyingBulk || isSubmittingEpisodeUpdate) return
                                const target = event.target as HTMLElement | null
                                if (!target) return
                                if (target.closest('input,button,a,select,label')) return
                                handleEpisodeSelect(episode)
                              }
                        }
                      >
                        <div className={styles.episodeSelect}>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedEpisodeIDs[episode.id])}
                            onChange={() => toggleEpisodeSelected(episode.id)}
                            disabled={isApplyingBulk || isSubmittingEpisodeUpdate || Boolean(removingEpisodeIDs[episode.id])}
                            aria-label={`Episode ${episode.episode_number} markieren`}
                          />
                        </div>

                        {inlineEditEpisodeID === episode.id ? (
                          <input
                            className={styles.episodeFieldInput}
                            value={inlineEditEpisodeNumber}
                            onChange={(event) => setInlineEditEpisodeNumber(event.target.value)}
                            disabled={isSubmittingEpisodeUpdate || isApplyingBulk}
                            aria-label="Episode Nummer"
                          />
                        ) : (
                          <button
                            className={styles.episodeMiniButton}
                            type="button"
                            disabled={isSubmittingEpisodeUpdate || Boolean(removingEpisodeIDs[episode.id])}
                            onClick={() => handleEpisodeSelect(episode)}
                            title="In Editor laden"
                          >
                            {episode.episode_number}
                          </button>
                        )}

                        {inlineEditEpisodeID === episode.id ? (
                          <input
                            className={styles.episodeFieldInput}
                            value={inlineEditEpisodeTitle}
                            onChange={(event) => setInlineEditEpisodeTitle(event.target.value)}
                            disabled={isSubmittingEpisodeUpdate || isApplyingBulk || inlineEditClearTitle}
                            placeholder="(ohne Titel)"
                            aria-label="Episode Titel"
                          />
                        ) : (
                          <span className={styles.episodeTitleCell} title={episode.title || '(ohne Titel)'}>
                            {episode.title || '(ohne Titel)'}
                          </span>
                        )}

                        {inlineEditEpisodeID === episode.id ? (
                          <select
                            className={styles.episodeFieldInput}
                            value={inlineEditEpisodeStatus}
                            onChange={(event) => setInlineEditEpisodeStatus(event.target.value as EpisodeStatus)}
                            disabled={isSubmittingEpisodeUpdate || isApplyingBulk}
                            aria-label="Episode Status"
                          >
                            {EPISODE_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`${styles.statusBadge} ${styles[resolveEpisodeStatusClass(episode.status)]}`}>
                            {formatEpisodeStatusLabel(episode.status)}
                          </span>
                        )}

                        <span className={styles.episodeIDCell}>#{episode.id}</span>

                        {inlineEditEpisodeID === episode.id ? (
                          <div className={styles.episodeActionsCell}>
                            <label className={styles.nullToggle}>
                              <input
                                type="checkbox"
                                checked={inlineEditClearTitle}
                                onChange={(event) => setInlineEditClearTitle(event.target.checked)}
                                disabled={isSubmittingEpisodeUpdate || isApplyingBulk}
                              />
                              Titel null
                            </label>
                            <button
                              className={styles.episodeMiniButton}
                              type="button"
                              disabled={isSubmittingEpisodeUpdate || isApplyingBulk}
                              onClick={() => saveInlineEpisodeEdit()}
                            >
                              Speichern
                            </button>
                            <button
                              className={styles.episodeMiniButton}
                              type="button"
                              disabled={isSubmittingEpisodeUpdate || isApplyingBulk}
                              onClick={() => cancelInlineEpisodeEdit()}
                            >
                              Abbrechen
                            </button>
                          </div>
                        ) : (
                          <div className={styles.episodeActionsCell}>
                            <button
                              className={styles.episodeMiniButton}
                              type="button"
                              disabled={
                                isSubmittingEpisodeUpdate ||
                                isApplyingBulk ||
                                Boolean(removingEpisodeIDs[episode.id])
                              }
                              onClick={() => beginInlineEpisodeEdit(episode)}
                            >
                              Edit
                            </button>
                            <button
                              className={`${styles.episodeMiniButton} ${styles.episodeDangerButton}`}
                              type="button"
                              disabled={
                                isSubmittingEpisodeUpdate ||
                                isApplyingBulk ||
                                Boolean(removingEpisodeIDs[episode.id])
                              }
                              onClick={() => handleRemoveEpisodeFromAnime(episode)}
                            >
                              Entfernen
                            </button>
                            <Link
                              href={`/episodes/${episode.id}`}
                              className={styles.episodeOpenLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Oeffnen
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.episodeManagerRight}>
                <details className={styles.details} open={contextAnime.episodes.length === 0}>
                  <summary>Neue Episode erstellen</summary>
                  <div className={styles.detailsInner}>
                    <p className={styles.hint}>Neue Episode wird an Anime #{contextAnime.id} angehaengt.</p>
                    <form className={styles.form} onSubmit={handleEpisodeCreateSubmit}>
                      <div className={styles.gridTwo}>
                        <div className={styles.field}>
                          <label htmlFor="create-episode-number">Episode Number *</label>
                          <input
                            id="create-episode-number"
                            value={createEpisodeNumber}
                            onChange={(event) => setCreateEpisodeNumber(event.target.value)}
                            disabled={isSubmittingEpisodeCreate}
                            placeholder="z. B. 01"
                          />
                          {nextEpisodeNumberSuggestion ? (
                            <div className={styles.actions}>
                              <button
                                className={styles.buttonSecondary}
                                type="button"
                                disabled={isSubmittingEpisodeCreate}
                                onClick={() => setCreateEpisodeNumber(nextEpisodeNumberSuggestion)}
                              >
                                Naechste Nummer: {nextEpisodeNumberSuggestion}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className={styles.field}>
                          <label htmlFor="create-episode-status">Status *</label>
                          <select
                            id="create-episode-status"
                            value={createEpisodeStatus}
                            onChange={(event) => setCreateEpisodeStatus(event.target.value as EpisodeStatus)}
                            disabled={isSubmittingEpisodeCreate}
                          >
                            {EPISODE_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={styles.field}>
                          <label htmlFor="create-episode-title">Title</label>
                          <input
                            id="create-episode-title"
                            value={createEpisodeTitle}
                            onChange={(event) => setCreateEpisodeTitle(event.target.value)}
                            disabled={isSubmittingEpisodeCreate}
                          />
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button className={styles.button} type="submit" disabled={isSubmittingEpisodeCreate}>
                          {isSubmittingEpisodeCreate ? 'Speichern...' : 'Episode erstellen'}
                        </button>
                      </div>
                    </form>
                  </div>
                </details>

                <div className={styles.sectionDivider} />
                <div ref={episodeEditAnchorRef} />
                <h3 className={styles.subheading}>Episode bearbeiten</h3>
                {!episodeOpenID ? (
                  <div className={styles.contextCard}>
                    <p className={styles.contextTitle}>Keine Episode ausgewaehlt</p>
                    <p className={styles.hint}>
                      Klicke links auf eine Zeile oder die Episoden-Nummer, um sie zum Bearbeiten zu laden.
                    </p>
                  </div>
                ) : (
                  <p className={styles.hint}>Ausgewaehlt: Episode #{episodeOpenID}</p>
                )}
                <form className={styles.form} onSubmit={handleEpisodeUpdateSubmit}>
                  <div className={styles.gridTwo}>
                    <div className={styles.field}>
                      <label htmlFor="update-episode-id">Episode ID *</label>
                      <input
                        id="update-episode-id"
                        value={updateEpisodeID}
                        onChange={(event) => setUpdateEpisodeID(event.target.value)}
                        disabled={isSubmittingEpisodeUpdate}
                        placeholder="aus Liste waehlen"
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="update-episode-number">Episode Number</label>
                      <input
                        id="update-episode-number"
                        value={updateEpisodeNumber}
                        onChange={(event) => setUpdateEpisodeNumber(event.target.value)}
                        disabled={isSubmittingEpisodeUpdate}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="update-episode-status">Status</label>
                      <select
                        id="update-episode-status"
                        value={updateEpisodeStatus}
                        onChange={(event) => setUpdateEpisodeStatus(event.target.value)}
                        disabled={isSubmittingEpisodeUpdate}
                      >
                        <option value="">-- unveraendert --</option>
                        {EPISODE_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {formatEpisodeStatusLabel(value)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="update-episode-title">Title</label>
                      <input
                        id="update-episode-title"
                        value={updateEpisodeTitle}
                        onChange={(event) => setUpdateEpisodeTitle(event.target.value)}
                        disabled={isSubmittingEpisodeUpdate || clearUpdateEpisodeTitle}
                      />
                      <label className={styles.nullToggle}>
                        <input
                          type="checkbox"
                          checked={clearUpdateEpisodeTitle}
                          onChange={(event) => setClearUpdateEpisodeTitle(event.target.checked)}
                          disabled={isSubmittingEpisodeUpdate}
                        />
                        Wert loeschen (null)
                      </label>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="update-episode-stream-link">Stream Link (Emby)</label>
                      <input
                        id="update-episode-stream-link"
                        value={updateEpisodeStreamLink}
                        onChange={(event) => setUpdateEpisodeStreamLink(event.target.value)}
                        disabled={isSubmittingEpisodeUpdate || clearUpdateEpisodeStreamLink}
                        placeholder="https://.../web/index.html#!/item?id=..."
                      />
                      <label className={styles.nullToggle}>
                        <input
                          type="checkbox"
                          checked={clearUpdateEpisodeStreamLink}
                          onChange={(event) => setClearUpdateEpisodeStreamLink(event.target.checked)}
                          disabled={isSubmittingEpisodeUpdate}
                        />
                        Wert loeschen (null)
                      </label>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.buttonSecondary}
                      type="submit"
                      disabled={isSubmittingEpisodeUpdate || !parsePositiveInt(updateEpisodeID)}
                    >
                      {isSubmittingEpisodeUpdate ? 'Speichern...' : 'Episode aktualisieren'}
                    </button>
                    {episodeOpenID ? (
                      <Link href={`/episodes/${episodeOpenID}`} className={styles.buttonSecondary} target="_blank" rel="noreferrer">
                        Episode oeffnen
                      </Link>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </section>

        </div>
      </div>
    </main>
  )
}
