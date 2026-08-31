// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 116-06 (D-01/D-09): /me/dashboard composes all five Phase 116 sections behind a
// single Promise.all parallel fetch and MUST NEVER redirect/eligibility-gate -- unlike
// /me/contributions, every authenticated user reaches the fully composed page below,
// regardless of has_member_profile/has_project_assignments.

const routerReplaceMock = vi.hoisted(() => vi.fn())
const routerPushMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())
const getOwnProfileMock = vi.hoisted(() => vi.fn())
const getMyAnimeContributionsMock = vi.hoisted(() => vi.fn())
const getOwnDashboardMock = vi.hoisted(() => vi.fn())

const MockApiError = vi.hoisted(() => {
  return class MockApiError extends Error {
    status: number
    code: string | null
    constructor(status: number, message: string, code: string | null = null) {
      super(message)
      this.status = status
      this.code = code
    }
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: routerPushMock }),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  getMyAnimeContributions: (...args: unknown[]) => getMyAnimeContributionsMock(...args),
  getOwnDashboard: (...args: unknown[]) => getOwnDashboardMock(...args),
}))

vi.mock('./components/AttentionSection', () => ({
  AttentionSection: () => <div data-testid="section-attention" />,
}))
vi.mock('./components/DashboardMetrics', () => ({
  DashboardMetrics: () => <div data-testid="section-metrics" />,
}))
vi.mock('./components/CategoryProgressTable', () => ({
  CategoryProgressTable: () => <div data-testid="section-category-progress" />,
}))
vi.mock('./components/MyGroupsSection', () => ({
  MyGroupsSection: () => <div data-testid="section-my-groups" />,
}))
vi.mock('./components/QuickLinksSection', () => ({
  QuickLinksSection: () => <div data-testid="section-quick-links" />,
}))

import DashboardPage from './page'

function mockAuthSession({
  initialized = true,
  access = true,
  refresh = false,
}: {
  initialized?: boolean
  access?: boolean
  refresh?: boolean
} = {}) {
  useAuthSessionMock.mockReturnValue({
    authToken: '',
    hasAccessToken: access,
    hasRefreshToken: refresh,
    displayName: access || refresh ? 'Member' : '',
    isClientInitialized: initialized,
  })
}

function makeProfileResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      member_id: 4,
      has_member_profile: false,
      has_project_assignments: false,
      account_display_name: 'Mika Member',
      fansub_name: 'MikaFX',
      memberships: [],
      ...overrides,
    },
  }
}

function makeDashboardResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      has_member_profile: false,
      total_points: 0,
      badges_count: 0,
      projects_count: 0,
      images_count: 0,
      contributions_count: 0,
      role_volume: [],
      category_progress: [],
    pending_claims: [],
      ...overrides,
    },
  }
}

beforeEach(() => {
  mockAuthSession()
  getOwnProfileMock.mockResolvedValue(makeProfileResponse())
  getMyAnimeContributionsMock.mockResolvedValue({ data: [] })
  getOwnDashboardMock.mockResolvedValue(makeDashboardResponse())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DashboardPage (Phase 116-06, D-01/D-09)', () => {
  it('shows the exact UI-SPEC loading copy before the client session is initialized', () => {
    mockAuthSession({ initialized: false, access: false, refresh: false })

    render(<DashboardPage />)

    expect(screen.getByText('Dein Dashboard wird geladen')).not.toBeNull()
    expect(
      screen.getByText('Kennzahlen, Fortschritt und Gruppen werden zusammengestellt.'),
    ).not.toBeNull()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('renders for an authenticated user with NO member profile and NO project assignments -- no redirect, all five sections in order (D-09)', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('section-attention')).not.toBeNull()
    })

    const testIds = Array.from(
      document.querySelectorAll('[data-testid^="section-"]'),
    ).map((element) => element.getAttribute('data-testid'))

    expect(testIds).toEqual([
      'section-attention',
      'section-metrics',
      'section-category-progress',
      'section-my-groups',
      'section-quick-links',
    ])

    expect(screen.getByText('Dashboard')).not.toBeNull()
    expect(screen.getByText('Mein Bereich')).not.toBeNull()

    // The single most important D-09 assertion: never a redirect/navigation call.
    expect(routerReplaceMock).not.toHaveBeenCalled()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('invokes all three data sources exactly once each inside one parallel fetch, never sequentially', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('section-attention')).not.toBeNull()
    })

    expect(getOwnProfileMock).toHaveBeenCalledTimes(1)
    expect(getMyAnimeContributionsMock).toHaveBeenCalledTimes(1)
    expect(getOwnDashboardMock).toHaveBeenCalledTimes(1)
  })

  it('renders the ErrorState with the exact UI-SPEC copy when any of the three fetches rejects, never a redirect', async () => {
    getOwnDashboardMock.mockRejectedValue(new MockApiError(500, 'interner serverfehler'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard konnte nicht geladen werden')).not.toBeNull()
    })

    expect(
      screen.getByText(
        'Deine Dashboard-Daten konnten nicht geladen werden. Bitte lade die Seite neu oder versuche es später erneut.',
      ),
    ).not.toBeNull()
    expect(screen.queryByTestId('section-attention')).toBeNull()
    expect(routerReplaceMock).not.toHaveBeenCalled()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('recovers from a load failure via the retry action without ever redirecting', async () => {
    getOwnDashboardMock.mockRejectedValueOnce(new MockApiError(500, 'interner serverfehler'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Erneut versuchen/i })).not.toBeNull()
    })

    getOwnDashboardMock.mockResolvedValueOnce(makeDashboardResponse())
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/i }))

    await waitFor(() => {
      expect(screen.getByTestId('section-attention')).not.toBeNull()
    })

    expect(routerReplaceMock).not.toHaveBeenCalled()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('renders for an authenticated user WITH a member profile and project assignments identically -- section composition never depends on eligibility fields', async () => {
    getOwnProfileMock.mockResolvedValue(
      makeProfileResponse({ has_member_profile: true, has_project_assignments: true }),
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('section-attention')).not.toBeNull()
    })

    expect(screen.getByTestId('section-metrics')).not.toBeNull()
    expect(screen.getByTestId('section-category-progress')).not.toBeNull()
    expect(screen.getByTestId('section-my-groups')).not.toBeNull()
    expect(screen.getByTestId('section-quick-links')).not.toBeNull()
    expect(routerReplaceMock).not.toHaveBeenCalled()
    expect(routerPushMock).not.toHaveBeenCalled()
  })
})
