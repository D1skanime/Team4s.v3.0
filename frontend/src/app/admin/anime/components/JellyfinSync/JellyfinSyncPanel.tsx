import { useEffect } from 'react'

import { AdminAnimeJellyfinPreviewResult, AdminJellyfinSeriesSearchItem } from '@/types/admin'
import { AnimeDetail, EpisodeStatus } from '@/types/anime'

import { JellyfinSearch } from './JellyfinSearch'
import { JellyfinSyncActions } from './JellyfinSyncActions'
import { JellyfinPreview } from './JellyfinPreview'
import styles from '../../../admin.module.css'

interface JellyfinSyncModel {
  searchQuery: string
  seriesOptions: AdminJellyfinSeriesSearchItem[]
  selectedSeriesID: string
  seasonInput: string
  episodeStatus: EpisodeStatus
  cleanupVersions: boolean
  allowMismatch: boolean
  previewResult: AdminAnimeJellyfinPreviewResult | null
  isSearching: boolean
  isLoadingPreview: boolean
  isSyncing: boolean
  isBulkSyncing: boolean
  setSearchQuery: (q: string) => void
  selectSeries: (id: string) => void
  setSeasonInput: (value: string) => void
  setEpisodeStatus: (value: EpisodeStatus) => void
  setCleanupVersions: (value: boolean) => void
  setAllowMismatch: (value: boolean) => void
  search: () => Promise<void>
  preview: (animeID: number) => Promise<void>
  sync: (animeID: number) => Promise<void>
  reset: () => void
}

interface JellyfinSyncPanelProps {
  anime: AnimeDetail
  model: JellyfinSyncModel
  onBeforeAction: () => void
  onSynced: () => Promise<void>
}

export function JellyfinSyncPanel({ anime, model, onBeforeAction, onSynced }: JellyfinSyncPanelProps) {
  useEffect(() => {
    model.setSearchQuery(anime.title || '')
    model.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.id])

  const handleSearch = () => {
    onBeforeAction()
    void model.search()
  }

  const handlePreview = () => {
    onBeforeAction()
    void model.preview(anime.id)
  }

  const handleSync = () => {
    onBeforeAction()
    void model
      .sync(anime.id)
      .then(() => onSynced())
      .catch(() => {
        // handled by hook callback
      })
  }

  return (
    <section className={`${styles.panel} ${styles.editPanel}`}>
      <h2>Jellyfin Sync</h2>
      <p className={styles.hint}>1) Suche Serien nach Name/Ordner, 2) Treffer waehlen, 3) JSON-Preview pruefen, 4) Sync anwenden.</p>
      <JellyfinSearch
        searchQuery={model.searchQuery}
        selectedSeriesID={model.selectedSeriesID}
        seriesOptions={model.seriesOptions}
        isSearching={model.isSearching}
        isSyncing={model.isSyncing}
        isLoadingPreview={model.isLoadingPreview}
        onSearchQueryChange={model.setSearchQuery}
        onSelectedSeriesChange={model.selectSeries}
        onSearch={handleSearch}
      />
      <JellyfinSyncActions
        selectedSeriesID={model.selectedSeriesID}
        seasonInput={model.seasonInput}
        episodeStatus={model.episodeStatus}
        cleanupVersions={model.cleanupVersions}
        allowMismatch={model.allowMismatch}
        previewResult={model.previewResult}
        isSyncing={model.isSyncing}
        isBulkSyncing={model.isBulkSyncing}
        isLoadingPreview={model.isLoadingPreview}
        onSeasonInputChange={model.setSeasonInput}
        onEpisodeStatusChange={model.setEpisodeStatus}
        onCleanupVersionsChange={model.setCleanupVersions}
        onAllowMismatchChange={model.setAllowMismatch}
        onPreview={handlePreview}
        onSync={handleSync}
      />
      <JellyfinPreview preview={model.previewResult} />
    </section>
  )
}
