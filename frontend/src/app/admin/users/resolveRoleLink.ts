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
 *
 * Nachtrag 2026-08-24 (D-01/D-08, Quick 260824-ek3): der Zielort ist der
 * Rollen-Arbeitsbereich (/admin/roles, Standardrechte-Tab), nicht mehr die
 * eigenständige Capability-Verwaltung (siehe 138-CONTEXT.md Abschnitt 8).
 *
 * Nachtrag 2026-08-24 (260824-ike Task 3, Defekt 3): optionaler dritter Parameter `tab`
 * haengt bei Bedarf &tab=... an, damit Aufrufer (z. B. GroupRolesSection.tsx) explizit den
 * Standardrechte-Tab statt des rollenart-abhaengigen Defaults erzwingen koennen. Ohne diesen
 * Parameter bleibt die Rueckgabe byte-identisch zum bisherigen Verhalten.
 */

import type { RoleCapabilityMatrix } from '@/types/admin-capability'

export function resolveRoleLink(
  roleCode: string,
  matrix: RoleCapabilityMatrix | null,
  tab?: 'holders' | 'caps',
): string | null {
  const entry = matrix?.roles.find((r) => r.role_code === roleCode)
  if (!entry) return null
  const base = `/admin/roles?role=${encodeURIComponent(roleCode)}`
  return tab ? `${base}&tab=${encodeURIComponent(tab)}` : base
}
