// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 104-04 (D-06/D-08/D-09): /me/contributions must gate on the own-profile
// has_member_profile + has_project_assignments aggregate — not on the contributions
// endpoint alone — and redirect any authenticated non-entitled account to /me/profile
// without a claim/error intermediate.

const routerReplaceMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())
const getOwnProfileMock = vi.hoisted(() => vi.fn())
const getMyAnimeContributionsMock = vi.hoisted(() => vi.fn())
const getMyMembershipsMock = vi.hoisted(() => vi.fn())
const confirmAnimeContributionMock = vi.hoisted(() => vi.fn())
const rejectAnimeContributionWithReasonMock = vi.hoisted(() => vi.fn())

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
  useRouter: () => ({ replace: routerReplaceMock }),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  getMyAnimeContributions: (...args: unknown[]) => getMyAnimeContributionsMock(...args),
  getMyMemberships: (...args: unknown[]) => getMyMembershipsMock(...args),
  confirmAnimeContribution: (...args: unknown[]) => confirmAnimeContributionMock(...args),
  rejectAnimeContributionWithReason: (...args: unknown[]) => rejectAnimeContributionWithReasonMock(...args),
}))

vi.mock('@/components/contributions/ContributionInbox', () => ({
  ContributionInbox: () => <div data-testid="contribution-inbox" />,
}))
vi.mock('@/components/contributions/ContributionSummary', () => ({
  ContributionSummary: () => <div data-testid="contribution-summary" />,
}))
vi.mock('@/components/contributions/MyContributionsSection', () => ({
  MyContributionsSection: () => <div data-testid="my-contributions-section" />,
}))
vi.mock('@/components/contributions/MyProposalsSection', () => ({
  MyProposalsSection: () => <div data-testid="my-proposals-section" />,
}))
vi.mock('@/components/contributions/RejectReasonModal', () => ({
  RejectReasonModal: () => null,
}))

import MyContributionsPage from './page'

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
      has_member_profile: true,
      has_project_assignments: true,
      account_display_name: 'Mika Member',
      fansub_name: 'MikaFX',
      email: 'mika@example.local',
      memberships: [],
      ...overrides,
    },
  }
}

beforeEach(() => {
  mockAuthSession()
  getOwnProfileMock.mockResolvedValue(makeProfileResponse())
  getMyAnimeContributionsMock.mockResolvedValue({ data: [] })
  getMyMembershipsMock.mockResolvedValue({ data: [] })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MyContributionsPage eligibility gate (Phase 104-04)', () => {
  it('shows neutral loading before the client session is initialized', () => {
    mockAuthSession({ initialized: false, access: false, refresh: false })

    render(<MyContributionsPage />)

    expect(screen.getByText('Projekt-Hinweise werden geladen')).not.toBeNull()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('shows the established login gate for an anonymous visitor, never a redirect', async () => {
    mockAuthSession({ access: false, refresh: false })

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Anmeldung erforderlich')).not.toBeNull()
    })

    expect(screen.getByRole('link', { name: /Zur Anmeldung/i }).getAttribute('href')).toBe('/login')
    expect(getOwnProfileMock).not.toHaveBeenCalled()
    expect(routerReplaceMock).not.toHaveBeenCalled()
  })

  it('renders the dashboard for an eligible verified Member with a real project assignment', async () => {
    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('my-contributions-section')).not.toBeNull()
    })

    expect(screen.getByTestId('contribution-inbox')).not.toBeNull()
    expect(screen.getByTestId('my-proposals-section')).not.toBeNull()
    expect(routerReplaceMock).not.toHaveBeenCalled()
    expect(getMyAnimeContributionsMock).toHaveBeenCalledTimes(1)
  })

  it('redirects an authenticated account without any member profile straight to Mein Account, no claim/error intermediate', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      member_id: 0,
      has_member_profile: false,
      has_project_assignments: false,
    }))

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/me/profile')
    })

    expect(routerReplaceMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Anmeldung erforderlich')).toBeNull()
    expect(screen.queryByText('Projekt-Hinweise konnten nicht geladen werden')).toBeNull()
    expect(screen.queryByTestId('my-contributions-section')).toBeNull()
    // Never loads the contributions dashboard for a non-entitled account.
    expect(getMyAnimeContributionsMock).not.toHaveBeenCalled()
  })

  it('redirects a verified Member without any real project assignment (has_member_profile alone is insufficient, D-06/D-09)', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      has_member_profile: true,
      has_project_assignments: false,
    }))

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/me/profile')
    })

    expect(routerReplaceMock).toHaveBeenCalledTimes(1)
    expect(getMyAnimeContributionsMock).not.toHaveBeenCalled()
  })

  it('does not loop the redirect — router.replace is called exactly once', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({ has_project_assignments: false }))

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledTimes(1)
    })

    // Give any stray re-render/effect a chance to fire before asserting it stayed at 1.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(routerReplaceMock).toHaveBeenCalledTimes(1)
  })

  it('shows a scoped retry error (not a login prompt) for a real network/5xx failure on an eligible session', async () => {
    getMyAnimeContributionsMock.mockRejectedValue(new MockApiError(500, 'interner serverfehler'))

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Projekt-Hinweise konnten nicht geladen werden')).not.toBeNull()
    })

    expect(screen.queryByRole('link', { name: /Zur Anmeldung/i })).toBeNull()
    const retryButton = screen.getByRole('button', { name: /Erneut versuchen/i })
    expect(retryButton).not.toBeNull()
    expect(routerReplaceMock).not.toHaveBeenCalled()
  })

  it('recovers from a real failure via the retry action', async () => {
    getMyAnimeContributionsMock.mockRejectedValueOnce(new MockApiError(500, 'interner serverfehler'))

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Erneut versuchen/i })).not.toBeNull()
    })

    getMyAnimeContributionsMock.mockResolvedValueOnce({ data: [] })
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/i }))

    await waitFor(() => {
      expect(screen.getByTestId('my-contributions-section')).not.toBeNull()
    })

    expect(getOwnProfileMock).toHaveBeenCalledTimes(2)
  })

  it('redirects defensively when the contributions load itself returns MEMBER_PROFILE_REQUIRED', async () => {
    getMyAnimeContributionsMock.mockRejectedValue(new MockApiError(403, 'kein verifizierter Member-Account verknüpft', 'MEMBER_PROFILE_REQUIRED'))

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/me/profile')
    })

    expect(screen.queryByText('Projekt-Hinweise konnten nicht geladen werden')).toBeNull()
  })

  it('loads through a refresh-only session (no access token, only a refresh token) via the central API client', async () => {
    mockAuthSession({ access: false, refresh: true })

    render(<MyContributionsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('my-contributions-section')).not.toBeNull()
    })

    expect(getOwnProfileMock).toHaveBeenCalledTimes(1)
    expect(routerReplaceMock).not.toHaveBeenCalled()
  })
})
