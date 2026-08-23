// @vitest-environment jsdom
//
// Plan 138-15 (D-01/D-02): AdminMainNav ist die eine persistente Admin-Hauptnavigation.
// Prüft, dass alle sechs locked Links vorhanden sind und der aktive Bereich markiert wird.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { AdminMainNav } from './AdminMainNav'

const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/users'))

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUsePathname.mockReturnValue('/admin/users')
})

describe('AdminMainNav (D-01/D-02)', () => {
  it('rendert alle sechs locked Bereiche mit den korrekten Ziel-Routen', () => {
    render(<AdminMainNav />)

    expect(screen.getByRole('link', { name: 'Benutzer' }).getAttribute('href')).toBe('/admin/users')
    expect(screen.getByRole('link', { name: 'Gruppen' }).getAttribute('href')).toBe('/admin/fansubs')
    expect(screen.getByRole('link', { name: 'Rollen' }).getAttribute('href')).toBe('/admin/roles')
    expect(screen.getByRole('link', { name: 'Capabilities' }).getAttribute('href')).toBe(
      '/admin/role-capabilities',
    )
    expect(screen.getByRole('link', { name: 'Claims' }).getAttribute('href')).toBe('/admin/claims')
    expect(screen.getByRole('link', { name: 'Änderungen' }).getAttribute('href')).toBe(
      '/admin/changes',
    )
  })

  it('markiert den aktiven Bereich anhand des aktuellen Pfads', () => {
    mockUsePathname.mockReturnValue('/admin/claims')
    render(<AdminMainNav />)

    expect(screen.getByRole('link', { name: 'Claims' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Benutzer' }).getAttribute('aria-current')).toBeNull()
  })

  it('markiert auch verschachtelte Detailrouten als aktiv (z. B. /admin/users/42)', () => {
    mockUsePathname.mockReturnValue('/admin/users/42')
    render(<AdminMainNav />)

    expect(screen.getByRole('link', { name: 'Benutzer' }).getAttribute('aria-current')).toBe('page')
  })
})
