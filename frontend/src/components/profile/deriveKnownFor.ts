/**
 * deriveKnownFor — rein read-only Ableitung der „Bekannt für"-Highlights (D-03).
 *
 * Kein fetch, kein Schreib-Flow, kein neues DB-Feld.
 * Leitet mechanisch aus der role_timeline ab:
 *   - activeYears: Aktivitätsjahr-Spanne (min–max), z. B. "2019–2023"
 *   - topRoles: häufigste Rollen nach Anzahl (absteigend)
 *   - knownGroups: distinct Gruppen-Namen aus der Timeline
 */

export interface RoleTimelineEntry {
  role: string
  year?: number | null
  group_name?: string | null
  [key: string]: unknown
}

export interface KnownForResult {
  activeYears: string
  topRoles: string[]
  knownGroups: string[]
}

const TOP_ROLES_LIMIT = 3

export function deriveKnownFor(roleTimeline: RoleTimelineEntry[]): KnownForResult {
  if (roleTimeline.length === 0) {
    return { activeYears: '', topRoles: [], knownGroups: [] }
  }

  // Aktive Jahre: min/max über alle Einträge mit Jahr-Angabe
  const years = roleTimeline
    .map((e) => e.year)
    .filter((y): y is number => typeof y === 'number')

  let activeYears = ''
  if (years.length > 0) {
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    activeYears = minYear === maxYear ? String(minYear) : `${minYear}–${maxYear}`
  }

  // Top-Rollen nach Häufigkeit (absteigend sortiert, stabile Reihenfolge bei Gleichstand)
  const roleCounts = new Map<string, number>()
  for (const entry of roleTimeline) {
    if (entry.role) {
      roleCounts.set(entry.role, (roleCounts.get(entry.role) ?? 0) + 1)
    }
  }
  const topRoles = Array.from(roleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ROLES_LIMIT)
    .map(([role]) => role)

  // Bekannte Gruppen: distinct group_name, Reihenfolge nach erstem Auftreten
  const seenGroups = new Set<string>()
  const knownGroups: string[] = []
  for (const entry of roleTimeline) {
    const g = entry.group_name
    if (g && !seenGroups.has(g)) {
      seenGroups.add(g)
      knownGroups.push(g)
    }
  }

  return { activeYears, topRoles, knownGroups }
}
