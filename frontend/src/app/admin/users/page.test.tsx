// @vitest-environment jsdom
//
// Wave-0 RED-Tests: AdminUsersClient und page.tsx existieren noch nicht.
// Importfehler auf diese Komponenten sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-04 die Listenoberfläche implementiert.
//
// Plan 111-03: clicking_row_opens_drawer / clicking_row_keeps_table_visible_on_desktop
// wurden entfernt (D-01 entfernt den Drawer-/Dual-Mode-Pfad vollständig) und durch
// clicking_row_navigates_to_detail_route ersetzt. Diese Assertion prüft ausschließlich
// den erzeugten Navigations-Aufruf, nicht die Existenz der (zu diesem Zeitpunkt noch
// nicht existierenden) /admin/users/[id]-Route.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// --- Mocks ---

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({ hasAccessToken: true, hasRefreshToken: true, isClientInitialized: true }),
}))

vi.mock('@/lib/api', () => ({
  listAdminUsersPage: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        email: 'aki@example.com',
        display_name: 'Aki',
        status: 'active',
        global_roles: [],
        member_profile_id: 42,
        member_profile_name: 'Aki-Member',
        group_membership_count: 3,
        leader_context_count: 1,
        open_claims_count: 0,
        open_contributions_count: 2,
        total_contributions_count: 15,
        media_upload_count: 7,
        release_scope_count: 4,
        conflict_count: 0,
        last_activity_at: '2026-06-10T12:00:00Z',
      },
    ],
    meta: { total: 1, limit: 25, offset: 0 },
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    data: { id: 1, display_name: 'Admin', is_platform_admin: true },
  }),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import AdminUsersPage from './page'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('AdminUsersPage (/admin/users)', () => {
  // --- renders_table_with_all_required_columns ---
  //
  // Prüft, dass die Admin-Users-Tabelle alle Spaltenköpfe aus der UI-SPEC enthält.
  // Erwartete Spalten (D-04, locked, Plan 138-15): Benutzer, Status, Globale Rolle,
  // Member-Profil, Gruppenmitgliedschaften, Offene Claims, Letzte Aktivität, Aktionen.
  // Beiträge/Release-Arbeitsflächen/Medienuploads/Leitungskontext/Konflikte sind keine
  // headline Spalten mehr (D-04 entfernt sie explizit aus der Tabelle).
  it('renders_table_with_all_required_columns', async () => {
    render(<AdminUsersPage />)

    const expectedColumns = [
      'Benutzer',
      'Status',
      'Globale Rolle',
      'Member-Profil',
      'Gruppenmitgliedschaften',
      'Offene Claims',
      'Letzte Aktivität',
      'Aktionen',
    ]

    // Scoped auf die echten Tabellen-Spaltenköpfe (role="columnheader"), nicht auf
    // beliebigen Seitentext -- "Globale Rolle" kommt sowohl im Rollen-Filter-Label
    // als auch als Tabellen-Spaltenkopf vor (beide D-04-konform benannt).
    await waitFor(() => {
      const headers = screen.getAllByRole('columnheader').map((el) => el.textContent)
      for (const column of expectedColumns) {
        expect(headers).toContain(column)
      }
    })
  })

  // --- renders_filter_elements ---
  //
  // Prüft, dass die Filteroberfläche die erforderlichen Elemente enthält:
  // - Select für Accountstatus (Alle Status / Aktiv / Deaktiviert)
  // - Select für Globale Rolle (Alle Rollen / Platform Admin)
  // - Suchfeld (Textfeld für Benutzersuche)
  it('renders_filter_elements', async () => {
    render(<AdminUsersPage />)

    // Mindestens ein Select-Element für Status-Filter muss vorhanden sein
    await waitFor(() => {
      // Suche nach dem Statusfilter-Label oder -Platzhalter
      const statusFilterLabel = screen.queryByText(/Accountstatus|Alle Status|Status filtern/i)
      expect(statusFilterLabel).not.toBeNull()
    })

    // Mindestens ein Suchfeld muss vorhanden sein
    await waitFor(() => {
      const searchInput = screen.queryByRole('searchbox') ?? screen.queryByPlaceholderText(/Benutzer suchen|Suche/i)
      expect(searchInput).not.toBeNull()
    })
  })

  // --- clicking_row_navigates_to_detail_route (ersetzt clicking_row_opens_drawer,
  //     clicking_row_keeps_table_visible_on_desktop) ---
  //
  // Prüft, dass ein Klick auf eine Tabellenzeile zur Detailroute navigiert
  // (via router.push), statt lokalen Drawer-/Tab-State zu setzen. Kein
  // Drawer-/Tab-Inhalt (Übersicht, role="tablist") erscheint zusätzlich zur Tabelle.
  it('clicking_row_navigates_to_detail_route', async () => {
    render(<AdminUsersPage />)

    // Warte auf Laden der Benutzerliste
    await waitFor(() => {
      expect(screen.queryByText('Aki')).not.toBeNull()
    })

    // Klick auf die Tabellenzeile
    const row = screen.getByText('Aki').closest('tr') ?? screen.getByText('Aki')
    fireEvent.click(row)

    // Navigation zur Detailroute wurde ausgelöst (leerer Such-String → kein from=)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/users/1')
    })

    // Kein Drawer-/Tab-Inhalt zusätzlich zur Tabelle
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryAllByText('Übersicht').length).toBe(0)
  })
})
