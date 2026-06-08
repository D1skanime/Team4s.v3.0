// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import type { MemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@/lib/api', () => ({
  getOwnProfile: () => getOwnProfileMock(),
  resolveApiUrl: (value: string) => value,
}))

vi.mock('@/components/editor', () => ({
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => <div data-testid="story">{bodyHtml}</div>,
}))

vi.mock('@/components/profile/MemberProfileHero', () => ({
  MemberProfileHero: ({ profile }: { profile: { fansub_name: string } }) => <h1>{profile.fansub_name}</h1>,
}))

vi.mock('@/components/profile/MembershipsSection', () => ({
  MembershipsSection: () => <section>Fansub-Gruppen</section>,
}))

vi.mock('@/components/profile/RecentContributionsSection', () => ({
  RecentContributionsSection: () => <section>Letzte Beiträge</section>,
}))

vi.mock('@/components/profile/RecentMediaSection', () => ({
  RecentMediaSection: () => <section>Letzte Medien</section>,
}))

vi.mock('@/components/ui', () => ({
  Card: ({ children, title }: { children: ReactNode; title?: string }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
}))

vi.mock('./OwnProfileEditLink', () => ({
  OwnProfileEditLink: () => <a href="/me/profile">Profil bearbeiten</a>,
}))

import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeOwnProfileResponse(overrides: Partial<MemberProfileResponse['data']> = {}): MemberProfileResponse {
  return {
    data: {
      member_id: 3,
      app_user_id: 42,
      display_name: 'AOEditor',
      fansub_name: 'Subaru',
      slug: 'subaru',
      email: 'subaru@example.local',
      keycloak_subject: 'kc-subaru',
      bio: 'Editor bei AO.',
      member_story_html: '<p>Story</p>',
      active_from_date: '2024-01-01',
      active_until_date: null,
      is_currently_active: true,
      noindex: true,
      is_verified: false,
      profile_visibility: 'members_only',
      avatar: null,
      background_image: null,
      capabilities: {
        can_view_own_profile: true,
        can_edit_own_profile: true,
        can_upload_own_avatar: true,
        can_open_keycloak_account: false,
        can_view_memberships: true,
        can_view_historical_credits: true,
      },
      memberships: [],
      historical_credits: [],
      recent_media: [],
      recent_contributions: [],
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      account_status: 'active',
      account_display_name: 'AOEditor',
      account_global_roles: [],
      ...overrides,
    },
  }
}

describe('OwnHiddenProfilePreview', () => {
  it('renders the own members-only profile preview when the slug belongs to the current member', async () => {
    getOwnProfileMock.mockResolvedValue(makeOwnProfileResponse())

    render(<OwnHiddenProfilePreview slug="3" />)

    expect(await screen.findByRole('heading', { name: 'Subaru' })).not.toBeNull()
    expect(screen.getByText('Profil bearbeiten')).not.toBeNull()
    expect(screen.queryByText('Dieses Profil ist nicht öffentlich zugänglich.')).toBeNull()
  })

  it('keeps the hidden notice when the slug belongs to another member', async () => {
    getOwnProfileMock.mockResolvedValue(makeOwnProfileResponse({ member_id: 4 }))

    render(<OwnHiddenProfilePreview slug="3" />)

    await waitFor(() => {
      expect(screen.getByText('Dieses Profil ist nicht öffentlich zugänglich.')).not.toBeNull()
    })
  })
})
