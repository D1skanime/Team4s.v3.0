// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { MemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const refreshActiveAuthSessionMock = vi.fn()
const updateOwnProfileMock = vi.fn()
const uploadOwnProfileAvatarMock = vi.fn()
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
  }) => (
    <textarea
      aria-label="Meine Fansub-Geschichte Editor"
      placeholder={placeholder}
      value={typeof value === 'object' && value !== null ? JSON.stringify(value) : ''}
      onChange={(event) => onChange({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
      })}
    />
  ),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  API_AUTH_SESSION_TOKEN: 'runtime-auth',
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getAuthSessionSnapshot: () => ({ hasAccessToken: true, hasRefreshToken: true, displayName: 'Test User' }),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  refreshActiveAuthSession: (...args: unknown[]) => refreshActiveAuthSessionMock(...args),
  updateOwnProfile: (...args: unknown[]) => updateOwnProfileMock(...args),
  uploadOwnProfileAvatar: (...args: unknown[]) => uploadOwnProfileAvatarMock(...args),
  resolveApiUrl: (value: string) => value,
}))

import MyProfilePage from './page'

beforeEach(() => {
  useAuthSessionMock.mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: 'Mika',
    isClientInitialized: true,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeProfileResponse(overrides: Partial<MemberProfileResponse['data']> = {}): MemberProfileResponse {
  return {
    data: {
      member_id: 4,
      app_user_id: 11,
      legacy_user_id: 8,
      display_name: 'Mika',
      fansub_name: 'MikaFX',
      email: 'mika@example.com',
      keycloak_subject: 'kc-11',
      bio: 'Typesetting und QC.',
      member_story: 'Seit 2016 in mehreren Gruppen aktiv.',
      active_from_year: 2016,
      active_until_year: null,
      is_currently_active: true,
      profile_visibility: 'members_only',
      avatar: null,
      keycloak_account_url: 'http://localhost:8081/realms/team4s/account',
      capabilities: {
        can_view_own_profile: true,
        can_edit_own_profile: true,
        can_upload_own_avatar: true,
        can_open_keycloak_account: true,
        can_view_memberships: true,
        can_view_historical_credits: true,
      },
      memberships: [{
        fansub_group_id: 88,
        fansub_group_name: 'Phase Fansubs',
        fansub_group_slug: 'phase-fansubs',
        group_status: 'active',
        joined_year: 2016,
        left_year: null,
        app_member_status: 'active',
        app_member_roles: ['typesetter', 'quality_checker'],
        has_historical_link: true,
      }],
      historical_credits: [{
        fansub_group_id: 88,
        fansub_group_name: 'Phase Fansubs',
        role_name: 'typesetter',
        role_label: 'Typesetter',
        release_count: 12,
      }],
      created_at: '2026-05-17T10:00:00Z',
      updated_at: '2026-05-17T11:00:00Z',
      account_status: 'active',
      account_display_name: 'Mika',
      account_global_roles: ['user'],
      ...overrides,
    },
  }
}

describe('MyProfilePage', () => {
  it('loads the own profile route without admin naming leaks', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    expect(await screen.findByRole('heading', { name: 'Mein Profil' })).not.toBeNull()
    expect(screen.getByRole('link', { name: /Mein Profil/i }).getAttribute('href')).toBe('/me/profile')
    expect(screen.queryByText('/admin/profile')).toBeNull()
    expect(screen.queryByText(/Admin Content/i)).toBeNull()
    expect(screen.getByText('Meine Fansub-Geschichte')).not.toBeNull()
  })

  it('renders protected-route feedback without loading profile data when unauthenticated', async () => {
    useAuthSessionMock.mockReturnValue({
      authToken: '',
      hasAccessToken: false,
      hasRefreshToken: false,
      displayName: '',
      isClientInitialized: true,
    })

    render(<MyProfilePage />)

    expect(await screen.findByText('Anmeldung erforderlich')).not.toBeNull()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('renders aggregate load errors honestly', async () => {
    getOwnProfileMock.mockRejectedValue(new Error('Profil API nicht erreichbar'))

    render(<MyProfilePage />)

    expect(await screen.findByText('Profil konnte nicht geladen werden')).not.toBeNull()
    expect(screen.getByText('Profil API nicht erreichbar')).not.toBeNull()
  })

  it('saves edited Team4s profile fields and keeps account fields read-only', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    updateOwnProfileMock.mockResolvedValue(makeProfileResponse({ display_name: 'Mika Nova' }))

    render(<MyProfilePage />)

    const input = await screen.findByLabelText('Anzeigename')
    fireEvent.change(input, { target: { value: 'Mika Nova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Profil speichern' }))

    await waitFor(() => {
      expect(updateOwnProfileMock).toHaveBeenCalledWith(expect.objectContaining({
        display_name: 'Mika Nova',
      }))
    })
    const payload = updateOwnProfileMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload.email).toBeUndefined()
    expect(payload.keycloak_subject).toBeUndefined()
    expect(await screen.findByText('Profil wurde gespeichert.')).not.toBeNull()
  })

  it('preserves dirty Team4s fields during Keycloak return refresh', async () => {
    getOwnProfileMock
      .mockResolvedValueOnce(makeProfileResponse())
      .mockResolvedValueOnce(makeProfileResponse({
        account_display_name: 'Mika Keycloak',
        display_name: 'Mika From Server',
      }))
    refreshActiveAuthSessionMock.mockResolvedValue(undefined)

    render(<MyProfilePage />)

    const displayNameInput = await screen.findByLabelText('Anzeigename')
    fireEvent.change(displayNameInput, { target: { value: 'Ungespeicherter Name' } })
    fireEvent.click(screen.getByRole('link', { name: 'Account bei Keycloak öffnen' }))
    fireEvent.focus(window)

    expect((await screen.findAllByText('Mika Keycloak')).length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('Ungespeicherter Name')).not.toBeNull()
    expect(screen.queryByDisplayValue('Mika From Server')).toBeNull()
  })
})
