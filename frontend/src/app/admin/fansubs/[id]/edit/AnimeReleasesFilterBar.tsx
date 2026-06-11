'use client'

import { Button } from '@/components/ui'

import styles from './FansubEdit.module.css'

export type CockpitFilter = 'all' | 'no-contributions' | 'no-note'

export type AnimeReleasesFilterBarProps = {
  activeFilter: CockpitFilter
  onFilterChange: (filter: CockpitFilter) => void
}

export function AnimeReleasesFilterBar({ activeFilter, onFilterChange }: AnimeReleasesFilterBarProps) {
  return (
    <div className={styles.chipRow}>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={activeFilter === 'all'}
        onClick={() => onFilterChange('all')}
        className={activeFilter === 'all' ? styles.filterChipActive : undefined}
      >
        Alle
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={activeFilter === 'no-contributions'}
        onClick={() => onFilterChange('no-contributions')}
        className={activeFilter === 'no-contributions' ? styles.filterChipActive : undefined}
      >
        Mitwirkende fehlen
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={activeFilter === 'no-note'}
        onClick={() => onFilterChange('no-note')}
        className={activeFilter === 'no-note' ? styles.filterChipActive : undefined}
      >
        Einblick fehlt
      </Button>
    </div>
  )
}

export default AnimeReleasesFilterBar
