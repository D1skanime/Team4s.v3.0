// @vitest-environment jsdom

import type { ComponentType, ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import type { MemberProfileResponse, PublicMemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const getMemberProfileMock = vi.fn()
const useAuthSessionMock = vi.fn()
const usePathnameMock = vi.fn()
const previewSource = readFileSync('src/app/members/[slug]/OwnHiddenProfilePreview.tsx', 'utf8')
const apiSource = readFileSync('src/lib/api.ts', 'utf8')
const ownProfilePageSource = readFileSync('src/app/me/profile/page.tsx', 'utf8')

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@/lib/api', () => ({
  getMemberProfile: (...args: unknown[]) => getMemberProfileMock(...args),
  getOwnProfile: () => getOwnProfileMock(),
  resolveApiUrl: (value: string) => value,
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
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

vi.mock('@/components/profile/MemberCurrentProjectsSection', () => ({
  MemberCurrentProjectsSection: () => <section>Fansub-Projekte</section>,
}))

vi.mock('@/components/profile/MemberBadgeChain', () => ({
  MemberBadgeChain: () => <section>Rollenfortschritt</section>,
}))

vi.mock('@/components/profile/CorrectionReportModal', () => ({
  CorrectionReportModal: () => <button type="button">Korrektur melden</button>,
}))

vi.mock('@/components/ui', () => ({
  Card: ({ children, title }: { children: ReactNode; title?: string }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  Button: ({ children }: { children: ReactNode }) => <>{children}</>,
  LoadingState: ({ title }: { title: string }) => <div role="status">{title}</div>,
  ErrorState: ({ title }: { title: string }) => <div>{title}</div>,
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
      has_member_profile: true,
      has_project_assignments: false,
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

function makePublicProfileResponse(): PublicMemberProfileResponse {
  return {
    data: {
      member_id: 3,
      fansub_name: 'Canonical Owner',
      bio: 'Authoritative public profile.',
      member_story_html: '<p>Vollständige Fansub-Geschichte</p>',
      active_from_date: '2024-01-01',
      active_until_date: null,
      is_currently_active: true,
      noindex: true,
      is_verified: true,
      profile_status: 'active',
      profile_visibility: 'private',
      avatar: null,
      background_image: null,
      memberships: [],
      public_badges: [],
      badge_progress: [],
      total_points: 120,
      recent_media: [],
      recent_contributions: [],
      current_projects: [],
      latest_contributions: [],
      previous_contributions: [],
      previous_contributions_count: 0,
    },
  } as unknown as PublicMemberProfileResponse
}

describe('OwnHiddenProfilePreview', () => {
  it('Phase128PreviewUsesPathname', async () => {
    usePathnameMock.mockReturnValue('/members/canonical-owner')
    useAuthSessionMock.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: true,
      isClientInitialized: true,
    })
    getMemberProfileMock.mockResolvedValue(makePublicProfileResponse())
    getOwnProfileMock.mockResolvedValue(makeOwnProfileResponse({
      fansub_name: 'Canonical Owner',
      slug: 'canonical-owner',
      profile_visibility: 'members_only',
    }))

    const Preview = OwnHiddenProfilePreview as ComponentType<{ slug?: string }>
    render(<Preview slug="canonical-owner" />)
    const initialState = {
      neutralLoading: screen.queryByText('Profil wird geladen.') !== null,
      unavailableFlash: screen.queryByText('Profil nicht verfügbar') !== null,
      loggedOutFlash: screen.queryByText(/Anmeldung erforderlich/) !== null,
    }

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Canonical Owner' })).not.toBeNull()
    })

    const sourceViolations = [
      ['getOwnProfile conversion', /\bgetOwnProfile\b|\btoPublicProfile\b/.test(previewSource)],
      ['token or cookie read', /getRuntimeAuthToken|AUTH_(?:TOKEN|REFRESH)_COOKIE_NAME|document\.cookie/.test(previewSource)],
      ['direct refresh or bearer', /refreshKeycloakToken|refreshActiveAuthSession|Authorization\s*:|Bearer\s/.test(previewSource)],
      ['protected bare fetch', /\bfetch\s*\(/.test(previewSource)],
      ['nickname slugification', /slugifyMemberName|fansub_name[^\n]*toLowerCase/.test(previewSource)],
      ['numeric fallback', /\^\\d\+\$|Number\(normalizedSlug\)/.test(previewSource)],
      ['slug or member id link', /profile\.slug\s*\|\|\s*profile\.member_id/.test(ownProfilePageSource)],
      ['member contributions bare fetch', /function getMemberContributions[\s\S]{0,500}?await fetch\s*\(/.test(apiSource)],
      ['project member bare fetch', /function getProjectMemberSummary[\s\S]{0,500}?await fetch\s*\(/.test(apiSource)],
    ].filter(([, present]) => present).map(([name]) => name)

    const visibilityAction = screen.queryByRole('link', { name: 'Sichtbarkeit ändern' })
    const editAction = screen.queryByRole('link', { name: 'Profil bearbeiten' })
    expect({
      initialState,
      memberProfileCalls: getMemberProfileMock.mock.calls,
      ownProfileCalls: getOwnProfileMock.mock.calls.length,
      notice: screen.queryByText('Privates Profil – nur für dich sichtbar')?.textContent ?? null,
      noticeBody: screen.queryByText('Du siehst die vollständige Vorschau. Andere Personen können dieses Profil nicht öffnen.')?.textContent ?? null,
      visibilityHref: visibilityAction?.getAttribute('href') ?? null,
      editHref: editAction?.getAttribute('href') ?? null,
      hasFullStory: screen.queryByText(/Vollständige Fansub-Geschichte/) !== null,
      hasCorrection: screen.queryByText('Korrektur melden') !== null,
      unavailableAfterLoad: screen.queryByText('Profil nicht verfügbar') !== null,
      sourceViolations,
    }).toEqual({
      initialState: { neutralLoading: true, unavailableFlash: false, loggedOutFlash: false },
      memberProfileCalls: [['canonical-owner']],
      ownProfileCalls: 0,
      notice: 'Privates Profil – nur für dich sichtbar',
      noticeBody: 'Du siehst die vollständige Vorschau. Andere Personen können dieses Profil nicht öffnen.',
      visibilityHref: '/me/profile?tab=visibility',
      editHref: '/me/profile',
      hasFullStory: true,
      hasCorrection: false,
      unavailableAfterLoad: false,
      sourceViolations: [],
    })
  })
})
