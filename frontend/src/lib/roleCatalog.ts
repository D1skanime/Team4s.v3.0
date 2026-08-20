import type { RoleDefinitionContext, RoleDefinitionOption } from '@/types/admin-capability'

export type RolePresentation = { colorKey: string; iconKey: string }
const COLOR_KEYS = new Set(['leadership', 'creative', 'technical', 'language', 'quality', 'production', 'other'])
const ICON_KEYS = new Set(['crown', 'image', 'wrench', 'languages', 'check', 'film', 'user'])
const neutral: RolePresentation = { colorKey: 'other', iconKey: 'user' }

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

export function presentationForRole(rows: readonly RoleDefinitionOption[], code: string): RolePresentation {
  const role = getRole(rows, code)
  if (!role || !role.color_key || !role.icon_key || !COLOR_KEYS.has(role.color_key) || !ICON_KEYS.has(role.icon_key)) return neutral
  return { colorKey: role.color_key, iconKey: role.icon_key }
}
