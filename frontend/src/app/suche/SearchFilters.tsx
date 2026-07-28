'use client'

import { X } from 'lucide-react'
import { useCallback, useId } from 'react'

import { Badge, Button, FormField, Input, Select, YearPicker } from '@/components/ui'

import { useDebouncedSearch } from './useDebouncedSearch'
import type { SearchFilters as SearchFilterValues } from './useDebouncedSearch'
import styles from './SearchFilters.module.css'

/** Frühestes wählbares Jahr im YearPicker (konsistent mit dem öffentlichen Katalog). */
const MIN_FILTER_YEAR = 1917

/** Anzeigenamen der Filter (auch für Chips + aria-label „Filter {name} entfernen"). */
const FILTER_LABELS: Record<keyof SearchFilterValues, string> = {
  year_from: 'Jahr von',
  year_to: 'Jahr bis',
  genre: 'Genre',
  tag: 'Tag',
  format: 'Typ/Format',
  status: 'Status',
  fansub_group: 'Fansubgruppe',
}

/** Status-Werte gegen das Datenmodell (AnimeStatus ohne das admin-interne „disabled"). */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ongoing', label: 'Laufend' },
  { value: 'done', label: 'Abgeschlossen' },
  { value: 'aborted', label: 'Abgebrochen' },
  { value: 'licensed', label: 'Lizenziert' },
]

/** Vollständig geleerte Filtermenge (für „Filter zurücksetzen"). */
const EMPTY_FILTERS: SearchFilterValues = {
  year_from: undefined,
  year_to: undefined,
  genre: undefined,
  tag: undefined,
  format: undefined,
  status: undefined,
  fansub_group: undefined,
}

/** Menschlich lesbare Anzeige eines aktiven Filterwerts. */
function displayValue(key: keyof SearchFilterValues, value: string | number): string {
  if (key === 'status') {
    return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? String(value)
  }
  return String(value)
}

/** Die aktiven (gesetzten) Filter als Liste für die Chip-Darstellung. */
export function activeFilters(
  filters: SearchFilterValues,
): { key: keyof SearchFilterValues; label: string; display: string }[] {
  return (Object.keys(FILTER_LABELS) as (keyof SearchFilterValues)[])
    .filter((key) => {
      const value = filters[key]
      return value !== undefined && value !== null && `${value}`.length > 0
    })
    .map((key) => ({
      key,
      label: FILTER_LABELS[key],
      display: displayValue(key, filters[key] as string | number),
    }))
}

/** Wandelt eine Freitext-/Zahleneingabe in einen optionalen Filterwert um. */
function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
function toOptionalNumber(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

interface FieldsProps {
  filters: SearchFilterValues
  onChange: (patch: Partial<SearchFilterValues>) => void
}

/**
 * Präsentationale Filter-Controls (D-06) — ausschließlich `@/components/ui`-Primitives.
 * Wird von SearchFilters (Desktop) und SearchFilterDrawer (mobil) geteilt.
 */
export function SearchFilterFields({ filters, onChange }: FieldsProps) {
  const baseId = useId()
  const fieldId = (name: string) => `${baseId}-${name}`

  return (
    <div className={styles.fields}>
      <FormField label={FILTER_LABELS.genre} htmlFor={fieldId('genre')}>
        <Input
          id={fieldId('genre')}
          value={filters.genre ?? ''}
          placeholder="z. B. Action"
          onChange={(event) => onChange({ genre: toOptionalString(event.target.value) })}
        />
      </FormField>

      <FormField label={FILTER_LABELS.tag} htmlFor={fieldId('tag')}>
        <Input
          id={fieldId('tag')}
          value={filters.tag ?? ''}
          placeholder="z. B. Schule"
          onChange={(event) => onChange({ tag: toOptionalString(event.target.value) })}
        />
      </FormField>

      <FormField label={FILTER_LABELS.format} htmlFor={fieldId('format')}>
        <Input
          id={fieldId('format')}
          value={filters.format ?? ''}
          placeholder="z. B. TV, Movie"
          onChange={(event) => onChange({ format: toOptionalString(event.target.value) })}
        />
      </FormField>

      <FormField label={FILTER_LABELS.status} htmlFor={fieldId('status')}>
        <Select
          id={fieldId('status')}
          value={filters.status ?? ''}
          onChange={(event) => onChange({ status: event.target.value || undefined })}
        >
          <option value="">Alle</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={FILTER_LABELS.year_from} htmlFor={fieldId('year-from')}>
        <YearPicker
          id={fieldId('year-from')}
          label={FILTER_LABELS.year_from}
          value={filters.year_from ? String(filters.year_from) : ''}
          minYear={MIN_FILTER_YEAR}
          maxYear={new Date().getFullYear() + 1}
          onChange={(value) => onChange({ year_from: toOptionalNumber(value) })}
        />
      </FormField>

      <FormField label={FILTER_LABELS.year_to} htmlFor={fieldId('year-to')}>
        <YearPicker
          id={fieldId('year-to')}
          label={FILTER_LABELS.year_to}
          value={filters.year_to ? String(filters.year_to) : ''}
          minYear={MIN_FILTER_YEAR}
          maxYear={new Date().getFullYear() + 1}
          onChange={(value) => onChange({ year_to: toOptionalNumber(value) })}
        />
      </FormField>

      <FormField
        label={FILTER_LABELS.fansub_group}
        htmlFor={fieldId('fansub-group')}
        hint="ID der Fansubgruppe"
      >
        <Input
          id={fieldId('fansub-group')}
          type="number"
          min={1}
          value={filters.fansub_group != null ? String(filters.fansub_group) : ''}
          placeholder="z. B. 42"
          onChange={(event) => onChange({ fansub_group: toOptionalNumber(event.target.value) })}
        />
      </FormField>
    </div>
  )
}

interface ChipsProps {
  filters: SearchFilterValues
  onRemove: (key: keyof SearchFilterValues) => void
}

/** Aktive Filter als entfernbare Chips (Badge + icon-only Ghost-Button). */
export function SearchFilterChips({ filters, onRemove }: ChipsProps) {
  const chips = activeFilters(filters)
  if (chips.length === 0) return null

  return (
    <div className={styles.chips} aria-label="Aktive Filter">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="neutral" className={styles.chip}>
          <span className={styles.chipText}>
            {chip.label}: {chip.display}
          </span>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className={styles.chipRemove}
            aria-label={`Filter ${chip.label} entfernen`}
            onClick={() => onRemove(chip.key)}
          >
            <X size={14} aria-hidden="true" />
          </Button>
        </Badge>
      ))}
    </div>
  )
}

interface SearchFiltersProps {
  /** Blendet den inline „Filter zurücksetzen"-Button aus (z. B. im Drawer mit Footer). */
  showReset?: boolean
}

/**
 * Desktop-Filterfläche: Filter-Controls + entfernbare Chips, alle Werte im URL-Zustand.
 *
 * Eigene `useDebouncedSearch({ role: 'controls' })`-Instanz — feuert keine eigenen Requests,
 * schreibt aber Filterwerte in die URL; SearchResults (Rolle „results") reagiert darüber.
 */
export function SearchFilters({ showReset = true }: SearchFiltersProps) {
  const { filters, setFilters } = useDebouncedSearch({ role: 'controls' })

  const removeFilter = useCallback(
    (key: keyof SearchFilterValues) => setFilters({ [key]: undefined }),
    [setFilters],
  )
  const clearAll = useCallback(() => setFilters(EMPTY_FILTERS), [setFilters])
  const hasActive = activeFilters(filters).length > 0

  return (
    <div className={styles.filters}>
      <SearchFilterFields filters={filters} onChange={setFilters} />
      <SearchFilterChips filters={filters} onRemove={removeFilter} />
      {showReset && hasActive ? (
        <Button variant="ghost" size="sm" className={styles.reset} onClick={clearAll}>
          Filter zurücksetzen
        </Button>
      ) : null}
    </div>
  )
}
