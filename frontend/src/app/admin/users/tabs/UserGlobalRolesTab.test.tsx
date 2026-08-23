// @vitest-environment jsdom
//
// Regressionstest fuer 111-RESEARCH.md Pitfall 1: UserGlobalRolesTab zeigt
// globale App-Rollen (platform_admin/content_admin/user), die STRUKTURELL NIE
// in listRoleCapabilities() auflösbar sind (disjunkter Namensraum zu
// role_definitions). Dieser Test sichert explizit ab, dass UserGlobalRolesTab
// bewusst KEINEN "Was darf diese Rolle?"-Link rendert, damit ein spaeteres
// UAT das nicht faelschlich als "Link fehlt" meldet (Plan 111-04, D-04).
//
// Erweitert (260817-7fv): Globale Rollen sind jetzt IdP-verwaltet/read-only —
// kein Vergabe-/Entzugs-Steuerelement mehr, dafuer ein sichtbarer "aus IdP"-
// Hinweis.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { AdminUserGlobalRolesResponse } from '@/types/admin-users'

const mockGetAdminUserGlobalRoles = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserGlobalRoles: (...args: unknown[]) => mockGetAdminUserGlobalRoles(...args),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { UserGlobalRolesTab } from './UserGlobalRolesTab'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeGlobalRolesResponse(): AdminUserGlobalRolesResponse {
  return {
    roles: ['platform_admin'],
    assignable_roles: [],
  }
}

describe('UserGlobalRolesTab', () => {
  it('global role never links', async () => {
    mockGetAdminUserGlobalRoles.mockResolvedValueOnce(makeGlobalRolesResponse())

    render(<UserGlobalRolesTab userId={1} displayName="Max Mustermann" />)

    await waitFor(() => {
      expect(screen.getByText('Plattform-Admin')).not.toBeNull()
    })

    // Regressionsschutz (Pitfall 1): kein Link/Button "Was darf diese Rolle?"
    expect(screen.queryByRole('link', { name: /Was darf diese Rolle\?/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Was darf diese Rolle\?/i })).toBeNull()
    expect(screen.queryByText('Was darf diese Rolle?')).toBeNull()
  })

  it('renders read-only IdP-synced roles without assign/revoke controls', async () => {
    mockGetAdminUserGlobalRoles.mockResolvedValueOnce(makeGlobalRolesResponse())

    render(<UserGlobalRolesTab userId={1} displayName="Max Mustermann" />)

    await waitFor(() => {
      expect(screen.getByText('Plattform-Admin')).not.toBeNull()
    })

    expect(
      screen.queryByRole('button', { name: /entziehen|vergeben/i }),
    ).toBeNull()
    expect(screen.getByText(/aus IdP/i)).not.toBeNull()
  })

  it('zeigt bei keinen globalen Rollen eine kompakte einzeilige Information ohne "Aktive Rollen"-Block (UAT-138-G)', async () => {
    mockGetAdminUserGlobalRoles.mockResolvedValueOnce({ roles: [], assignable_roles: [] })

    render(<UserGlobalRolesTab userId={4} displayName="Max Mustermann" />)

    await waitFor(() => {
      expect(screen.getByText(/Keine globalen Rollen/)).not.toBeNull()
    })

    expect(screen.getByText(/aus Keycloak synchronisiert/i)).not.toBeNull()
    expect(screen.queryByText('Aktive Rollen')).toBeNull()
  })
})
