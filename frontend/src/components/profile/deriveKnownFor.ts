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
  /** Rollenbezeichnung — entweder 'role' (generisch) oder 'role_label' (PublicMemberRoleEntry) */
  role?: string | null
  role_label?: string | null
  year?: number | null
  /** Jahresstart — alternativ zu 'year' für PublicMemberRoleEntry */
  started_year?: number | null
  group_name?: string | null
  /** Gruppenname — alternativ zu 'group_name' für PublicMemberRoleEntry */
  fansub_group_name?: string | null
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

  // Aktive Jahre: min/max über alle Einträge mit Jahr-Angabe (year oder started_year)
  const years = roleTimeline
    .map((e) => e.year ?? e.started_year)
    .filter((y): y is number => typeof y === 'number')

  let activeYears = ''
  if (years.length > 0) {
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    activeYears = minYear === maxYear ? String(minYear) : `${minYear}–${maxYear}`
  }

  // Top-Rollen nach Häufigkeit (absteigend sortiert, stabile Reihenfolge bei Gleichstand)
  // Akzeptiert 'role' (generisch) oder 'role_label' (PublicMemberRoleEntry)
  const roleCounts = new Map<string, number>()
  for (const entry of roleTimeline) {
    const roleKey = entry.role || entry.role_label
    if (roleKey) {
      roleCounts.set(roleKey, (roleCounts.get(roleKey) ?? 0) + 1)
    }
  }
  const topRoles = Array.from(roleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ROLES_LIMIT)
    .map(([role]) => role)

  // Bekannte Gruppen: distinct, Reihenfolge nach erstem Auftreten
  // Akzeptiert 'group_name' (generisch) oder 'fansub_group_name' (PublicMemberRoleEntry)
  const seenGroups = new Set<string>()
  const knownGroups: string[] = []
  for (const entry of roleTimeline) {
    const g = entry.group_name || entry.fansub_group_name
    if (g && !seenGroups.has(g)) {
      seenGroups.add(g)
      knownGroups.push(g)
    }
  }

  return { activeYears, topRoles, knownGroups }
}
