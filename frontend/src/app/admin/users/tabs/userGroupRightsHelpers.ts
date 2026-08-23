import type {
  ActionEntry,
  EffectiveRightState,
  RoleCapabilityMatrix,
  RoleEntry,
} from '@/types/admin-capability'

/**
 * Reale fachliche Kategorien der Registry (Migration 0108/0146/0150, 138-RESEARCH.md R-02).
 * Nur eine Sortierreihenfolge -- keine zweite Label-Map (categoryDisplayLabel bleibt die
 * einzige Quelle für Anzeigenamen, D-11/Pattern 5).
 */
const CATEGORY_ORDER = [
  'gruppe',
  'gruppenmedien',
  'gruppenseite',
  'projekt',
  'rechteverwaltung',
  'release',
  'review',
]

const UNKNOWN_CATEGORY = 'sonstige'

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function groupStatesByCategory(
  states: EffectiveRightState[],
  actionMeta: Map<string, ActionEntry>,
): Map<string, EffectiveRightState[]> {
  const map = new Map<string, EffectiveRightState[]>()
  for (const state of states) {
    const category = actionMeta.get(state.action_code)?.category ?? UNKNOWN_CATEGORY
    const existing = map.get(category) ?? []
    existing.push(state)
    map.set(category, existing)
  }
  return map
}

/** D-13: menschliche "Quelle"-Beschriftung statt technischer decisive_source-Rohwerte. */
export function decisiveSourceLabel(state: EffectiveRightState): string {
  switch (state.decisive_source) {
    case 'platform_admin':
      return 'Plattform-Admin'
    case 'group_role':
      return state.granting_roles.length > 0 ? state.granting_roles.join(' + ') : '–'
    case 'user_allow':
      return 'persönliche Abweichung (zusätzlich erlaubt)'
    case 'user_deny':
      return 'persönliche Abweichung (entzogen)'
    case 'specialized_grant':
      return state.specialized_grants.length > 0 ? state.specialized_grants.join(' + ') : '–'
    case 'no_grant':
      return '–'
    default:
      return state.decisive_source
  }
}

export function roleLabelFor(roleCode: string, matrix: RoleCapabilityMatrix | null): string {
  return matrix?.roles.find((entry) => entry.role_code === roleCode)?.label_de ?? roleCode
}

/**
 * D-22 (138-09-PLAN.md): zuweisbare Gruppenrollen aus der bereits geladenen Matrix -- gleicher
 * Filter wie FansubAppMembersSection.tsx (orderForContext(..., 'fansub_group').filter(assignable))
 * und GuidedRevokeFlow.tsx's isFansubGroupCatalogRole, kein zweiter/stale Rollenkatalog.
 */
export function assignableFansubGroupRoles(
  matrix: RoleCapabilityMatrix | null,
  alreadyHeld: string[],
): RoleEntry[] {
  if (!matrix) return []
  return matrix.roles.filter(
    (role) =>
      role.assignable === true &&
      role.role_kind !== 'global_app_role' &&
      (role.contexts ?? []).includes('fansub_group') &&
      !alreadyHeld.includes(role.role_code),
  )
}
