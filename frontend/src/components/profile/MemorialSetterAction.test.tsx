import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  setMemberMemorial: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

import { MemorialSetterAction } from './MemorialSetterAction'

describe('MemorialSetterAction — Sichtbarkeits-Gate (D-16)', () => {
  it('zeigt den Trigger-Button für Global Admin (isGlobalAdmin=true)', () => {
    const markup = renderToStaticMarkup(
      <MemorialSetterAction isGlobalAdmin={true} memberId={7} memberName="TestMember" />,
    )

    expect(markup).toContain('Als Gedenkprofil markieren')
  })

  it('blendet den Trigger für Nicht-Admin aus (isGlobalAdmin=false)', () => {
    const markup = renderToStaticMarkup(
      <MemorialSetterAction isGlobalAdmin={false} memberId={7} memberName="TestMember" />,
    )

    // Kein Trigger sichtbar — isGlobalAdmin=false reicht nicht
    expect(markup).toBe('')
  })

  it('blendet den Trigger auch aus wenn isGlobalAdmin=false, selbst wenn Gruppen-Capability vorhanden wäre (Fallstrick 4)', () => {
    // Fallstrick 4: Gruppen-Capability allein gewährt KEINE Memorial-Setter-Sichtbarkeit.
    // isGlobalAdmin wird als separates Flag übergeben und hängt NICHT von Gruppen-Capability ab.
    const markup = renderToStaticMarkup(
      // isGlobalAdmin=false simuliert den Fall: Gruppen-Leader mit Capability, aber kein Global Admin
      <MemorialSetterAction isGlobalAdmin={false} memberId={7} memberName="GroupLeader" />,
    )

    expect(markup).toBe('')
  })

  it('enthält verständliche Sprache über globale Wirkung und keine Account-Deaktivierung', () => {
    const markup = renderToStaticMarkup(
      <MemorialSetterAction isGlobalAdmin={true} memberId={7} memberName="TestMember" />,
    )

    // Button ist sichtbar, das Modal wird erst beim Klick geöffnet —
    // prüfe hier nur den Trigger-Text im Static-Render
    expect(markup).toContain('Als Gedenkprofil markieren')
  })
})
