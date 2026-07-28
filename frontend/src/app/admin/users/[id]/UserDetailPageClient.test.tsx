// @vitest-environment jsdom
//
// Plan 111-02, Task 1 (RED): UserDetailPageClient.tsx existiert noch nicht.
// Importfehler auf './UserDetailPageClient' ist das erwartete RED-Signal.
//
// Mockt alle 9 Tab-Komponenten, damit ausschließlich die Accordion-Host-Logik
// (Default-Open, Lazy-Load/Cache, Zurück-Link) getestet wird — nicht die echten
// Tab-Implementierungen.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

// --- next/navigation: pro Testfall überschreibbare Mocks ---

const mockUseParams = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useSearchParams: () => mockUseSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// --- @/lib/api ---

const mockGetAdminUserOverview = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', () => ({
  getAdminUserOverview: mockGetAdminUserOverview,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

// --- 9 Tab-Komponenten gemockt, je mit eigenem Lade-Zähler ---

const loadCounters = vi.hoisted(() => ({
  overview: vi.fn(),
  roles: vi.fn(),
  memberships: vi.fn(),
  'group-rights': vi.fn(),
  claims: vi.fn(),
  contributions: vi.fn(),
  media: vi.fn(),
  audit: vi.fn(),
  streaming: vi.fn(),
}) as Record<string, ReturnType<typeof vi.fn>>)

// Lade-Zähler feuern via useEffect (mount-only, leeres Deps-Array) statt im
// Render-Body — genau wie die echten Tab-Komponenten ihren Datenabruf per
// useEffect auf Mount auslösen. Ein reiner Render-Body-Call würde auch bei
// zusätzlichen Re-Renders (ohne echtes Unmount/Remount) mitzählen und einen
// falschen Re-Fetch vortäuschen (siehe 111-02-SUMMARY.md Deviation).
vi.mock('../tabs/UserOverviewTab', () => ({
  UserOverviewTab: () => {
    useEffect(() => {
      loadCounters.overview()
    }, [])
    return <div data-testid="tab-overview">overview</div>
  },
}))
vi.mock('../tabs/UserGlobalRolesTab', () => ({
  UserGlobalRolesTab: () => {
    useEffect(() => {
      loadCounters.roles()
    }, [])
    return <div data-testid="tab-roles">roles</div>
  },
}))
vi.mock('../tabs/UserGroupMembershipsTab', () => ({
  UserGroupMembershipsTab: () => {
    useEffect(() => {
      loadCounters.memberships()
    }, [])
    return <div data-testid="tab-memberships">memberships</div>
  },
}))
vi.mock('../tabs/UserGroupRightsTab', () => ({
  UserGroupRightsTab: () => {
    useEffect(() => {
      loadCounters['group-rights']()
    }, [])
    return <div data-testid="tab-group-rights">group-rights</div>
  },
}))
vi.mock('../tabs/UserClaimsTab', () => ({
  UserClaimsTab: () => {
    useEffect(() => {
      loadCounters.claims()
    }, [])
    return <div data-testid="tab-claims">claims</div>
  },
}))
vi.mock('../tabs/UserContributionsTab', () => ({
  UserContributionsTab: () => {
    useEffect(() => {
      loadCounters.contributions()
    }, [])
    return <div data-testid="tab-contributions">contributions</div>
  },
}))
vi.mock('../tabs/UserMediaTab', () => ({
  UserMediaTab: () => {
    useEffect(() => {
      loadCounters.media()
    }, [])
    return <div data-testid="tab-media">media</div>
  },
}))
vi.mock('../tabs/UserAuditTab', () => ({
  UserAuditTab: () => {
    useEffect(() => {
      loadCounters.audit()
    }, [])
    return <div data-testid="tab-audit">audit</div>
  },
}))
vi.mock('../tabs/UserStreamingGrantsTab', () => ({
  UserStreamingGrantsTab: () => {
    useEffect(() => {
      loadCounters.streaming()
    }, [])
    return <div data-testid="tab-streaming">streaming</div>
  },
}))

import { UserDetailPageClient } from './UserDetailPageClient'

const baseOverview = {
  id: 1,
  email: 'aki@example.com',
  display_name: 'Aki',
  status: 'active' as const,
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
}

// Baut das Mock wie eine echte, bereits prozentkodierte Browser-URL nach:
// `from` wird hier als bereits kodierter Roh-Query-String übergeben (also so,
// wie er tatsächlich hinter `?from=` in der Adressleiste steht) und via
// `new URL(...)` geparst statt per `new URLSearchParams({ from })` aus einem
// Objekt konstruiert. Ein Objekt-Konstruktor würde den Wert unverändert
// übernehmen und damit die reale, von `useSearchParams()` selbst bereits
// durchgeführte Dekodierstufe verschlucken (siehe CR-01/WR-03 in 111-REVIEW.md).
function setNav({ id = '1', from }: { id?: string; from?: string } = {}) {
  mockUseParams.mockReturnValue({ id })
  if (from === undefined) {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    return
  }
  const url = new URL(`http://localhost/admin/users/${id}?from=${from}`)
  mockUseSearchParams.mockReturnValue(url.searchParams)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserDetailPageClient', () => {
  // --- back link ---
  it('back link', async () => {
    setNav({ from: 'q%3Dabc%26status%3Dactive' })
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    const backLink = screen.getByRole('link', { name: /Zurück zur Liste/i })
    expect(backLink.getAttribute('href')).toBe('/admin/users?q=abc&status=active')
  })

  // --- back link roundtrips '+'/percent-encoded search values (D-06, CR-01) ---
  it('back link roundtrips special characters in search query', async () => {
    // Baut exakt den Produktionscodepfad nach (AdminUsersClient.tsx:103-104):
    // 1. `originalQuery` ist der bereits von URLSearchParams selbst kodierte
    //    Query-String der Liste (`+` in der Suche -> `%2B`, `@` -> `%40`).
    // 2. `from` in der URL ist `encodeURIComponent(originalQuery)` (doppelt kodiert).
    const originalQuery = new URLSearchParams({
      q: 'user+test@test.com',
      status: 'active',
    }).toString()
    expect(originalQuery).toBe('q=user%2Btest%40test.com&status=active')

    setNav({ from: encodeURIComponent(originalQuery) })
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    const backLink = screen.getByRole('link', { name: /Zurück zur Liste/i })
    const backHref = backLink.getAttribute('href')

    // Der Zurück-Link muss exakt den ursprünglichen, einmal kodierten
    // Query-String wiederherstellen -- keine zusätzliche Dekodierstufe.
    expect(backHref).toBe(`/admin/users?${originalQuery}`)

    // Und beim erneuten Parsen auf /admin/users muss der Suchbegriff exakt
    // (inkl. '+') erhalten bleiben, statt zu einem Leerzeichen korrumpiert zu
    // werden (Kernregression aus CR-01).
    const reparsed = new URLSearchParams(backHref!.split('?')[1])
    expect(reparsed.get('q')).toBe('user+test@test.com')
  })

  // --- no from param fallback ---
  it('no from param fallback', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    const backLink = screen.getByRole('link', { name: /Zurück zur Liste/i })
    expect(backLink.getAttribute('href')).toBe('/admin/users')
  })

  // --- no tablist ---
  it('no tablist', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    expect(screen.queryAllByRole('tab')).toEqual([])
    expect(screen.queryAllByRole('tablist')).toEqual([])
  })

  // --- default open sections ---
  it('default open sections', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    const openLabels = ['Übersicht', 'Globale Rollen', 'Gruppenmitgliedschaften', 'Gruppenrechte']
    const closedLabels = ['Member-Profil & Claims', 'Beiträge', 'Medien', 'Audit', 'Streaming']

    for (const label of openLabels) {
      const header = screen.getByRole('button', { name: label })
      expect(header.getAttribute('aria-expanded')).toBe('true')
    }
    for (const label of closedLabels) {
      const header = screen.getByRole('button', { name: label })
      expect(header.getAttribute('aria-expanded')).toBe('false')
    }

    expect(screen.getByTestId('tab-overview')).not.toBeNull()
    expect(screen.getByTestId('tab-roles')).not.toBeNull()
    expect(screen.getByTestId('tab-memberships')).not.toBeNull()
    expect(screen.getByTestId('tab-group-rights')).not.toBeNull()

    expect(screen.queryByTestId('tab-claims')).toBeNull()
    expect(screen.queryByTestId('tab-contributions')).toBeNull()
    expect(screen.queryByTestId('tab-media')).toBeNull()
    expect(screen.queryByTestId('tab-audit')).toBeNull()
    expect(screen.queryByTestId('tab-streaming')).toBeNull()
  })

  // --- no refetch on reopen ---
  it('no refetch on reopen', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    const claimsHeader = screen.getByRole('button', { name: 'Member-Profil & Claims' })

    // 1. Öffnen: Sektion wird erstmals geladen (gemountet)
    fireEvent.click(claimsHeader)
    await waitFor(() => expect(claimsHeader.getAttribute('aria-expanded')).toBe('true'))
    expect(screen.getByTestId('tab-claims')).not.toBeNull()
    expect(loadCounters.claims).toHaveBeenCalledTimes(1)

    // 2. Schließen: Panel bleibt (via keepMountedIds) im DOM, nur visuell
    //    versteckt — kein Unmount, daher auch kein erneuter Ladeaufruf möglich.
    fireEvent.click(claimsHeader)
    await waitFor(() => expect(claimsHeader.getAttribute('aria-expanded')).toBe('false'))

    // 3. Wiederöffnen: kein zweiter Ladeaufruf (Pitfall 3)
    fireEvent.click(claimsHeader)
    await waitFor(() => expect(claimsHeader.getAttribute('aria-expanded')).toBe('true'))
    expect(loadCounters.claims).toHaveBeenCalledTimes(1)
  })
})
