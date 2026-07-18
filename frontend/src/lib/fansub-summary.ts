import { AnimeFansubRelation, FansubGroupSummary, FansubStatus } from '@/types/fansub'

/**
 * Schmalere Struktur, die sowohl von der vollen `FansubGroup`-Detailform als
 * auch von der angereicherten `FansubGroupSummary` strukturell erfuellt wird.
 * Nur die vier Story-Fakten-Felder werden hier tatsaechlich benoetigt.
 */
export interface FansubStoryFacts {
  founded_year?: number | null
  dissolved_year?: number | null
  country?: string | null
  status?: FansubStatus | null
}

function statusLabel(status: FansubStoryFacts['status']): string | null {
  if (status === 'active') return 'aktiv'
  if (status === 'inactive') return 'inaktiv'
  if (status === 'dissolved') return 'aufgelöst'
  return null
}

function foundedLabel(group: FansubStoryFacts): string | null {
  if (group.founded_year && group.dissolved_year) {
    return `${group.founded_year} bis ${group.dissolved_year}`
  }
  if (group.founded_year) {
    return `gegründet ${group.founded_year}`
  }
  if (group.dissolved_year) {
    return `bis ${group.dissolved_year}`
  }
  return null
}

export function buildFansubFactSummary(group: FansubStoryFacts): string | null {
  const parts = [foundedLabel(group), group.country?.trim() || null, statusLabel(group.status)].filter(
    (value): value is string => Boolean(value && value.trim()),
  )

  if (parts.length === 0) return null
  return parts.join(' • ')
}

export function buildFansubStoryPreview(group: FansubStoryFacts): string {
  return buildFansubFactSummary(group) || 'Keine Historie hinterlegt.'
}

/**
 * Baut die Fansub-Story-Vorschau-Gruppen direkt aus den bereits geladenen
 * Anime-Fansub-Relationen (`GET /api/v1/anime/{id}/fansubs`), ohne pro Gruppe
 * einen zusaetzlichen `getFansubBySlug`-Request zu feuern.
 */
export function buildFansubStoryGroups(relations: AnimeFansubRelation[]): FansubGroupSummary[] {
  const seen = new Set<number>()
  const groups: FansubGroupSummary[] = []

  for (const relation of relations) {
    const group = relation.fansub_group
    if (!group) continue
    if (seen.has(group.id)) continue
    seen.add(group.id)
    groups.push(group)
  }

  return groups
}
