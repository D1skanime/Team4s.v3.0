import type { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

/**
 * Eingabeparameter für die Aufbau-Funktion der Gruppennavigation.
 * Enthält die aktuelle Gruppe, Fallback-Gruppen und optionale Fansub-Relationen.
 */
interface BuildGroupNavigationGroupsInput {
  currentGroup?: FansubGroupSummary | null
  fallbackOtherGroups?: FansubGroupSummary[]
  animeFansubRelations?: AnimeFansubRelation[] | null
}

/**
 * Internes Hilfsobjekt, das eine Gruppe zusammen mit ihrer Primär-Kennzeichnung speichert.
 * Wird für die Deduplizierung und Sortierung während des Aufbaus der Navigationsliste verwendet.
 */
interface NavigationGroupItem {
  group: FansubGroupSummary
  isPrimary: boolean
}

/**
 * Vergleicht zwei Gruppennamen alphabetisch nach deutschen Sortierregeln (Groß-/Kleinschreibung ignoriert).
 *
 * @param a - Erster Gruppenname
 * @param b - Zweiter Gruppenname
 * @returns Negativer Wert wenn a < b, 0 wenn gleich, positiver Wert wenn a > b
 */
function compareGroupNames(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

/**
 * Baut die sortierte Liste der Fansub-Gruppen für die Gruppennavigation auf.
 *
 * Priorisierungsregeln:
 * - Wenn `animeFansubRelations` vorhanden sind, werden diese als Quelle verwendet.
 * - Andernfalls wird auf `fallbackOtherGroups` zurückgegriffen.
 * - Die `currentGroup` wird ergänzt, falls sie noch nicht in der Liste ist.
 * - Primärgruppen erscheinen zuerst; innerhalb der Gruppen gilt alphabetische Sortierung.
 *
 * @param input - Eingabedaten mit aktueller Gruppe, Fallbacks und Relationen
 * @returns Sortierte Liste von Fansub-Gruppen für die Navigation
 */
export function buildGroupNavigationGroups({
  currentGroup,
  fallbackOtherGroups = [],
  animeFansubRelations = null,
}: BuildGroupNavigationGroupsInput): FansubGroupSummary[] {
  const byID = new Map<number, NavigationGroupItem>()

  if (animeFansubRelations && animeFansubRelations.length > 0) {
    for (const relation of animeFansubRelations) {
      const group = relation.fansub_group
      if (!group) continue

      const existing = byID.get(group.id)
      if (!existing) {
        byID.set(group.id, { group, isPrimary: relation.is_primary })
        continue
      }

      // Upgrade zur Primärgruppe, wenn eine Relation sie als primär kennzeichnet
      if (!existing.isPrimary && relation.is_primary) {
        byID.set(group.id, { group, isPrimary: true })
      }
    }
  } else {
    for (const group of fallbackOtherGroups) {
      byID.set(group.id, { group, isPrimary: false })
    }
  }

  // Aktuelle Gruppe hinzufügen, falls noch nicht enthalten
  if (currentGroup && !byID.has(currentGroup.id)) {
    byID.set(currentGroup.id, { group: currentGroup, isPrimary: false })
  }

  const groups = Array.from(byID.values())
  groups.sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1
    }
    return compareGroupNames(left.group.name, right.group.name)
  })

  return groups.map((item) => item.group)
}
