/**
 * D-04 (Phase 111, Plan 111-04): Reine Lookup-Utility fuer die
 * User→Rolle-Querverlinkung ("Was darf diese Rolle?").
 *
 * Eine Rolle ist nur linkbar, wenn ihr role_code in der bereits geladenen
 * Capability-Matrix (listRoleCapabilities()) auflösbar ist. Globale App-Rollen
 * (platform_admin/content_admin/user) sind strukturell NIE auflösbar, da sie
 * in einem zu role_definitions disjunkten Namensraum leben
 * (111-RESEARCH.md Pitfall 1) — resolveRoleLink liefert fuer sie automatisch
 * null, ohne Sonderbehandlung.
 */

import type { RoleCapabilityMatrix } from '@/types/admin-capability'

export function resolveRoleLink(
  roleCode: string,
  matrix: RoleCapabilityMatrix | null,
): string | null {
  const entry = matrix?.roles.find((r) => r.role_code === roleCode)
  if (!entry) return null
  return `/admin/role-capabilities?role=${encodeURIComponent(roleCode)}`
}
