// @vitest-environment jsdom
//
// Plan 138-15 (D-03): UserDetailPageClient nutzt jetzt Tabs (6 locked Tabs:
// Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen)
// statt der vorherigen 9-Item-Accordion. Testet Lazy-Load-on-first-open (kein
// Doppel-Fetch beim erneuten Aktivieren), ?tab=-URL-Sync (router.replace) und
// die Zurück-Link-Logik unverändert aus der Vorgängerversion.
//
// Mockt alle 8 verbleibenden Tab-Komponenten (UserGroupMembershipsTab wird von
// dieser Seite nicht mehr importiert -- ihr Inhalt ist in UserGroupRightsTab
// absorbiert, D-03), damit ausschließlich die Tabs-Host-Logik getestet wird.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect } from 'react'

// --- next/navigation: pro Testfall überschreibbare Mocks ---

const mockUseParams = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn())
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/users/1'))
const mockReplace = vi.hoisted(() => vi.fn())
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => mockUsePathname(),
  useRouter: () => mockUseRouter(),
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

// --- 8 Tab-Komponenten gemockt, je mit eigenem Lade-Zähler ---

const loadCounters = vi.hoisted(() => ({
  overview: vi.fn(),
  roles: vi.fn(),
  'group-rights': vi.fn(),
  claims: vi.fn(),
  contributions: vi.fn(),
  media: vi.fn(),
  audit: vi.fn(),
  streaming: vi.fn(),
}) as Record<string, ReturnType<typeof vi.fn>>)

// Lade-Zähler feuern via useEffect (mount-only, leeres Deps-Array) statt im
// Render-Body -- genau wie die echten Tab-Komponenten ihren Datenabruf per
// useEffect auf Mount auslösen.
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
// Objekt konstruiert.
function setNav({ id = '1', from, tab }: { id?: string; from?: string; tab?: string } = {}) {
  mockUseParams.mockReturnValue({ id })
  // 'from' liegt hier bereits roh kodiert vor (so wie er tatsächlich hinter
  // `?from=` in der Adressleiste steht) -- daher per String-Konkatenation in
  // die Roh-Query-String-Position setzen, statt über URLSearchParams.set
  // (das würde ein bereits kodiertes '%3D' erneut kodieren -> Doppelkodierung).
  const rawParts: string[] = []
  if (from !== undefined) rawParts.push(`from=${from}`)
  if (tab !== undefined) rawParts.push(`tab=${tab}`)
  const url = new URL(`http://localhost/admin/users/${id}${rawParts.length ? `?${rawParts.join('&')}` : ''}`)
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

    expect(backHref).toBe(`/admin/users?${originalQuery}`)

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

  // --- D-03: real Tabs, all six locked labels present ---
  it('rendert die sechs D-03-Tabs mit dem locked Wortlaut', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    expect(screen.getByRole('tablist')).not.toBeNull()
    for (const label of ['Übersicht', 'Rollen & Rechte', 'Beiträge', 'Claims', 'Streaming', 'Änderungen']) {
      expect(screen.getByRole('tab', { name: label })).not.toBeNull()
    }
  })

  // --- default: only overview tab loaded on mount ---
  it('lädt beim Mount nur den Übersicht-Tab, die übrigen erst lazy beim ersten Öffnen', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    expect(loadCounters.overview).toHaveBeenCalledTimes(1)
    expect(loadCounters.roles).not.toHaveBeenCalled()
    expect(loadCounters.claims).not.toHaveBeenCalled()
    expect(loadCounters.streaming).not.toHaveBeenCalled()
    expect(loadCounters.audit).not.toHaveBeenCalled()
  })

  // --- clicking a tab lazy-loads it exactly once, no refetch on reselect ---
  it('lädt einen Tab beim ersten Klick genau einmal und nicht erneut beim Zurückwechseln', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    const claimsTab = screen.getByRole('tab', { name: 'Claims' })
    fireEvent.click(claimsTab)
    await screen.findByTestId('tab-claims')
    expect(loadCounters.claims).toHaveBeenCalledTimes(1)

    // Zurückwechseln zu Übersicht versteckt den Claims-Tab nur (per `hidden`,
    // via `keepMountedIds` an Tabs) statt ihn zu unmontieren -- daher bleibt
    // das Element im DOM, wird aber ausgeblendet (kein zweiter Fetch beim
    // erneuten Öffnen möglich).
    const overviewTab = screen.getByRole('tab', { name: 'Übersicht' })
    fireEvent.click(overviewTab)
    await waitFor(() => {
      expect(screen.getByTestId('tab-claims').closest('[role="tabpanel"]')).toHaveProperty('hidden', true)
    })

    fireEvent.click(claimsTab)
    await waitFor(() => {
      expect(screen.getByTestId('tab-claims').closest('[role="tabpanel"]')).toHaveProperty('hidden', false)
    })
    expect(loadCounters.claims).toHaveBeenCalledTimes(1)
  })

  // --- D-30: Streaming tab renders the real (unchanged) UserStreamingGrantsTab ---
  it('rendert den unveränderten Streaming-Tab-Inhalt (D-30)', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    fireEvent.click(screen.getByRole('tab', { name: 'Streaming' }))
    await screen.findByTestId('tab-streaming')
    expect(loadCounters.streaming).toHaveBeenCalledTimes(1)
  })

  // --- Rollen & Rechte composes both global roles and group rights ---
  it('"Rollen & Rechte" komponiert Globale Rollen und Gruppenrechte gemeinsam', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    fireEvent.click(screen.getByRole('tab', { name: 'Rollen & Rechte' }))
    await screen.findByTestId('tab-group-rights')
    expect(screen.getByTestId('tab-roles')).not.toBeNull()
    expect(loadCounters.roles).toHaveBeenCalledTimes(1)
    expect(loadCounters['group-rights']).toHaveBeenCalledTimes(1)
  })

  // --- Beiträge composes contributions and media ---
  it('"Beiträge" komponiert UserContributionsTab und UserMediaTab gemeinsam', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    fireEvent.click(screen.getByRole('tab', { name: 'Beiträge' }))
    await screen.findByTestId('tab-contributions')
    expect(screen.getByTestId('tab-media')).not.toBeNull()
  })

  // --- ?tab= URL sync: clicking a tab pushes tab= via router.replace ---
  it('synchronisiert den aktiven Tab über ?tab= via router.replace', async () => {
    setNav()
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-overview')

    fireEvent.click(screen.getByRole('tab', { name: 'Claims' }))
    await screen.findByTestId('tab-claims')

    expect(mockReplace).toHaveBeenCalled()
    const calledWith = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledWith).toContain('tab=claims')
  })

  // --- ?tab= from query on initial mount ---
  it('startet mit dem in der URL vorbelegten Tab (?tab=changes)', async () => {
    setNav({ tab: 'changes' })
    mockGetAdminUserOverview.mockResolvedValue(baseOverview)

    render(<UserDetailPageClient />)
    await screen.findByTestId('tab-audit')

    expect(loadCounters.audit).toHaveBeenCalledTimes(1)
    expect(loadCounters.overview).not.toHaveBeenCalled()
  })
})
