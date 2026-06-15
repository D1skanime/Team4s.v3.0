// @vitest-environment jsdom
//
// Wave-0 RED-Tests: UserClaimsTab.tsx existiert noch nicht.
// Importfehler auf die Komponente sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-05 den UserClaimsTab implementiert.
//
// Entscheidung J (D-J): profile_status ist read-only; Gedenkprofil-Badge wird angezeigt;
// kein Edit-/Mutations-Control im Claims-Tab.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { AdminUserMemberClaimsResponse } from '@/types/admin-users'

// --- Mock für API-Calls ---

const mockGetAdminUserMemberClaims = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserMemberClaims: (...args: unknown[]) => mockGetAdminUserMemberClaims(...args),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

// RED: UserClaimsTab.tsx existiert noch nicht → Importfehler erwartet
import { UserClaimsTab } from './UserClaimsTab'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Hilfsfunktion: Mock-Response mit Gedenkprofil
function makeMemorialResponse(): AdminUserMemberClaimsResponse {
  return {
    member_profile: {
      member_id: 99,
      fansub_name: 'Sakura-Fansub',
      profile_status: 'memorial',
      avatar_url: null,
    },
    claims: [
      {
        claim_id: 1,
        claim_type: 'verified',
        claim_status: 'active',
        member_id: 99,
        fansub_name: 'Sakura-Fansub',
        created_at: '2024-01-15T00:00:00Z',
        resolved_at: null,
      },
    ],
  }
}

// Hilfsfunktion: Mock-Response mit aktiven Profil
function makeActiveProfileResponse(): AdminUserMemberClaimsResponse {
  return {
    member_profile: {
      member_id: 7,
      fansub_name: 'Team Naruto',
      profile_status: 'active',
      avatar_url: null,
    },
    claims: [],
  }
}

describe('UserClaimsTab', () => {
  // --- RED: renders_memorial_badge_when_profile_status_is_memorial ---
  //
  // Prüft, dass der Claims-Tab ein "Gedenkprofil"-Badge anzeigt,
  // wenn member_profile.profile_status === 'memorial'.
  // Entscheidung J: Gedenkprofil-Kontext muss sichtbar sein, um Verwechslungen zu vermeiden.
  it('renders_memorial_badge_when_profile_status_is_memorial', async () => {
    mockGetAdminUserMemberClaims.mockResolvedValueOnce(makeMemorialResponse())

    render(<UserClaimsTab userId={1} />)

    await waitFor(() => {
      // Der Badge-Text "Gedenkprofil" muss sichtbar sein
      expect(screen.getByText('Gedenkprofil')).not.toBeNull()
    })
  })

  // --- RED: claims_tab_has_no_edit_or_mutation_controls ---
  //
  // Prüft, dass der Claims-Tab ausschliesslich read-only ist:
  // - Kein Button mit Text "Bearbeiten"
  // - Kein Button mit Text "Verifizieren"
  // - Kein Button mit Text "Entziehen"
  // - Kein Button mit Text "Ablehnen"
  // - Kein Button mit Text "Status ändern"
  //
  // Entscheidung J: profile_status ist im Admin-Drawer nicht editierbar.
  // Auch Claims-Mutationen (Verifizieren/Ablehnen) sind im globalen User-Drawer
  // nicht vorgesehen — sie gehören in die fansub-spezifische Claim-Verwaltung.
  it('claims_tab_has_no_edit_or_mutation_controls', async () => {
    mockGetAdminUserMemberClaims.mockResolvedValueOnce(makeActiveProfileResponse())

    render(<UserClaimsTab userId={1} />)

    // Warte auf Laden der Daten
    await waitFor(() => {
      // Sicherstellen, dass die Komponente gerendert hat (Profil oder Empty-State)
      // queryAllByText statt queryByText: mehrere Elemente möglich (SectionHeader + Profil-Text)
      const contents = screen.queryAllByText(/Team Naruto|Member-Profil|Keine Einträge/)
      expect(contents.length).toBeGreaterThan(0)
    })

    // Prüfe Abwesenheit aller Mutations-Controls
    expect(screen.queryByText('Bearbeiten')).toBeNull()
    expect(screen.queryByText('Verifizieren')).toBeNull()
    expect(screen.queryByText('Entziehen')).toBeNull()
    expect(screen.queryByText('Ablehnen')).toBeNull()
    expect(screen.queryByText('Status ändern')).toBeNull()
  })

  // --- Zusatz: kein Gedenkprofil-Badge bei aktivem Profil ---
  //
  // Sicherheitstest: Bei profile_status='active' darf kein "Gedenkprofil"-Badge erscheinen.
  it('does_not_render_memorial_badge_for_active_profile', async () => {
    mockGetAdminUserMemberClaims.mockResolvedValueOnce(makeActiveProfileResponse())

    render(<UserClaimsTab userId={1} />)

    await waitFor(() => {
      const contents = screen.queryAllByText(/Team Naruto|Member-Profil|Keine Einträge/)
      expect(contents.length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('Gedenkprofil')).toBeNull()
  })
})
