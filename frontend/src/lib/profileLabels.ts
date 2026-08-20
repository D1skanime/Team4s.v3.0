import { labelForRole } from '@/lib/roleCatalog'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import type { ProfileVisibility } from '@/types/profile'

const PLATFORM_ROLE_LABELS = new Map<string, string>([
  ['platform_admin', 'Plattform-Admin'],
  ['admin', 'Admin'],
  ['user', 'Mitglied'],
])

const ACCOUNT_STATUS_LABELS = new Map<string, string>([
  ['pending', 'Ausstehend'],
  ['active', 'Aktiv'],
  ['disabled', 'Deaktiviert'],
])

const GROUP_STATUS_LABELS = new Map<string, string>([
  ['active', 'Aktiv'],
  ['inactive', 'Inaktiv'],
  ['dissolved', 'Aufgelöst'],
])

const APP_MEMBER_STATUS_LABELS = new Map<string, string>([
  ['active', 'Aktiv'],
  ['disabled', 'Deaktiviert'],
])

const VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  public: 'Öffentlich',
  private: 'Privat',
}

function readableCodeLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function formatPlatformRoleLabel(role: string): string {
  const trimmed = role.trim()
  return PLATFORM_ROLE_LABELS.get(trimmed) || readableCodeLabel(trimmed)
}

export function formatGroupRoleLabel(role: string, catalog: readonly RoleDefinitionOption[] = []): string {
  return labelForRole(catalog, role.trim())
}

export function formatHistoricalCreditRoleLabel(roleName: string, roleLabel?: string | null, catalog: readonly RoleDefinitionOption[] = []): string {
  const label = roleLabel?.trim()
  if (label) return label
  return formatGroupRoleLabel(roleName, catalog)
}

export function formatAccountStatusLabel(status?: string | null): string {
  const trimmed = status?.trim() || ''
  if (!trimmed) return 'Unbekannt'
  return ACCOUNT_STATUS_LABELS.get(trimmed) || readableCodeLabel(trimmed)
}

export function formatGroupStatusLabel(status?: string | null): string {
  const trimmed = status?.trim() || ''
  if (!trimmed) return 'Unbekannt'
  return GROUP_STATUS_LABELS.get(trimmed) || readableCodeLabel(trimmed)
}

export function formatAppMemberStatusLabel(status?: string | null): string {
  const trimmed = status?.trim() || ''
  if (!trimmed) return 'Nicht verknüpft'
  return APP_MEMBER_STATUS_LABELS.get(trimmed) || readableCodeLabel(trimmed)
}

export function formatProfileVisibilityLabel(visibility?: ProfileVisibility | null): string {
  return visibility ? VISIBILITY_LABELS[visibility] : ''
}
