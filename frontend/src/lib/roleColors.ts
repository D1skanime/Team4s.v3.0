import { presentationForRole } from '@/lib/roleCatalog'
import type { RoleDefinitionOption } from '@/types/admin-capability'

// Mappt ein deutsches Rollen-Label auf den data-role-code der globalen Team4s-Rollenfarben
// (CSS-Tokens --role-accent-*). Unbekannte Rollen -> 'other'. Spiegelt die Logik aus
// MemberCurrentProjectsSection, damit die Rollenfarben app-weit konsistent sind.
export function roleColorCode(roleCode: string, catalog: readonly RoleDefinitionOption[] = []): string {
  return presentationForRole(catalog, roleCode).colorKey
}
