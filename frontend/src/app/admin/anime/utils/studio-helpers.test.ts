import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api'

import {
  formatAdminError,
  formatDateTime,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
  normalizeOptionalText,
  resolveSubtitleLabel,
} from './studio-helpers'

describe('formatAdminError', () => {
  it('formats ApiError with status and message', () => {
    const error = new ApiError(404, 'Anime nicht gefunden')
    expect(formatAdminError(error)).toBe('(404) Anime nicht gefunden')
  })

  it('formats ApiError with different status codes', () => {
    expect(formatAdminError(new ApiError(400, 'Ungueltige Anfrage'))).toBe('(400) Ungueltige Anfrage')
    expect(formatAdminError(new ApiError(500, 'Serverfehler'))).toBe('(500) Serverfehler')
    expect(formatAdminError(new ApiError(401, 'Nicht autorisiert'))).toBe('(401) Nicht autorisiert')
  })

  it('appends ApiError details when present', () => {
    const error = new ApiError(500, 'Interner Serverfehler', null, 'db_schema_mismatch', 'Fehlende Spalte: status.')
    expect(formatAdminError(error)).toBe('(500) Interner Serverfehler\nFehlende Spalte: status.')
  })

  it('uses Error message for regular errors', () => {
    const error = new Error('Netzwerkfehler')
    expect(formatAdminError(error)).toBe('Netzwerkfehler')
  })

  it('trims Error messages and falls back if empty', () => {
    expect(formatAdminError(new Error('   '))).toBe('Anfrage fehlgeschlagen.')
    expect(formatAdminError(new Error(''))).toBe('Anfrage fehlgeschlagen.')
  })

  it('returns fallback for non-Error objects', () => {
    expect(formatAdminError('string error')).toBe('Anfrage fehlgeschlagen.')
    expect(formatAdminError(null)).toBe('Anfrage fehlgeschlagen.')
    expect(formatAdminError(undefined)).toBe('Anfrage fehlgeschlagen.')
    expect(formatAdminError({ custom: 'object' })).toBe('Anfrage fehlgeschlagen.')
  })

  it('uses custom fallback message', () => {
    expect(formatAdminError(null, 'Benutzerdefinierter Fehler')).toBe('Benutzerdefinierter Fehler')
    expect(formatAdminError(undefined, 'Speichern fehlgeschlagen')).toBe('Speichern fehlgeschlagen')
  })
})

describe('formatDateTime', () => {
  it('returns fallback for undefined', () => {
    expect(formatDateTime(undefined)).toBe('kein Datum')
  })

  it('returns fallback for null', () => {
    expect(formatDateTime(null)).toBe('kein Datum')
  })

  it('returns fallback for empty string', () => {
    expect(formatDateTime('')).toBe('kein Datum')
  })

  it('returns fallback for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('kein Datum')
    expect(formatDateTime('2024-13-45')).toBe('kein Datum')
  })

  it('uses custom fallback message', () => {
    expect(formatDateTime(undefined, 'unbekannt')).toBe('unbekannt')
    expect(formatDateTime('invalid', '--')).toBe('--')
  })

  it('formats valid ISO date string to German locale', () => {
    const result = formatDateTime('2024-06-15T14:30:00.000Z')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/6|06/)
    expect(result).toMatch(/2024/)
  })

  it('formats date-only strings', () => {
    const result = formatDateTime('2024-01-01')
    expect(result).toMatch(/2024/)
  })
})

describe('toDateTimeLocalValue', () => {
  it('returns empty string for undefined', () => {
    expect(toDateTimeLocalValue(undefined)).toBe('')
  })

  it('returns empty string for null', () => {
    expect(toDateTimeLocalValue(null)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(toDateTimeLocalValue('')).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(toDateTimeLocalValue('invalid')).toBe('')
  })

  it('formats ISO date to datetime-local format', () => {
    const result = toDateTimeLocalValue('2024-06-15T14:30:00.000Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('pads single-digit months and days', () => {
    const result = toDateTimeLocalValue('2024-01-05T08:05:00.000Z')
    expect(result).toMatch(/01-0[45]/)
    expect(result).toMatch(/T\d{2}:\d{2}$/)
  })
})

describe('fromDateTimeLocalValue', () => {
  it('returns null for empty string', () => {
    expect(fromDateTimeLocalValue('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(fromDateTimeLocalValue('   ')).toBeNull()
    expect(fromDateTimeLocalValue('\t\n')).toBeNull()
  })

  it('returns null for invalid date', () => {
    expect(fromDateTimeLocalValue('invalid')).toBeNull()
  })

  it('converts datetime-local value to ISO string', () => {
    const result = fromDateTimeLocalValue('2024-06-15T14:30')
    expect(result).not.toBeNull()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(result).toMatch(/Z$/)
  })

  it('handles whitespace around valid value', () => {
    const result = fromDateTimeLocalValue('  2024-06-15T14:30  ')
    expect(result).not.toBeNull()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
})

describe('normalizeOptionalText', () => {
  it('returns null for empty string', () => {
    expect(normalizeOptionalText('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(normalizeOptionalText('   ')).toBeNull()
    expect(normalizeOptionalText('\t\n')).toBeNull()
  })

  it('returns trimmed string for non-empty values', () => {
    expect(normalizeOptionalText('hello')).toBe('hello')
    expect(normalizeOptionalText('  hello  ')).toBe('hello')
  })

  it('preserves internal whitespace', () => {
    expect(normalizeOptionalText('hello world')).toBe('hello world')
  })
})

describe('resolveSubtitleLabel', () => {
  it('returns Softsub for softsub type', () => {
    expect(resolveSubtitleLabel('softsub')).toBe('Softsub')
  })

  it('returns Hardsub for hardsub type', () => {
    expect(resolveSubtitleLabel('hardsub')).toBe('Hardsub')
  })

  it('returns default for undefined', () => {
    expect(resolveSubtitleLabel(undefined)).toBe('Kein Subtitle')
  })

  it('returns default for null', () => {
    expect(resolveSubtitleLabel(null)).toBe('Kein Subtitle')
  })

  it('returns default for unknown type', () => {
    expect(resolveSubtitleLabel('unknown' as never)).toBe('Kein Subtitle')
  })
})
