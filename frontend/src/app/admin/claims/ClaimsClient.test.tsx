// @vitest-environment jsdom
//
// Plan 138-10 (D-23): ClaimsClient ist die zentrale, gruppenübergreifende Claims-Arbeitsqueue.
// Diese Tests prüfen die vier locked Behaviors: den exakten Leerzustand für status=pending,
// echte Button-basierte Navigation zu Benutzer/Gruppe (D-02), den URL-Roundtrip beim
// Status-Filter (analog zu AdminUsersClient.test.tsx) und die Pagination-Offset-Berechnung.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ClaimsClient } from './ClaimsClient'

/**
 * matchMedia-Mock für jsdom (jsdom implementiert window.matchMedia nicht) — identisches Muster
 * wie RoleCapabilityClient.test.tsx. Default: Desktop (kein Match für max-width: 759px).
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
const mockReplace = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/claims'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush, replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

const mockListClaims = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, limit: 25, offset: 0 },
  }),
)

vi.mock('@/lib/api', () => ({
  listClaims: mockListClaims,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

const sampleClaim = {
  claim_id: 1,
  app_user_id: 42,
  app_user_email: 'mira@example.com',
  app_user_display_name: 'Mira',
  member_id: 7,
  member_nickname: 'Mira-chan',
  claim_status: 'pending' as const,
  claim_type: 'claim',
  fansub_group_id: 5,
  fansub_group_name: 'New-Subs',
  is_active_member: false,
  note: '',
  created_at: '2026-08-20T10:00:00Z',
  verified_at: null,
}

beforeEach(() => {
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  mockListClaims.mockResolvedValue({
    data: [],
    meta: { total: 0, limit: 25, offset: 0 },
  })
})

describe('ClaimsClient — Leerzustand (D-23)', () => {
  it('rendert die exakte gelockte Kopie "Keine offenen Claims." wenn status=pending null Treffer liefert', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('status=pending'))

    render(<ClaimsClient />)

    await waitFor(() => {
      expect(screen.getByText('Keine offenen Claims.')).not.toBeNull()
    })
    expect(
      screen.getByText('Für diesen Filter liegen aktuell keine zu entscheidenden Claims vor.'),
    ).not.toBeNull()
  })
})

describe('ClaimsClient — bidirektionale Navigation (D-02)', () => {
  it('rendert Benutzer- und Gruppen-Zellen als klickbare Button-Navigation, nie als reinen Text', async () => {
    mockListClaims.mockResolvedValue({
      data: [sampleClaim],
      meta: { total: 1, limit: 25, offset: 0 },
    })

    render(<ClaimsClient />)

    const userButton = await screen.findByRole('button', { name: 'Mira' })
    const groupButton = await screen.findByRole('button', { name: 'New-Subs' })

    fireEvent.click(userButton)
    expect(mockPush).toHaveBeenCalledWith('/admin/users/42')

    fireEvent.click(groupButton)
    expect(mockPush).toHaveBeenCalledWith('/admin/fansubs/5/edit')
  })
})

describe('ClaimsClient — Status-Filter URL-Roundtrip', () => {
  it('schreibt einen geänderten Status-Filter in die URL und lädt via listClaims mit dem neuen status-Param neu', async () => {
    render(<ClaimsClient />)

    await waitFor(() => {
      expect(mockListClaims).toHaveBeenCalled()
    })
    mockListClaims.mockClear()

    const statusSelect = await screen.findByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'verified' } })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })
    const calledWith = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledWith).toContain('status=verified')
  })
})

describe('ClaimsClient — Pagination', () => {
  it('ruft listClaims mit dem korrekten Offset für Seite 2 auf', async () => {
    mockListClaims.mockResolvedValue({
      data: [sampleClaim],
      meta: { total: 60, limit: 25, offset: 0 },
    })

    render(<ClaimsClient />)

    const nextPageButton = await screen.findByRole('button', { name: '2' })
    fireEvent.click(nextPageButton)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })
    const calledWith = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledWith).toContain('offset=25')
  })
})

describe('ClaimsClient — bereits aktive Mitglieder', () => {
  it('zeigt für einen bereits übernommenen Claim keinen zweiten Übernahme-Button', async () => {
    mockListClaims.mockResolvedValue({
      data: [{ ...sampleClaim, claim_status: 'verified', is_active_member: true }],
      meta: { total: 1, limit: 25, offset: 0 },
    })

    render(<ClaimsClient />)

    expect(await screen.findByText('Bereits aktives Mitglied')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Als aktives Mitglied übernehmen' })).toBeNull()
  })
})
