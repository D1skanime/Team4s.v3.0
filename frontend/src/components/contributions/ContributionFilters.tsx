'use client'

import type { MeAnimeContribution } from '@/types/contributions'

/**
 * Filter-State für das Contributions-Dashboard (D-11/D-12).
 * Exportiert unter exaktem Namen — Plan 05 importiert:
 *   import { applyFilters, ContributionFilterState } from '@/components/contributions/ContributionFilters'
 */
export interface ContributionFilterState {
  status: string | null
  group: string | null
  anime: number | null
  role: string | null
  year: number | null
}

/**
 * Pure Function: gibt ein Prädikat zurück, das prüft ob eine MeAnimeContribution
 * den aktiven Filter-State erfüllt (D-11 client-seitig).
 *
 * Exportiert unter exaktem Namen — Plan 05 importiert applyFilters.
 */
export function applyFilters(
  filters: ContributionFilterState,
): (c: MeAnimeContribution) => boolean {
  return (c: MeAnimeContribution): boolean => {
    if (filters.status && c.status !== filters.status) return false
    if (filters.group && c.fansub_group_name !== filters.group) return false
    if (filters.anime !== null && c.anime_id !== filters.anime) return false
    if (filters.role && !c.role_codes.includes(filters.role)) return false
    if (
      filters.year !== null &&
      c.started_year !== filters.year &&
      c.ended_year !== filters.year
    )
      return false
    return true
  }
}

/** Leerer (unbefüllter) Filter-State als Initialwert */
export const EMPTY_FILTER_STATE: ContributionFilterState = {
  status: null,
  group: null,
  anime: null,
  role: null,
  year: null,
}

/** Prüft ob mindestens ein Filter-Feld aktiv ist */
export function hasActiveFilters(filters: ContributionFilterState): boolean {
  return (
    filters.status !== null ||
    filters.group !== null ||
    filters.anime !== null ||
    filters.role !== null ||
    filters.year !== null
  )
}
