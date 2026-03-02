import { describe, expect, it } from 'vitest'

import { AdminAnimeJellyfinPreviewResult } from '@/types/admin'

import { deriveJellyfinSyncPanelState } from './jellyfin-sync-panel-state'

function buildPreview(overrides: Partial<AdminAnimeJellyfinPreviewResult> = {}): AdminAnimeJellyfinPreviewResult {
  return {
    anime_id: 7,
    jellyfin_series_id: 'series-1',
    jellyfin_series_name: 'Naruto',
    season_number: 1,
    scanned_episodes: 12,
    matched_episodes: 12,
    path_filtered_episodes: 0,
    accepted_unique_episodes: 12,
    mismatch_detected: false,
    skipped_episodes: 0,
    existing_jellyfin_versions: 0,
    existing_episodes: 0,
    applied_episode_status: 'private',
    overwrite_episode_titles: false,
    overwrite_version_titles: false,
    episodes: [],
    ...overrides,
  }
}

describe('deriveJellyfinSyncPanelState', () => {
  it('opens the sync dialog path only for a fresh syncable preview', () => {
    const state = deriveJellyfinSyncPanelState({
      animeID: 7,
      selectedSeriesID: 'series-1',
      seasonInput: '1',
      previewResult: buildPreview(),
      isSyncing: false,
      isBulkSyncing: false,
      seriesOptionCount: 1,
      hasSearched: true,
      isSearching: false,
      searchFeedbackTone: 'success',
    })

    expect(state.activeStep).toBe(4)
    expect(state.hasFreshPreview).toBe(true)
    expect(state.canSync).toBe(true)
  })

  it('blocks sync when the preview is stale or contains no importable episodes', () => {
    const staleState = deriveJellyfinSyncPanelState({
      animeID: 7,
      selectedSeriesID: 'series-1',
      seasonInput: '2',
      previewResult: buildPreview(),
      isSyncing: false,
      isBulkSyncing: false,
      seriesOptionCount: 1,
      hasSearched: true,
      isSearching: false,
      searchFeedbackTone: 'success',
    })
    const emptyState = deriveJellyfinSyncPanelState({
      animeID: 7,
      selectedSeriesID: 'series-1',
      seasonInput: '1',
      previewResult: buildPreview({ accepted_unique_episodes: 0 }),
      isSyncing: false,
      isBulkSyncing: false,
      seriesOptionCount: 1,
      hasSearched: true,
      isSearching: false,
      searchFeedbackTone: 'success',
    })

    expect(staleState.hasFreshPreview).toBe(false)
    expect(staleState.canSync).toBe(false)
    expect(emptyState.hasFreshPreview).toBe(true)
    expect(emptyState.canSync).toBe(false)
  })

  it('shows the empty search state only after a completed non-error search', () => {
    const visibleState = deriveJellyfinSyncPanelState({
      animeID: 7,
      selectedSeriesID: '',
      seasonInput: '1',
      previewResult: null,
      isSyncing: false,
      isBulkSyncing: false,
      seriesOptionCount: 0,
      hasSearched: true,
      isSearching: false,
      searchFeedbackTone: 'success',
    })
    const hiddenState = deriveJellyfinSyncPanelState({
      animeID: 7,
      selectedSeriesID: '',
      seasonInput: '1',
      previewResult: null,
      isSyncing: false,
      isBulkSyncing: false,
      seriesOptionCount: 0,
      hasSearched: true,
      isSearching: false,
      searchFeedbackTone: 'error',
    })

    expect(visibleState.showSearchEmptyState).toBe(true)
    expect(hiddenState.showSearchEmptyState).toBe(false)
  })
})
