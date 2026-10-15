import { describe, expect, it, vi } from 'vitest'

import { formatDateDeOrEmpty, formatDateDeOrIso } from './formatDate'

describe('formatDateDeOrIso (Cluster A: try/catch mit ISO-Fallback)', () => {
  it('formatiert ein gültiges ISO-Datum als de-DE Datum (tag.monat.jahr)', () => {
    expect(formatDateDeOrIso('2026-03-15T00:00:00Z')).toBe('15.03.2026')
  })

  it('liefert den ursprünglichen iso-String zurück, wenn toLocaleDateString wirft', () => {
    const spy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockImplementationOnce(() => {
        throw new Error('boom')
      })

    expect(formatDateDeOrIso('2026-03-15T00:00:00Z')).toBe('2026-03-15T00:00:00Z')

    spy.mockRestore()
  })
})

describe('formatDateDeOrEmpty (Cluster B: Leerstring-Fallback bei falsy/NaN)', () => {
  it('formatiert ein gültiges ISO-Datum identisch zu formatDateDeOrIso für denselben Tag', () => {
    expect(formatDateDeOrEmpty('2026-03-15T00:00:00Z')).toBe('15.03.2026')
  })

  it('liefert Leerstring für einen leeren String', () => {
    expect(formatDateDeOrEmpty('')).toBe('')
  })

  it('liefert Leerstring für null', () => {
    expect(formatDateDeOrEmpty(null)).toBe('')
  })

  it('liefert Leerstring für undefined', () => {
    expect(formatDateDeOrEmpty(undefined)).toBe('')
  })

  it('liefert Leerstring für einen nicht parsbaren Wert (Number.isNaN greift)', () => {
    expect(formatDateDeOrEmpty('nicht-ein-datum')).toBe('')
  })
})
