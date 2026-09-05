import type { RoleDefinitionContext, RoleDefinitionOption } from '@/types/admin-capability'

export const ROLE_COLOR_KEYS = [
  '#183b7c',
  '#8c4a16',
  '#0f766e',
  '#475569',
  '#7e22ce',
  '#0369a1',
  '#27664f',
  '#6d3f83',
  '#c26a2e',
  '#7b3c4e',
  '#a16207',
  '#506b91',
  '#a04444',
  '#6b7f2a',
  '#b23a78',
] as const

export type RoleColorKey = (typeof ROLE_COLOR_KEYS)[number]
export const NEUTRAL_ROLE_COLOR_KEY = 'neutral' as const
export type BoundedRoleColorKey = RoleColorKey | typeof NEUTRAL_ROLE_COLOR_KEY
export const ROLE_CATALOG_CHIP_CLASS = 'role-catalog-chip'

export type RolePresentation = { colorKey: BoundedRoleColorKey; iconKey: string }

const COLOR_KEYS = new Set<string>(ROLE_COLOR_KEYS)
const ICON_KEYS = new Set(['crown', 'image', 'wrench', 'languages', 'check', 'film', 'user'])
const neutral: RolePresentation = { colorKey: NEUTRAL_ROLE_COLOR_KEY, iconKey: 'user' }

export function readableCodeLabel(code: string): string {
  const value = code.trim().replace(/[_-]+/g, ' ')
  return value ? value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('de-DE')) : 'Unbekannte Rolle'
}

export function getRole(rows: readonly RoleDefinitionOption[], code: string): RoleDefinitionOption | undefined {
  return rows.find((row) => row.code === code)
}

export function labelForRole(rows: readonly RoleDefinitionOption[], code: string): string {
  return getRole(rows, code)?.label_de || readableCodeLabel(code)
}

export function orderForContext(rows: readonly RoleDefinitionOption[], context: RoleDefinitionContext): RoleDefinitionOption[] {
  return rows.filter((row) => row.contexts?.includes(context)).slice().sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
}

function boundedColorKey(value: string | null | undefined): BoundedRoleColorKey {
  const normalized = value?.trim().toLowerCase()
  return normalized && COLOR_KEYS.has(normalized) ? normalized as RoleColorKey : NEUTRAL_ROLE_COLOR_KEY
}

export function presentationForRole(rows: readonly RoleDefinitionOption[], code: string): RolePresentation {
  const role = getRole(rows, code)
  if (!role) return neutral
  const iconKey = role.icon_key && ICON_KEYS.has(role.icon_key) ? role.icon_key : neutral.iconKey
  return { colorKey: boundedColorKey(role.color_key), iconKey }
}
