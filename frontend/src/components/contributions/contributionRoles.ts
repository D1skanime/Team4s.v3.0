import { labelForRole, orderForContext } from '@/lib/roleCatalog'
import type { RoleDefinitionOption } from '@/types/admin-capability'

import type { RoleDefinition } from './ProposalForm'

export function contributionRoleDefinitions(
  catalog: readonly RoleDefinitionOption[],
): RoleDefinition[] {
  // Nicht zuweisbare Rollen (role_definitions.assignable = false, z. B. "admin"/"other" seit
  // Migration 0148_role_catalog_uat_corrections) duerfen in keinem Mitwirkende-/Crew-Picker
  // auswaehlbar sein (176 scope addition 1). Diese Funktion ist die einzige zentrale Quelle
  // fuer anime_contribution-Picker-Optionen (RoleToggleGroup, ProposalForm via
  // MyProposalsSection, DefaultCrewManager) -- Anzeige-Labels bereits gespeicherter Rollen
  // laufen bewusst NICHT durch diesen Filter (siehe labelForRole/roleLabels, die weiterhin
  // den vollen, ungefilterten Katalog erhalten).
  return orderForContext(catalog, 'anime_contribution')
    .filter((role) => role.assignable !== false)
    .map(({ code, label_de }) => ({
      code,
      label_de,
    }))
}

export function normalizeRoleCodes(
  catalog: readonly RoleDefinitionOption[],
  codes: readonly string[],
): string[] {
  const selected = new Set(codes.filter(Boolean))
  const roles = contributionRoleDefinitions(catalog)
  const knownCodes = new Set(roles.map((role) => role.code))
  const known = roles.map((role) => role.code).filter((code) => selected.has(code))
  const unknown = codes.filter((code) => code && !knownCodes.has(code))

  return Array.from(new Set([...known, ...unknown]))
}

export function sameRoleCodes(
  catalog: readonly RoleDefinitionOption[],
  a: readonly string[],
  b: readonly string[],
): boolean {
  const left = normalizeRoleCodes(catalog, a)
  const right = normalizeRoleCodes(catalog, b)
  return left.length === right.length && left.every((code, index) => code === right[index])
}

export function roleLabels(
  catalog: readonly RoleDefinitionOption[],
  codes: readonly string[],
): string[] {
  return normalizeRoleCodes(catalog, codes).map((code) => labelForRole(catalog, code))
}
