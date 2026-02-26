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
}: AnimeBrowserProps) {
  const [queryInput, setQueryInput] = useState(query)

  return (
    <section className={`${styles.panel} ${styles.browserColumn}`}>
      <h2>Anime Browser</h2>
      <p className={styles.hint}>Anime aus der Datenbank durchsuchen und direkt bearbeiten.</p>
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

        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            disabled={!hasAuthToken || isLoading || isBulkSyncing || isSyncing || total <= 0}
            onClick={onSyncAll}
          >
            {isBulkSyncing ? 'Globaler Sync laeuft...' : 'Alle Treffer syncen'}
          </button>
        </div>
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
        />
      </div>
    </section>
  )
}
