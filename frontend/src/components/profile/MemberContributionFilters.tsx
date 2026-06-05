'use client'

import { useMemo, useState } from 'react'

import { Select } from '@/components/ui'

import { MemberRoleTimeline } from './MemberRoleTimeline'
import styles from './MemberContributionFilters.module.css'

// Flexible Eintragstruktur, die sowohl die echte PublicMemberRoleEntry als auch
// die Test-Mock-Daten abdeckt (D-06: kein API-Call, rein clientseitig).
export type ContributionFilterEntry = {
  id?: number
  anime_id: number | null
  anime_title?: string | null
  role?: string
  role_label?: string
  role_code?: string
  status: string
  year?: number | null
  started_year?: number | null
  ended_year?: number | null
  fansub_group_name?: string
  fansub_group_slug?: string
  context?: 'group_history' | 'anime_contribution'
  // Detail-Felder für Inline-Expand (D-07)
  detail_subtype?: string | null
  notes?: string | null
}

type MemberContributionFiltersProps = {
  roleTimeline: ContributionFilterEntry[]
}

type AnimeOption = {
  id: number
  title: string
}

function collectAnimeOptions(entries: ContributionFilterEntry[]): AnimeOption[] {
  const seen = new Map<number, string>()
  for (const e of entries) {
    if (e.anime_id != null && !seen.has(e.anime_id)) {
      seen.set(e.anime_id, e.anime_title ?? `Anime ${e.anime_id}`)
    }
  }
  return Array.from(seen.entries()).map(([id, title]) => ({ id, title }))
}

function matchesStatus(entry: ContributionFilterEntry, filter: string): boolean {
  if (filter === 'confirmed') return entry.status === 'confirmed'
  if (filter === 'unverified') return entry.status !== 'confirmed'
  return true
}

export function MemberContributionFilters({ roleTimeline }: MemberContributionFiltersProps) {
  const [animeFilter, setAnimeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const animeOptions = useMemo(() => collectAnimeOptions(roleTimeline), [roleTimeline])

  // Rein clientseitige Filterung — KEIN fetch/API-Call (D-06)
  const filtered = useMemo(
    () =>
      roleTimeline.filter(
        (e) =>
          (animeFilter === 'all' || e.anime_id === Number(animeFilter)) &&
          matchesStatus(e, statusFilter),
      ),
    [roleTimeline, animeFilter, statusFilter],
  )

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <label className={styles.filterLabel} htmlFor="filter-anime">
          Anime
          <Select
            id="filter-anime"
            value={animeFilter}
            onChange={(e) => setAnimeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Anime</option>
            {animeOptions.map((opt) => (
              <option key={opt.id} value={String(opt.id)}>
                {opt.title}
              </option>
            ))}
          </Select>
        </label>

        <label className={styles.filterLabel} htmlFor="filter-status">
          Status
          <Select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            <option value="confirmed">Bestätigt</option>
            <option value="unverified">Unbestätigt</option>
          </Select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.emptyText}>Keine Beiträge für den gewählten Filter.</p>
      ) : (
        <ul className={styles.entryList} role="list">
          {filtered.map((entry, idx) => {
            const key = entry.id ?? `${entry.anime_id}-${entry.role ?? entry.role_label}-${idx}`
            const isUnverified = entry.status !== 'confirmed'
            const label = entry.role_label ?? entry.role ?? entry.role_code ?? '–'
            return (
              <li key={key} className={`${styles.entry} ${isUnverified ? styles.entryDimmed : ''}`}>
                <span className={styles.entryRole}>{label}</span>
                {entry.anime_title ? (
                  <span className={styles.entryAnime}>{entry.anime_title}</span>
                ) : null}
                <span className={styles.entryYear}>
                  {entry.year ?? entry.started_year ?? '–'}
                </span>
                {isUnverified ? (
                  <span className={styles.unverifiedBadge} aria-label="Unbestätigt">
                    unbestätigt
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Re-exportiere MemberRoleTimeline-Integration für page.tsx-Verdrahtung.
// MemberContributionFilters ist die filterbare Wrapper-Komponente;
// MemberRoleTimeline bleibt für den direkten, nicht gefilterten Einsatz.
export { MemberRoleTimeline }
