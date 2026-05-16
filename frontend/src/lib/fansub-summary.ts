import { FansubGroup } from '@/types/fansub'

function statusLabel(status: FansubGroup['status']): string | null {
  if (status === 'active') return 'aktiv'
  if (status === 'inactive') return 'inaktiv'
  if (status === 'dissolved') return 'aufgelöst'
  return null
}

function foundedLabel(group: FansubGroup): string | null {
  if (group.founded_year && group.dissolved_year) {
    return `${group.founded_year} bis ${group.dissolved_year}`
  }
  if (group.founded_year) {
    return `gegründet ${group.founded_year}`
  }
  if (group.dissolved_year) {
    return `bis ${group.dissolved_year}`
  }
  return null
}

export function buildFansubFactSummary(group: FansubGroup): string | null {
  const parts = [foundedLabel(group), group.country?.trim() || null, statusLabel(group.status)].filter(
    (value): value is string => Boolean(value && value.trim()),
  )

  if (parts.length === 0) return null
  return parts.join(' • ')
}

export function buildFansubStoryPreview(group: FansubGroup): string {
  return buildFansubFactSummary(group) || 'Keine Historie hinterlegt.'
}
