import { AdminAnimeJellyfinPreviewResult, AdminAnimeJellyfinSyncResult, AdminJellyfinSeriesSearchItem, GenreToken } from '@/types/admin'
import { AnimeDetail, AnimeListItem, EpisodeListItem, EpisodeStatus } from '@/types/anime'
import { FansubGroup } from '@/types/fansub'

export type CoverFilter = 'all' | 'missing' | 'present'
export type ListDensity = 'compact' | 'comfortable'

export interface AnimeBrowserState {
  items: AnimeListItem[]
  page: number
  totalPages: number
  total: number
  query: string
  letter: string
  hasCover: CoverFilter
  isLoading: boolean
  coverFailures: Record<number, true>
}

export interface AnimeContextState {
  anime: AnimeDetail | null
  fansubs: FansubGroup[]
  isLoading: boolean
  isLoadingFansubs: boolean
}

export interface AnimePatchValues {
  title: string
  type: string
  contentType: string
  status: string
  year: string
  maxEpisodes: string
  titleDE: string
  titleEN: string
  genreTokens: string[]
  genreDraft: string
  description: string
  coverImage: string
  source: string
  folderName: string
}

export interface AnimePatchClearFlags {
  year: boolean
  maxEpisodes: boolean
  titleDE: boolean
  titleEN: boolean
  genre: boolean
  description: boolean
  coverImage: boolean
}

export interface AnimePatchState {
  values: AnimePatchValues
  clearFlags: AnimePatchClearFlags
  genreTokens: GenreToken[]
  genreSuggestions: GenreToken[]
  genreSuggestionsTotal: number
  isLoadingGenreTokens: boolean
  genreTokensError: string | null
  genreSuggestionLimit: number
  isSubmitting: boolean
  isUploadingCover: boolean
  isDirty: boolean
}

export interface JellyfinSyncState {
  searchQuery: string
  seriesOptions: AdminJellyfinSeriesSearchItem[]
  selectedSeriesID: string
  seasonInput: string
  episodeStatus: EpisodeStatus
  cleanupVersions: boolean
  allowMismatch: boolean
  previewResult: AdminAnimeJellyfinPreviewResult | null
  lastSyncResult: AdminAnimeJellyfinSyncResult | null
  isSearching: boolean
  isLoadingPreview: boolean
  isSyncing: boolean
  isBulkSyncing: boolean
  bulkProgress: { done: number; total: number; success: number; failed: number } | null
  syncingAnimeIDs: Record<number, true>
  searchFeedback: JellyfinSyncFeedback | null
  previewFeedback: JellyfinSyncFeedback | null
  syncFeedback: JellyfinSyncFeedback | null
}

export interface JellyfinSyncFeedback {
  tone: 'success' | 'error'
  message: string
  details?: string
}

export interface EpisodeEditFormValues {
  id: string
  number: string
  title: string
  status: string
  streamLink: string
}

export interface EpisodeCreateFormValues {
  number: string
  title: string
  status: EpisodeStatus
}

export interface EpisodeInlineEditValues {
  number: string
  title: string
  status: EpisodeStatus
  clearTitle: boolean
}

export interface EpisodeManagerState {
  episodes: EpisodeListItem[]
  visibleEpisodes: EpisodeListItem[]
  selectedEpisode: EpisodeListItem | null
  statusCounts: Record<string, number>
  selectedCount: number
  selectedVisibleCount: number
  allVisibleSelected: boolean
  query: string
  statusFilter: EpisodeStatus | 'all'
  density: ListDensity
  selectedID: number | null
  selectedIDs: Record<number, true>
  inlineEditID: number | null
  inlineEditValues: EpisodeInlineEditValues
  editFormValues: EpisodeEditFormValues
  editFormClearFlags: { title: boolean; streamLink: boolean }
  hasEditChanges: boolean
  createFormValues: EpisodeCreateFormValues
  isCreating: boolean
  isUpdating: boolean
  isApplyingBulk: boolean
  bulkProgress: { done: number; total: number } | null
  removingIDs: Record<number, true>
}
