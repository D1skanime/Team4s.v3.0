'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button, Drawer } from '@/components/ui'

import {
  SearchFilterChips,
  SearchFilterFields,
  activeFilters,
} from './SearchFilters'
import { useDebouncedSearch } from './useDebouncedSearch'
import type { SearchFilters as SearchFilterValues } from './useDebouncedSearch'
import styles from './SearchFilters.module.css'

/** Vollständig geleerte Filtermenge (für „Filter zurücksetzen" im Drawer-Footer). */
const EMPTY_FILTERS: SearchFilterValues = {
  year_from: undefined,
  year_to: undefined,
  genre: undefined,
  tag: undefined,
  format: undefined,
  status: undefined,
  fansub_group: undefined,
}

/**
 * Mobile Filterfläche: ein „Filter"-Button öffnet den `Drawer` mit denselben D-06-Controls
 * (geteilt mit dem Desktop über SearchFilterFields/Chips). Footer bietet „Filter zurücksetzen"
 * und „Filter anwenden". Fokus-Trap/Esc-Schließen liefert die Drawer-Primitive.
 *
 * Da alle Werte live in die URL geschrieben werden (Rolle „controls"), wirkt „Filter anwenden"
 * bereits sofort — der Button schließt den Drawer nur (bestätigende Geste).
 */
export function SearchFilterDrawer() {
  const [open, setOpen] = useState(false)
  const { filters, setFilters } = useDebouncedSearch({ role: 'controls' })

  const removeFilter = useCallback(
    (key: keyof SearchFilterValues) => setFilters({ [key]: undefined }),
    [setFilters],
  )
  const clearAll = useCallback(() => setFilters(EMPTY_FILTERS), [setFilters])
  const activeCount = activeFilters(filters).length

  return (
    <div className={styles.drawerTrigger}>
      <Button
        variant="secondary"
        leftIcon={<SlidersHorizontal size={16} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Filter{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filter"
        description="Suchergebnisse eingrenzen"
        variant="responsiveSheet"
        footer={
          <>
            <Button variant="ghost" onClick={clearAll}>
              Filter zurücksetzen
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Filter anwenden
            </Button>
          </>
        }
      >
        <SearchFilterFields filters={filters} onChange={setFilters} />
        <SearchFilterChips filters={filters} onRemove={removeFilter} />
      </Drawer>
    </div>
  )
}
