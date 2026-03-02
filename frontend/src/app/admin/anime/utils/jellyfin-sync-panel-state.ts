import { AdminAnimeJellyfinPreviewResult } from '@/types/admin'

interface JellyfinSyncPanelStateInput {
  animeID: number
  selectedSeriesID: string
  seasonInput: string
  previewResult: AdminAnimeJellyfinPreviewResult | null
  isSyncing: boolean
  isBulkSyncing: boolean
  seriesOptionCount: number
  hasSearched: boolean
  isSearching: boolean
  searchFeedbackTone: 'success' | 'error' | null
}

interface JellyfinSyncPanelState {
  activeStep: number
  hasFreshPreview: boolean
  hasSyncablePreview: boolean
  canSync: boolean
  showSearchEmptyState: boolean
}

export function deriveJellyfinSyncPanelState(input: JellyfinSyncPanelStateInput): JellyfinSyncPanelState {
  const selectedSeriesID = input.selectedSeriesID.trim()
  const seasonNumber = Number.parseInt(input.seasonInput, 10)
  const hasFreshPreview = Boolean(
    input.previewResult &&
      input.previewResult.anime_id === input.animeID &&
      input.previewResult.jellyfin_series_id === selectedSeriesID &&
      input.previewResult.season_number === seasonNumber,
  )
  const activeStep = hasFreshPreview ? 4 : selectedSeriesID ? 3 : input.seriesOptionCount > 0 ? 2 : 1
  const hasSyncablePreview = hasFreshPreview && (input.previewResult?.accepted_unique_episodes ?? 0) > 0

  return {
    activeStep,
    hasFreshPreview,
    hasSyncablePreview,
    canSync: hasSyncablePreview && selectedSeriesID.length > 0 && !input.isSyncing && !input.isBulkSyncing,
    showSearchEmptyState:
      input.hasSearched && input.seriesOptionCount === 0 && !input.isSearching && input.searchFeedbackTone !== 'error',
  }
}
