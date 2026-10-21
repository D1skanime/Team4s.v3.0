import { describe, expect, it } from 'vitest'

import { resolveMemberSectionLabel } from './fansub-team-labels'

describe('resolveMemberSectionLabel', () => {
  it('zeigt "Aktive Mitglieder · N" bei Status active', () => {
    expect(resolveMemberSectionLabel('active', 5)).toBe('Aktive Mitglieder · 5')
  })

  it('zeigt "Mitglieder · N" bei Status inactive', () => {
    expect(resolveMemberSectionLabel('inactive', 3)).toBe('Mitglieder · 3')
  })

  it('zeigt "Mitglieder · N" bei Status dissolved (keine Sonderbehandlung von dissolved)', () => {
    expect(resolveMemberSectionLabel('dissolved', 0)).toBe('Mitglieder · 0')
  })
})
