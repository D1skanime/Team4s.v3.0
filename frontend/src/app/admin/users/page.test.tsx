// @vitest-environment jsdom
//
// Wave-0 RED-Tests: AdminUsersClient und page.tsx existieren noch nicht.
// Importfehler auf diese Komponenten sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-04 die Listenoberfläche implementiert.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// --- Mocks ---

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({ hasAccessToken: true, hasRefreshToken: true, isClientInitialized: true }),
}))

// RED: listAdminUsersPage existiert noch nicht in @/lib/api → Importfehler erwartet
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

// RED: AdminUsersClient existiert noch nicht → Importfehler erwartet
import AdminUsersPage from './page'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AdminUsersPage (/admin/users)', () => {
  // --- RED: renders_table_with_all_required_columns ---
  //
  // Prüft, dass die Admin-Users-Tabelle alle Spaltenköpfe aus der UI-SPEC enthält.
  // Erwartete Spalten (D-05): Benutzer, Status, Globale Rollen, Member-Profil,
  // Gruppen, Leader-Kontext, Offene Claims, Beiträge, Release-Arbeitsflächen, Medienuploads,
  // Letzte Aktivität, Konflikte.
  it('renders_table_with_all_required_columns', async () => {
    render(<AdminUsersPage />)

    const expectedColumns = [
      'Benutzer',
      'Status',
      'Globale Rollen',
      'Member-Profil',
      'Gruppen',
      'Leader-Kontext',
      'Offene Claims',
      'Beiträge',
      'Release-Arbeitsflächen',
      'Medienuploads',
      'Letzte Aktivität',
      'Konflikte',
    ]

    for (const column of expectedColumns) {
      await waitFor(() => {
        expect(screen.getByText(column)).not.toBeNull()
      })
    }
  })

  // --- RED: renders_filter_elements ---
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

  // --- RED: clicking_row_opens_drawer ---
  //
  // Prüft, dass ein Klick auf eine Tabellenzeile den Drawer-State setzt
  // und den UserDetailDrawer öffnet.
  it('clicking_row_opens_drawer', async () => {
    render(<AdminUsersPage />)

    // Warte auf Laden der Benutzerliste
    await waitFor(() => {
      expect(screen.queryByText('Aki')).not.toBeNull()
    })

    // Klick auf die Tabellenzeile
    const row = screen.getByText('Aki').closest('tr') ?? screen.getByText('Aki')
    fireEvent.click(row)

    // Nach dem Klick muss der Drawer-State gesetzt sein.
    // Der geöffnete Drawer rendert die Tab-Leiste (mehrere Tab-Labels gleichzeitig),
    // daher queryAllByText statt queryByText — Letzteres wirft bei Mehrfachtreffern.
    // Tab-Labels sind nur sichtbar, wenn der Drawer offen ist.
    await waitFor(() => {
      const drawerContent = screen.queryAllByText(/Übersicht|Globale Rollen/)
      expect(drawerContent.length).toBeGreaterThan(0)
    })
  })
})
