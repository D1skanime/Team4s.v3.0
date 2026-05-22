// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { MemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const updateOwnProfileMock = vi.fn()
const uploadOwnProfileAvatarMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
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
  updateOwnProfile: (...args: unknown[]) => updateOwnProfileMock(...args),
  uploadOwnProfileAvatar: (...args: unknown[]) => uploadOwnProfileAvatarMock(...args),
  resolveApiUrl: (value: string) => value,
}))

import AdminProfilePage from './page'

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
        app_member_roles: ['typesetter'],
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

describe('AdminProfilePage', () => {
  it('loads the own profile and shows the Keycloak account button', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<AdminProfilePage />)

    expect(await screen.findByDisplayValue('Mika')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Accountdaten ändern' }).getAttribute('href')).toContain('/account')
    expect(screen.getAllByText('Phase Fansubs').length).toBeGreaterThan(0)
    expect(screen.getByText('Typesetter')).not.toBeNull()
  })

  it('saves edited own profile fields', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    updateOwnProfileMock.mockResolvedValue(makeProfileResponse({ display_name: 'Mika Nova' }))

    render(<AdminProfilePage />)

    const input = await screen.findByLabelText('Anzeigename')
    fireEvent.change(input, { target: { value: 'Mika Nova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Profil speichern' }))

    await waitFor(() => {
      expect(updateOwnProfileMock).toHaveBeenCalledWith(expect.objectContaining({
        display_name: 'Mika Nova',
      }))
    })
    expect(await screen.findByText('Profil wurde gespeichert.')).not.toBeNull()
  })

  it('shows avatar upload errors inline', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    uploadOwnProfileAvatarMock.mockRejectedValue(new Error('Nur PNG erlaubt'))

    render(<AdminProfilePage />)

    await screen.findByText('Mein Profil')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['avatar'], 'avatar.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Nur PNG erlaubt')).not.toBeNull()
  })
})
