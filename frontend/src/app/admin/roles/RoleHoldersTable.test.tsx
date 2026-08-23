// @vitest-environment jsdom
//
// Plan 138-12 (D-07): RoleHoldersTable beantwortet "wer besitzt diese Rolle?" — Benutzer und
// Gruppe müssen echte klickbare Navigations-Buttons sein (D-02/D-09), nicht reiner Text; ein
// leerer Rolleninhaber-Satz zeigt einen EmptyState statt einer kaputten leeren Tabelle;
// Rechte-Abweichungen sind ein reiner Ja/Nein-Indikator (kein Rohzähler).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { RoleHoldersTable } from './RoleHoldersTable'
import type { RoleHolderEntry } from '@/types/admin-capability'

/**
 * matchMedia-Mock für jsdom — identisches Muster wie ClaimsClient.test.tsx /
 * RoleCapabilityClient.test.tsx. Default: Desktop (kein Match für max-width: 759px).
 */
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const mockPush = vi.hoisted(() => vi.fn())
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
}))

const sampleHolder: RoleHolderEntry = {
  app_user_id: 42,
  display_name: 'Mira',
  email: 'mira@example.com',
  fansub_group_id: 5,
  fansub_group_name: 'New-Subs',
  membership_status: 'active',
  has_overrides: false,
}

const overriddenHolder: RoleHolderEntry = {
  app_user_id: 7,
  display_name: 'Kenji',
  email: 'kenji@example.com',
  fansub_group_id: 9,
  fansub_group_name: 'Old-Subs',
  membership_status: 'disabled',
  has_overrides: true,
}

beforeEach(() => {
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RoleHoldersTable — Leerzustand', () => {
  it('rendert einen EmptyState statt einer leeren Tabelle, wenn keine Rolleninhaber existieren', () => {
    render(<RoleHoldersTable holders={[]} />)

    expect(screen.getByText('Keine Rolleninhaber gefunden.')).not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('RoleHoldersTable — bidirektionale Navigation (D-02/D-09)', () => {
  it('rendert Benutzer-Zellen als klickbare Button-Navigation zu /admin/users/:id', () => {
    render(<RoleHoldersTable holders={[sampleHolder]} />)

    const userButton = screen.getByRole('button', { name: 'Mira' })
    fireEvent.click(userButton)

    expect(mockPush).toHaveBeenCalledWith('/admin/users/42')
  })

  it('rendert Gruppe-Zellen als klickbare Button-Navigation zu /admin/fansubs/:id/edit', () => {
    render(<RoleHoldersTable holders={[sampleHolder]} />)

    const groupButton = screen.getByRole('button', { name: 'New-Subs' })
    fireEvent.click(groupButton)

    expect(mockPush).toHaveBeenCalledWith('/admin/fansubs/5/edit')
  })
})

describe('RoleHoldersTable — Rechte-Abweichungen (Ja/Nein-Indikator)', () => {
  it('rendert "Ja", wenn has_overrides=true', () => {
    render(<RoleHoldersTable holders={[overriddenHolder]} />)

    expect(screen.getByText('Ja')).not.toBeNull()
  })

  it('rendert "Nein", wenn has_overrides=false', () => {
    render(<RoleHoldersTable holders={[sampleHolder]} />)

    expect(screen.getByText('Nein')).not.toBeNull()
  })
})
