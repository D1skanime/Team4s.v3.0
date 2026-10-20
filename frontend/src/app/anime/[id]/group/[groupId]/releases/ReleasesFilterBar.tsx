'use client'

import { X } from 'lucide-react'

import styles from './page.module.css'

interface ReleasesFilterBarProps {
  filterOp: boolean
  filterEd: boolean
  filterKaraoke: boolean
  anyFilterActive: boolean
  searchTerm: string
  isSticky: boolean
  onToggleFilter: (filter: 'op' | 'ed' | 'karaoke') => void
  onToggleAll: () => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
}

export function ReleasesFilterBar({
  filterOp,
  filterEd,
  filterKaraoke,
  anyFilterActive,
  searchTerm,
  isSticky,
  onToggleFilter,
  onToggleAll,
  onSearchChange,
  onClearSearch,
}: ReleasesFilterBarProps) {
  return (
    <section id="filterBar" className={`${styles.filterBar} ${isSticky ? styles.filterBarSticky : ''}`}>
      <div className={styles.filterChips}>
        <button
          type="button"
          className={`${styles.chip} ${!anyFilterActive ? styles.chipActive : styles.chipInactive}`}
          onClick={onToggleAll}
          aria-pressed={!anyFilterActive}
        >
          Alle
        </button>
        <button
          type="button"
          className={`${styles.chip} ${filterOp ? styles.chipActive : styles.chipInactive}`}
          onClick={() => onToggleFilter('op')}
          aria-pressed={filterOp}
        >
          Mit OP
        </button>
        <button
          type="button"
          className={`${styles.chip} ${filterEd ? styles.chipActive : styles.chipInactive}`}
          onClick={() => onToggleFilter('ed')}
          aria-pressed={filterEd}
        >
          Mit ED
        </button>
        <button
          type="button"
          className={`${styles.chip} ${filterKaraoke ? styles.chipActive : styles.chipInactive}`}
          onClick={() => onToggleFilter('karaoke')}
          aria-pressed={filterKaraoke}
        >
          Mit Karaoke
        </button>
      </div>
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Suche..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Suche nach Releases"
        />
        {searchTerm && (
          <button type="button" className={styles.clearButton} onClick={onClearSearch} aria-label="Suche löschen">
            <X size={16} />
          </button>
        )}
      </div>
    </section>
  )
}
