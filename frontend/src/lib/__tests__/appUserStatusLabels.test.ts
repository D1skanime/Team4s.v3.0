import { describe, expect, it } from 'vitest'

import { appUserStatusLabel, appUserStatusVariant } from '../appUserStatusLabels'

describe('appUserStatusVariant', () => {
  it('übersetzt alle bekannten app_users.status-Werte in ihre Badge-Variante und fällt sonst auf neutral zurück', () => {
    expect(appUserStatusVariant('active')).toBe('success')
    expect(appUserStatusVariant('pending')).toBe('warning')
    expect(appUserStatusVariant('disabled')).toBe('danger')
    expect(appUserStatusVariant('unbekannt')).toBe('neutral')
  })
})

describe('appUserStatusLabel', () => {
  it('übersetzt alle bekannten app_users.status-Werte ins Deutsche und fällt sonst auf den Rohwert zurück', () => {
    expect(appUserStatusLabel('active')).toBe('Aktiv')
    expect(appUserStatusLabel('pending')).toBe('Ausstehend')
    expect(appUserStatusLabel('disabled')).toBe('Deaktiviert')
    expect(appUserStatusLabel('unbekannt')).toBe('unbekannt')
  })
})
