'use client'

import { useMemo, useState } from 'react'

import { Select } from '@/components/ui'
import type { PublicMemberRoleEntry } from '@/types/contributions'

import { MemberRoleTimeline } from './MemberRoleTimeline'
import styles from './MemberContributionFilters.module.css'

type MemberContributionFiltersProps = {
  roleTimeline: PublicMemberRoleEntry[]
}

type AnimeOption = { id: number; title: string }
type GroupOption = { slug: string; name: string }
type RoleOption = { code: string; label: string }
type DecadeOption = { value: string; label: string }

// --- Options-Ableitung (alle aus role_timeline, keine Hardcodes) ---

function collectAnimeOptions(entries: PublicMemberRoleEntry[]): AnimeOption[] {
  const seen = new Map<number, string>()
  for (const e of entries) {
    if (e.anime_id != null && !seen.has(e.anime_id)) {
      seen.set(e.anime_id, e.anime_title ?? `Anime ${e.anime_id}`)
    }
  }
  return Array.from(seen.entries()).map(([id, title]) => ({ id, title }))
}

function collectGroupOptions(entries: PublicMemberRoleEntry[]): GroupOption[] {
  const seen = new Map<string, string>()
  for (const e of entries) {
    if (e.fansub_group_slug && !seen.has(e.fansub_group_slug)) {
      seen.set(e.fansub_group_slug, e.fansub_group_name || e.fansub_group_slug)
    }
  }
  return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }))
}

function collectRoleOptions(entries: PublicMemberRoleEntry[]): RoleOption[] {
  const seen = new Map<string, string>()
  for (const e of entries) {
    if (e.role_code && !seen.has(e.role_code)) {
      seen.set(e.role_code, e.role_label || e.role_code)
    }
  }
  return Array.from(seen.entries()).map(([code, label]) => ({ code, label }))
}

// Dekaden-Buckets aus started_year/ended_year. value = Dekaden-Startjahr als String.
function collectDecadeOptions(entries: PublicMemberRoleEntry[]): DecadeOption[] {
  const decades = new Set<number>()
  for (const e of entries) {
    for (const year of [e.started_year, e.ended_year]) {
      if (year != null) decades.add(Math.floor(year / 10) * 10)
    }
  }
  return Array.from(decades)
    .sort((a, b) => a - b)
    .map((start) => ({ value: String(start), label: `${start}–${start + 9}` }))
}

// --- Filter-Prädikate ---

// group_history mit status 'active' zählt als bestätigt (wie MemberRoleTimeline).
function isConfirmed(entry: PublicMemberRoleEntry): boolean {
  return entry.status === 'confirmed' || entry.status === 'active'
}

function matchesStatus(entry: PublicMemberRoleEntry, filter: string): boolean {
  if (filter === 'confirmed') return isConfirmed(entry)
  if (filter === 'unverified') return !isConfirmed(entry)
  return true
}

// Eintrag fällt in die Dekade, wenn started_year ODER ended_year im Fenster liegt.
// Einträge ohne Jahr sind nur bei 'all' sichtbar.
function matchesDecade(entry: PublicMemberRoleEntry, filter: string): boolean {
  if (filter === 'all') return true
  const start = Number(filter)
  const end = start + 9
  const inRange = (y: number | null) => y != null && y >= start && y <= end
  return inRange(entry.started_year) || inRange(entry.ended_year)
}

// Unbestätigt für die gedämpfte Darstellung in MemberRoleTimeline.
function isUnverified(entry: PublicMemberRoleEntry): boolean {
  return !isConfirmed(entry)
}

export function MemberContributionFilters({ roleTimeline }: MemberContributionFiltersProps) {
  const [animeFilter, setAnimeFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [zeitraumFilter, setZeitraumFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const animeOptions = useMemo(() => collectAnimeOptions(roleTimeline), [roleTimeline])
  const groupOptions = useMemo(() => collectGroupOptions(roleTimeline), [roleTimeline])
  const roleOptions = useMemo(() => collectRoleOptions(roleTimeline), [roleTimeline])
  const decadeOptions = useMemo(() => collectDecadeOptions(roleTimeline), [roleTimeline])

  // Rein clientseitige Filterung mit UND-Verknüpfung — KEIN fetch/API-Call (D-06).
  const filtered = useMemo(
    () =>
      roleTimeline.filter(
        (e) =>
          (animeFilter === 'all' || e.anime_id === Number(animeFilter)) &&
          (groupFilter === 'all' || e.fansub_group_slug === groupFilter) &&
          (roleFilter === 'all' || e.role_code === roleFilter) &&
          matchesDecade(e, zeitraumFilter) &&
          matchesStatus(e, statusFilter),
      ),
    [roleTimeline, animeFilter, groupFilter, roleFilter, zeitraumFilter, statusFilter],
  )

  const hasUnverified = useMemo(() => filtered.some(isUnverified), [filtered])

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

        <label className={styles.filterLabel} htmlFor="filter-gruppe">
          Gruppe
          <Select
            id="filter-gruppe"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Gruppen</option>
            {groupOptions.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.name}
              </option>
            ))}
          </Select>
        </label>

        <label className={styles.filterLabel} htmlFor="filter-rolle">
          Rolle
          <Select
            id="filter-rolle"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Rollen</option>
            {roleOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </Select>
        </label>

        <label className={styles.filterLabel} htmlFor="filter-zeitraum">
          Zeitraum
          <Select
            id="filter-zeitraum"
            value={zeitraumFilter}
            onChange={(e) => setZeitraumFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Zeiträume</option>
            {decadeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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

      {/* GAP-2: gefilterte Liste rendert über MemberRoleTimeline (inkl. EntryDetail-Inline-Expand). */}
      <MemberRoleTimeline entries={filtered} hasUnverified={hasUnverified} />
    </div>
  )
}
