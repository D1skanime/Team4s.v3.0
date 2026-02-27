import { ApiError } from '@/lib/api'
import { SubtitleType } from '@/types/episodeVersion'

export function formatAdminError(error: unknown, fallback = 'Anfrage fehlgeschlagen.'): string {
  if (error instanceof ApiError) {
    return `(${error.status}) ${error.message}`
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export function formatDateTime(value?: string | null, fallback = 'kein Datum'): string {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  return parsed.toLocaleString('de-DE')
}

export function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const day = `${parsed.getDate()}`.padStart(2, '0')
  const hour = `${parsed.getHours()}`.padStart(2, '0')
  const minute = `${parsed.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString()
}

export function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function resolveSubtitleLabel(value?: SubtitleType | null): string {
  if (value === 'softsub') return 'Softsub'
  if (value === 'hardsub') return 'Hardsub'
  return 'Kein Subtitle'
}
