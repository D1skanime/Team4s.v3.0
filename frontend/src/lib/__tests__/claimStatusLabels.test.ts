import { describe, expect, it } from 'vitest'

import { claimStatusLabel, claimStatusVariant } from '../claimStatusLabels'

describe('claimStatusVariant', () => {
  it('ordnet allen bekannten Rohwerten die richtige Badge-Variante zu', () => {
    expect(claimStatusVariant('verified')).toBe('success')
    expect(claimStatusVariant('active')).toBe('success')
    expect(claimStatusVariant('pending')).toBe('warning')
    expect(claimStatusVariant('open')).toBe('warning')
    expect(claimStatusVariant('rejected')).toBe('danger')
    expect(claimStatusVariant('denied')).toBe('danger')
  })

  it('fällt bei unbekannten Rohwerten auf neutral zurück', () => {
    expect(claimStatusVariant('unbekannt')).toBe('neutral')
  })
})

describe('claimStatusLabel', () => {
  it('übersetzt alle bekannten Rohwerte ins Deutsche', () => {
    expect(claimStatusLabel('verified')).toBe('Genehmigt')
    expect(claimStatusLabel('active')).toBe('Genehmigt')
    expect(claimStatusLabel('pending')).toBe('Offen')
    expect(claimStatusLabel('open')).toBe('Offen')
    expect(claimStatusLabel('rejected')).toBe('Abgelehnt')
    expect(claimStatusLabel('denied')).toBe('Abgelehnt')
  })

  it('fällt bei unbekannten Rohwerten auf den Rohwert zurück', () => {
    expect(claimStatusLabel('unbekannt')).toBe('unbekannt')
  })
})
