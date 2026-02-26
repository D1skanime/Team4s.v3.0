import { useState } from 'react'

import { AnimeListItem } from '@/types/anime'

import { CoverFilter } from '../../types/admin-anime'
import { AnimeBrowserFilters } from './AnimeBrowserFilters'
import { AnimeBrowserList } from './AnimeBrowserList'
import { AnimeBrowserPagination } from './AnimeBrowserPagination'
import styles from '../../../admin.module.css'

interface AnimeBrowserProps {
  items: AnimeListItem[]
  page: number
  totalPages: number
  total: number
  query: string
  letter: string
  hasCover: CoverFilter
  isLoading: boolean
  coverFailures: Record<number, true>
  activeAnimeID: number | null
  isLoadingContext: boolean
  hasAuthToken: boolean
  isSyncing: boolean
  isBulkSyncing: boolean
  syncingAnimeIDs: Record<number, true>
  bulkProgress: { done: number; total: number; success: number; failed: number } | null
  onSetPage: (page: number) => void
  onSetQuery: (query: string) => void
  onSetLetter: (value: string) => void
  onSetHasCover: (value: CoverFilter) => void
  onRefresh: () => Promise<void>
  onSelectAnime: (animeID: number) => void
  onSyncAnime: (anime: AnimeListItem) => void
  onSyncAll: () => void
  onMarkCoverFailure: (animeID: number) => void
  uiMode: 'navigation' | 'editing'
}

export function AnimeBrowser({
  items,
  page,
  totalPages,
  total,
  query,
  letter,
  hasCover,
  isLoading,
  coverFailures,
  activeAnimeID,
  isLoadingContext,
  hasAuthToken,
  isSyncing,
  isBulkSyncing,
  syncingAnimeIDs,
  bulkProgress,
  onSetPage,
  onSetQuery,
  onSetLetter,
  onSetHasCover,
  onRefresh,
  onSelectAnime,
  onSyncAnime,
  onSyncAll,
  onMarkCoverFailure,
  uiMode,
}: AnimeBrowserProps) {
  const [queryInput, setQueryInput] = useState(query)
  const hideNonEssential = uiMode === 'editing'

  return (
    <section className={`${styles.panel} ${styles.browserColumn}`}>
      <h2>Anime-Auswahl</h2>
      <p className={styles.hint}>Schritt 1: Anime suchen und Kontext laden.</p>
      <div className={styles.form}>
        <AnimeBrowserFilters
          queryInput={queryInput}
          letter={letter}
          hasCover={hasCover}
          isLoading={isLoading}
          onQueryInputChange={setQueryInput}
          onApplySearch={() => onSetQuery(queryInput)}
          onClearQueryInput={() => setQueryInput('')}
          onLetterChange={onSetLetter}
          onCoverChange={onSetHasCover}
        />

        <div className={styles.hint}>
          Gesamt: {total} | Seite {page} / {totalPages}
          {query ? ` | Suche: ${query}` : ''}
          {hasCover !== 'all' ? ` | Cover: ${hasCover === 'missing' ? 'ohne' : 'mit'}` : ''}
          {' | '}
          Treffer: {items.length}
        </div>

        <AnimeBrowserPagination
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          canReset={Boolean(queryInput || query)}
          hideNonEssential={hideNonEssential}
          onSearch={() => onSetQuery(queryInput)}
          onReset={() => {
            setQueryInput('')
            onSetQuery('')
            onSetHasCover('all')
          }}
          onPrev={() => onSetPage(page - 1)}
          onNext={() => onSetPage(page + 1)}
          onReload={() => {
            void onRefresh()
          }}
        />

        {!hideNonEssential ? (
          <div className={styles.actions}>
            <details className={styles.details}>
              <summary>Weitere Aktionen</summary>
              <div className={styles.detailsInner}>
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={!hasAuthToken || isLoading || isBulkSyncing || isSyncing || total <= 0}
                  onClick={onSyncAll}
                >
                  {isBulkSyncing ? 'Synchronisierung laeuft...' : 'Treffer synchronisieren'}
                </button>
              </div>
            </details>
          </div>
        ) : null}
        {bulkProgress ? (
          <p className={styles.hint}>
            Jellyfin Global Sync: {bulkProgress.done}/{bulkProgress.total} | ok: {bulkProgress.success} | fehler:{' '}
            {bulkProgress.failed}
          </p>
        ) : null}

        <AnimeBrowserList
          items={items}
          activeAnimeID={activeAnimeID}
          isLoading={isLoading}
          isLoadingContext={isLoadingContext}
          isSyncDisabled={!hasAuthToken || isSyncing || isBulkSyncing}
          syncingAnimeIDs={syncingAnimeIDs}
          coverFailures={coverFailures}
          onSelectAnime={onSelectAnime}
          onSyncAnime={onSyncAnime}
          onCoverError={onMarkCoverFailure}
          hideNonEssential={hideNonEssential}
        />
      </div>
    </section>
  )
}
