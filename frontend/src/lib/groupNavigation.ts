import type { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

interface BuildGroupNavigationGroupsInput {
  currentGroup?: FansubGroupSummary | null
  fallbackOtherGroups?: FansubGroupSummary[]
  animeFansubRelations?: AnimeFansubRelation[] | null
}

interface NavigationGroupItem {
  group: FansubGroupSummary
  isPrimary: boolean
}

function compareGroupNames(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

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

      if (!existing.isPrimary && relation.is_primary) {
        byID.set(group.id, { group, isPrimary: true })
      }
    }
  } else {
    for (const group of fallbackOtherGroups) {
      byID.set(group.id, { group, isPrimary: false })
    }
  }

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
