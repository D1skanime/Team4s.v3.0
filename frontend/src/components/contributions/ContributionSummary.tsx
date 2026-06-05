'use client'

import { useMemo } from 'react'

import { Button, Card, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import { type ContributionFilterState, hasActiveFilters } from './ContributionFilters'
import styles from './contributions.module.css'

interface ContributionSummaryProps {
  contributions: MeAnimeContribution[]
  activeFilters: ContributionFilterState
  onFilterChange: (f: ContributionFilterState) => void
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Bestätigt',
  proposed: 'In Prüfung',
  disputed: 'Bestritten',
  draft: 'Entwurf',
  hidden: 'Verborgen',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

// Chip-Zeile für eine Filterachse
function ChipRow({
  axisLabel,
  entries,
  activeValue,
  onSelect,
}: {
  axisLabel: string
  entries: [string, number][]
  activeValue: string | null
  onSelect: (value: string | null) => void
}) {
  if (entries.length === 0) return null
  return (
    <div className={styles.summaryAxisRow}>
      <span className={styles.summaryAxisLabel}>{axisLabel}</span>
      <div className={styles.summaryChips}>
        {entries.map(([value, count]) => {
          const isActive = activeValue === value
          return (
            <Button
              key={value}
              variant="subtle"
              size="sm"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? `Filter aktiv: ${axisLabel} ${value}`
                  : `Nach ${axisLabel} ${value} filtern`
              }
              className={isActive ? styles.chipActive : styles.chipInactive}
              onClick={() => onSelect(isActive ? null : value)}
            >
              {axisLabel === 'Status' ? statusLabel(value) : value} ({count})
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function ContributionSummary({
  contributions,
  activeFilters,
  onFilterChange,
}: ContributionSummaryProps) {
  const summary = useMemo(() => {
    const byStatus = new Map<string, number>()
    const byGroup = new Map<string, number>()
    const byRole = new Map<string, number>()

    for (const c of contributions) {
      byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1)
      if (c.fansub_group_name) {
        byGroup.set(c.fansub_group_name, (byGroup.get(c.fansub_group_name) ?? 0) + 1)
      }
      for (const code of c.role_codes) {
        byRole.set(code, (byRole.get(code) ?? 0) + 1)
      }
    }

    return { byStatus, byGroup, byRole }
  }, [contributions])

  const filtersActive = hasActiveFilters(activeFilters)

  function resetFilters() {
    onFilterChange({ status: null, group: null, anime: null, role: null, year: null })
  }

  return (
    <Card variant="section">
      <SectionHeader
        title="Überblick & Filter"
        description="Tippe auf einen Wert, um die Listen darunter zu filtern. Erneutes Tippen hebt den Filter auf."
      />
      <div className={styles.inboxContainer}>
        <ChipRow
          axisLabel="Status"
          entries={Array.from(summary.byStatus.entries())}
          activeValue={activeFilters.status}
          onSelect={(val) => onFilterChange({ ...activeFilters, status: val })}
        />
        <ChipRow
          axisLabel="Gruppe"
          entries={Array.from(summary.byGroup.entries())}
          activeValue={activeFilters.group}
          onSelect={(val) => onFilterChange({ ...activeFilters, group: val })}
        />
        <ChipRow
          axisLabel="Rolle"
          entries={Array.from(summary.byRole.entries())}
          activeValue={activeFilters.role}
          onSelect={(val) => onFilterChange({ ...activeFilters, role: val })}
        />
        {filtersActive ? (
          <div className={styles.actionsRow}>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
