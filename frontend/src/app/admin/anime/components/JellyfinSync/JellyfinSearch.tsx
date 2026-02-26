import { AdminJellyfinSeriesSearchItem } from '@/types/admin'

import styles from '../../../admin.module.css'

interface JellyfinSearchProps {
  searchQuery: string
  selectedSeriesID: string
  seriesOptions: AdminJellyfinSeriesSearchItem[]
  isSearching: boolean
  isSyncing: boolean
  isLoadingPreview: boolean
  onSearchQueryChange: (value: string) => void
  onSelectedSeriesChange: (value: string) => void
  onSearch: () => void
}

export function JellyfinSearch({
  searchQuery,
  selectedSeriesID,
  seriesOptions,
  isSearching,
  isSyncing,
  isLoadingPreview,
  onSearchQueryChange,
  onSelectedSeriesChange,
  onSearch,
}: JellyfinSearchProps) {
  return (
    <>
      <div className={styles.gridTwo}>
        <div className={styles.field}>
          <label htmlFor="jellyfin-search-query">Jellyfin Suche (Series)</label>
          <div className={styles.inputRow}>
            <input
              id="jellyfin-search-query"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              disabled={isSyncing || isSearching || isLoadingPreview}
              placeholder="z. B. Naruto"
            />
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={onSearch}
              disabled={isSyncing || isSearching || isLoadingPreview}
            >
              {isSearching ? 'Suche...' : 'Suchen'}
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="jellyfin-series-select">Trefferliste (Name + voller Pfad)</label>
          <select
            id="jellyfin-series-select"
            value={selectedSeriesID}
            onChange={(event) => onSelectedSeriesChange(event.target.value)}
            disabled={isSyncing || isSearching || isLoadingPreview}
          >
            <option value="">-- Treffer auswaehlen --</option>
            {seriesOptions.map((item) => (
              <option key={item.jellyfin_series_id} value={item.jellyfin_series_id}>
                {item.name}
                {item.production_year ? ` (${item.production_year})` : ''} - {item.path?.trim() || '(ohne Pfad)'}
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
            value={selectedSeriesID}
            onChange={(event) => onSelectedSeriesChange(event.target.value)}
            disabled={isSyncing || isLoadingPreview}
            placeholder="z. B. 2dd78be87c3740a781eb479cca260361"
          />
        </div>
      </div>
    </>
  )
}