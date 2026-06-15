// @vitest-environment jsdom
//
// Wave-0 RED-Tests: UserDetailDrawer.tsx existiert noch nicht.
// Importfehler auf die Komponente sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-04 den Drawer implementiert.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'

// --- Mocks ---

// RED: Alle Tab-API-Calls noch nicht vorhanden → Mock verhindert echte Netzwerk-Calls
vi.mock('@/lib/api', () => ({
  getAdminUserOverview: vi.fn().mockResolvedValue({
    id: 1,
    email: 'aki@example.com',
    display_name: 'Aki',
    status: 'active',
    global_roles: ['platform_admin'],
    group_membership_count: 3,
    leader_context_count: 1,
    open_claims_count: 0,
    open_contributions_count: 2,
    total_contributions_count: 15,
    media_upload_count: 7,
    release_scope_count: 4,
    conflict_details: [],
    last_login_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }),
  getAdminUserGlobalRoles: vi.fn().mockResolvedValue({ roles: ['platform_admin'], assignable_roles: [] }),
  getAdminUserMemberClaims: vi.fn().mockResolvedValue({ member_profile: null, claims: [] }),
  getAdminUserGroupMemberships: vi.fn().mockResolvedValue({ memberships: [] }),
  getAdminUserGroupRights: vi.fn().mockResolvedValue({ group_rights: [] }),
  getAdminUserContributions: vi.fn().mockResolvedValue({
    project_defaults: [],
    release_overrides: [],
    open_disputes: [],
    legacy_historical: [],
  }),
  getAdminUserMedia: vi.fn().mockResolvedValue({ media_items: [] }),
  getAdminUserAudit: vi.fn().mockResolvedValue({ entries: [] }),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

// RED: UserDetailDrawer.tsx existiert noch nicht → Importfehler erwartet
import { UserDetailDrawer } from './UserDetailDrawer'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserDetailDrawer', () => {
  // --- RED: renders_nine_tabs ---
  //
  // Prüft, dass der Drawer die 9 Tabs aus der UI-SPEC anzeigt:
  // Übersicht, Globale Rollen, Member-Profil & Claims, Gruppenmitgliedschaften,
  // Gruppenrechte, Beiträge, Medien, Audit, Streaming.
  it('renders_nine_tabs', async () => {
    render(
      <UserDetailDrawer
        userId={1}
        onClose={() => undefined}
      />,
    )

    const expectedTabs = [
      'Übersicht',
      'Globale Rollen',
      'Member-Profil & Claims',
      'Gruppenmitgliedschaften',
      'Gruppenrechte',
      'Beiträge',
      'Medien',
      'Audit',
      'Streaming',
    ]

    // getByRole('tab', { name }) findet nur Tab-Buttons, nicht gleichnamige Panel-Inhalte
    for (const tab of expectedTabs) {
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: tab })).not.toBeNull()
      })
    }
  })

  // --- RED: tabs_lazy_load_on_first_activation ---
  //
  // Prüft, dass Tab-Daten-API-Calls nur beim ersten Aktivieren des jeweiligen Tabs
  // durchgeführt werden, NICHT beim initialen Rendern aller Tabs (Lazy-Load-Pattern D-09).
  it('tabs_lazy_load_on_first_activation', async () => {
    const { getAdminUserGlobalRoles } = await import('@/lib/api')
    const mockGetRoles = vi.mocked(getAdminUserGlobalRoles)
    mockGetRoles.mockClear()

    render(
      <UserDetailDrawer
        userId={1}
        onClose={() => undefined}
      />,
    )

    // Nach initialem Render: getAdminUserGlobalRoles wurde NICHT aufgerufen
    // (Übersicht-Tab ist Standard, Rollen-Tab ist noch nicht aktiviert)
    await waitFor(() => {
      // Warte auf initiales Laden des Übersicht-Tabs
      expect(screen.queryByText('Übersicht')).not.toBeNull()
    })

    expect(mockGetRoles).not.toHaveBeenCalled()

    // Klick auf "Globale Rollen" Tab → erst jetzt wird der API-Call durchgeführt
    // role="tab" selektiert nur den Tab-Button, nicht den SectionHeader im Panel
    const globalRolesTab = screen.getByRole('tab', { name: 'Globale Rollen' })
    fireEvent.click(globalRolesTab)

    await waitFor(() => {
      expect(mockGetRoles).toHaveBeenCalledWith(1)
    })

    // Erneuter Klick auf anderen Tab und zurück → kein zweiter API-Call
    fireEvent.click(screen.getByRole('tab', { name: 'Übersicht' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Globale Rollen' }))
    expect(mockGetRoles).toHaveBeenCalledTimes(1)
  })

  // --- RED: scoped_tabs_have_no_mutation_controls ---
  //
  // Prüft, dass die scoped Tabs (Gruppenrechte, Beiträge, Medien) keine
  // Mutations-Buttons enthalten (kein "Rolle vergeben", "Status ändern" etc.).
  // D-03: Scoped Rechte im Drawer sind ausschliesslich read-only.
  it('scoped_tabs_have_no_mutation_controls', async () => {
    render(
      <UserDetailDrawer
        userId={1}
        onClose={() => undefined}
      />,
    )

    // Gruppenrechte-Tab aktivieren (role="tab" vermeidet Kollision mit SectionHeader-Titel)
    await waitFor(() => {
      expect(screen.queryByRole('tab', { name: 'Gruppenrechte' })).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('tab', { name: 'Gruppenrechte' }))

    await waitFor(() => {
      // Kein Mutations-Button im Gruppenrechte-Tab
      expect(screen.queryByText('Rolle vergeben')).toBeNull()
      expect(screen.queryByText('Status ändern')).toBeNull()
      expect(screen.queryByText('Entziehen')).toBeNull()
    })

    // Beiträge-Tab aktivieren
    fireEvent.click(screen.getByRole('tab', { name: 'Beiträge' }))

    await waitFor(() => {
      // Kein Mutations-Button im Beiträge-Tab
      expect(screen.queryByText('Rolle vergeben')).toBeNull()
      expect(screen.queryByText('Bestätigen')).toBeNull()
      expect(screen.queryByText('Ablehnen')).toBeNull()
    })
  })
})
