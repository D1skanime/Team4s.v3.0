// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getOwnProfileMock = vi.hoisted(() => vi.fn())
const resolveApiUrlMock = vi.hoisted(() => vi.fn((value: string) => (value ? `resolved:${value}` : '')))
const useAuthSessionMock = vi.hoisted(() => vi.fn())
const usePathnameMock = vi.hoisted(() => vi.fn())
const appShellRenderMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock('@/lib/api', () => ({
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  resolveApiUrl: (...args: [string]) => resolveApiUrlMock(...args),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('./AppShell', () => ({
  AppShell: ({
    mode,
    currentPath,
    user,
    memberships,
    canAccessAdmin,
    hasMemberProfile,
    children,
  }: {
    mode: 'authenticated' | 'anonymous'
    currentPath?: string
    user?: { displayName?: string; email?: string; avatarUrl?: string } | null
    memberships?: Array<{
      fansub_group_id: number
      fansub_group_name: string
      fansub_group_slug: string
    }>
    canAccessAdmin?: boolean
    hasMemberProfile?: boolean
    children: ReactNode
  }) => {
    appShellRenderMock({ mode, currentPath, user, memberships, canAccessAdmin, hasMemberProfile })

    return (
      <div
        data-testid="app-shell"
        data-mode={mode}
        data-current-path={currentPath || ''}
        data-can-access-admin={String(Boolean(canAccessAdmin))}
        data-display-name={user?.displayName || ''}
        data-email={user?.email || ''}
        data-avatar-url={user?.avatarUrl || ''}
        data-membership-count={String(memberships?.length ?? 0)}
        data-has-member-profile={String(Boolean(hasMemberProfile))}
      >
        {children}
      </div>
    )
  },
}))

import { AppShellClientWrapper } from './AppShellClientWrapper'

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
      account_display_name: 'Mika Member',
      fansub_name: 'MikaFX',
      email: 'mika@example.local',
      avatar: {
        public_url: '/media/avatar/mika.png',
      },
      account_global_roles: [],
      memberships: [],
      ...overrides,
    },
  }
}

beforeEach(() => {
  usePathnameMock.mockReturnValue('/me/profile')
  mockAuthSession()
  getOwnProfileMock.mockResolvedValue(makeProfileResponse())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AppShellClientWrapper', () => {
  it('renders anonymous shell props without loading profile data when no auth session exists', async () => {
    mockAuthSession({ access: false, refresh: false })

    render(
      <AppShellClientWrapper>
        <main>Content</main>
      </AppShellClientWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('app-shell').getAttribute('data-mode')).toBe('anonymous')
    })

    expect(getOwnProfileMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('app-shell').getAttribute('data-can-access-admin')).toBe('false')
    expect(screen.getByTestId('app-shell').getAttribute('data-display-name')).toBe('')
  })

  it('maps profile data into token-free AppShell props for an authenticated member', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      account_global_roles: ['platform_admin'],
    }))

    render(
      <AppShellClientWrapper>
        <main>Content</main>
      </AppShellClientWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('app-shell').getAttribute('data-display-name')).toBe('Mika Member')
    })

    expect(screen.getByTestId('app-shell').getAttribute('data-mode')).toBe('authenticated')
    expect(screen.getByTestId('app-shell').getAttribute('data-current-path')).toBe('/me/profile')
    expect(screen.getByTestId('app-shell').getAttribute('data-email')).toBe('mika@example.local')
    expect(screen.getByTestId('app-shell').getAttribute('data-avatar-url')).toBe('resolved:/media/avatar/mika.png')
    expect(screen.getByTestId('app-shell').getAttribute('data-can-access-admin')).toBe('true')
    expect(screen.getByTestId('app-shell').getAttribute('data-has-member-profile')).toBe('true')
    expect(resolveApiUrlMock).toHaveBeenCalledWith('/media/avatar/mika.png')
  })

  it('passes account-only profile state to AppShell without member labeling', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      member_id: 0,
      has_member_profile: false,
      account_display_name: 'Phase Admin',
      fansub_name: '',
      avatar: null,
      memberships: [],
    }))

    render(
      <AppShellClientWrapper>
        <main>Content</main>
      </AppShellClientWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('app-shell').getAttribute('data-display-name')).toBe('Phase Admin')
    })

    expect(screen.getByTestId('app-shell').getAttribute('data-has-member-profile')).toBe('false')
    expect(screen.getByTestId('app-shell').getAttribute('data-membership-count')).toBe('0')
    expect(appShellRenderMock).toHaveBeenLastCalledWith(expect.objectContaining({ hasMemberProfile: false }))
  })

  it('passes memberships from getOwnProfile to AppShell without another request', async () => {
    const memberships = [
      { fansub_group_id: 42, fansub_group_name: 'Moon Subs', fansub_group_slug: 'moon-subs' },
      { fansub_group_id: 77, fansub_group_name: 'Kumo Fansubs', fansub_group_slug: 'kumo-fansubs' },
    ]
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({ memberships }))

    render(
      <AppShellClientWrapper>
        <main>Content</main>
      </AppShellClientWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('app-shell').getAttribute('data-membership-count')).toBe('2')
    })

    expect(appShellRenderMock).toHaveBeenLastCalledWith(expect.objectContaining({ memberships }))
    expect(getOwnProfileMock).toHaveBeenCalledTimes(1)
  })

  it('clears stale profile and admin props when the auth session disappears', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      account_global_roles: ['admin'],
    }))

    const { rerender } = render(
      <AppShellClientWrapper>
        <main>Content</main>
      </AppShellClientWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('app-shell').getAttribute('data-can-access-admin')).toBe('true')
    })

    mockAuthSession({ access: false, refresh: false })
    rerender(
      <AppShellClientWrapper>
        <main>Content</main>
      </AppShellClientWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('app-shell').getAttribute('data-mode')).toBe('anonymous')
    })

    expect(screen.getByTestId('app-shell').getAttribute('data-can-access-admin')).toBe('false')
    expect(screen.getByTestId('app-shell').getAttribute('data-display-name')).toBe('')
    expect(getOwnProfileMock).toHaveBeenCalledTimes(1)
  })
})
