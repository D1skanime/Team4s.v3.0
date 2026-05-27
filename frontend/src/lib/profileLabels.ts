import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { ProfileVisibility } from '@/types/profile'

const GROUP_ROLE_LABELS = new Map<string, string>(FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.code, option.label]))

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

const VISIBILITY_LABELS = new Map<ProfileVisibility, string>([
  ['members_only', 'Nur für Mitglieder'],
  ['public', 'Öffentlich'],
])

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

export function formatGroupRoleLabel(role: string): string {
  const trimmed = role.trim()
  return GROUP_ROLE_LABELS.get(trimmed) || readableCodeLabel(trimmed)
}

export function formatHistoricalCreditRoleLabel(roleName: string, roleLabel?: string | null): string {
  const label = roleLabel?.trim()
  if (label) return label
  return formatGroupRoleLabel(roleName)
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
  return visibility ? VISIBILITY_LABELS.get(visibility) || 'Nur für Mitglieder' : 'Nur für Mitglieder'
}
