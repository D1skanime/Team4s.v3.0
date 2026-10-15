import { Filter } from 'lucide-react'

import { Button, FormField, Input, Select } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'
import type { FansubGroupMediaCategory, FansubMediaReviewStatus, FansubMediaVisibility } from '@/lib/api'
import { FANSUB_MEDIA_CATEGORY_OPTIONS } from '@/lib/fansub-labels'

import styles from './GroupMediaReviewSection.module.css'

type CategoryFilter = 'all' | FansubGroupMediaCategory
type ReviewStatusFilter = 'all' | FansubMediaReviewStatus
type VisibilityFilter = 'all' | FansubMediaVisibility
type SortMode = 'sort_order' | 'created_desc' | 'created_asc'

const REVIEW_STATUS_OPTIONS: Array<{ value: FansubMediaReviewStatus; label: string }> = [
  { value: 'in_pruefung', label: 'In Prüfung' },
  { value: 'freigegeben', label: 'Freigegeben' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
  { value: 'archiviert', label: 'Archiviert' },
  { value: 'entfernt', label: 'Entfernt' },
]

const VISIBILITY_OPTIONS: Array<{ value: FansubMediaVisibility; label: string }> = [
  { value: 'intern', label: 'Intern' },
  { value: 'oeffentlich', label: 'Öffentlich' },
]

interface GroupMediaReviewFilterBarProps {
  filteredMediaItemsCount: number
  totalMediaItemsCount: number
  visibleMediaItemsCount: number
  remainingMediaCount: number
  activeFilterCount: number
  resetFilters: () => void
  canReview: boolean
  isBulkSaving: boolean
  allFilteredSelected: boolean
  toggleAllFilteredSelection: () => void
  isFilterOpen: boolean
  setIsFilterOpen: (updater: (current: boolean) => boolean) => void
  categoryFilter: CategoryFilter
  setCategoryFilter: (value: CategoryFilter) => void
  statusFilter: ReviewStatusFilter
  setStatusFilter: (value: ReviewStatusFilter) => void
  visibilityFilter: VisibilityFilter
  setVisibilityFilter: (value: VisibilityFilter) => void
  sortMode: SortMode
  setSortMode: (value: SortMode) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
}

export function GroupMediaReviewFilterBar({
  filteredMediaItemsCount,
  totalMediaItemsCount,
  visibleMediaItemsCount,
  remainingMediaCount,
  activeFilterCount,
  resetFilters,
  canReview,
  isBulkSaving,
  allFilteredSelected,
  toggleAllFilteredSelection,
  isFilterOpen,
  setIsFilterOpen,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  visibilityFilter,
  setVisibilityFilter,
  sortMode,
  setSortMode,
  searchTerm,
  setSearchTerm,
}: GroupMediaReviewFilterBarProps) {
  return (
    <>
      <div className={styles.managementToolbar}>
        <div className={styles.managementSummary}>
          <h2>Medienübersicht</h2>
          <p className={styles.resultSummary}>
            <span className={styles.desktopSummary}>
              {filteredMediaItemsCount} von {totalMediaItemsCount} Medien sichtbar · {visibleMediaItemsCount} geladen, {remainingMediaCount} weitere per Klick
            </span>
            <span className={styles.mobileSummary}>
              {visibleMediaItemsCount} geladen · {remainingMediaCount} weitere
            </span>
          </p>
        </div>
        <div className={styles.managementActions}>
          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Filter zurücksetzen ({activeFilterCount})
            </Button>
          ) : null}
          {canReview ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={filteredMediaItemsCount === 0 || isBulkSaving}
              onClick={toggleAllFilteredSelection}
            >
              {allFilteredSelected ? 'Auswahl abbrechen' : 'Alle auswählen'}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            className={styles.filterToggleButton}
            leftIcon={<Filter size={16} />}
            onClick={() => setIsFilterOpen((current) => !current)}
            aria-expanded={isFilterOpen}
          >
            Filter
          </Button>
        </div>
      </div>

      <div className={classNames(styles.filterBar, isFilterOpen && styles.filterBarOpen)}>
        <FormField label="Kategorie">
          <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}>
            <option value="all">Alle Kategorien</option>
            {FANSUB_MEDIA_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Prüfstatus">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReviewStatusFilter)}>
            <option value="all">Alle Status</option>
            {REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Sichtbarkeit">
          <Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}>
            <option value="all">Alle Sichtbarkeiten</option>
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Sortierung">
          <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="sort_order">Gespeicherte Reihenfolge</option>
            <option value="created_desc">Neueste zuerst</option>
            <option value="created_asc">Älteste zuerst</option>
          </Select>
        </FormField>

        <FormField label="Suche">
          <Input
            value={searchTerm}
            placeholder="Titel oder Beschreibung"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </FormField>
      </div>
    </>
  )
}
