// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const getMemberProfileMock = vi.fn()
const useAuthSessionMock = vi.fn()
const usePathnameMock = vi.fn()

const { MockApiError } = vi.hoisted(() => ({
  MockApiError: class extends Error {
    status: number
    constructor(status: number, message = 'API request failed') {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('next/navigation', () => ({ usePathname: () => usePathnameMock() }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  getMemberProfile: (...args: unknown[]) => getMemberProfileMock(...args),
  getOwnProfile: () => getOwnProfileMock(),
  resolveApiUrl: (value: string) => value,
}))
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => useAuthSessionMock() }))
vi.mock('@/components/profile/MemberProfileHero', () => ({
  MemberProfileHero: ({ profile }: { profile: { fansub_name: string } }) => <h1>{profile.fansub_name}</h1>,
}))
vi.mock('@/components/profile/MemberStorySection', () => ({
  MemberStorySection: ({ storyHtml }: { storyHtml?: string | null }) => <section>{storyHtml}</section>,
}))
vi.mock('@/components/profile/MembershipsSection', () => ({
  MembershipsSection: () => <section>Fansub-Gruppen</section>,
}))
vi.mock('@/components/profile/LatestContributionsSection', () => ({
  LatestContributionsSection: () => <section>Letzte Beiträge</section>,
}))
vi.mock('@/components/profile/PreviousContributionsSection', () => ({
  PreviousContributionsSection: () => <section>Frühere Beiträge</section>,
}))
vi.mock('@/components/profile/MemberCurrentProjectsSection', () => ({
  MemberCurrentProjectsSection: () => <section>Fansub-Projekte</section>,
}))
vi.mock('@/components/profile/MemberBadgeChain', () => ({
  MemberBadgeChain: () => <section>Rollenfortschritt</section>,
}))
vi.mock('@/components/profile/memberBadgeLabels', () => ({
  PUBLIC_MEMBER_BADGE_CATALOG: [],
}))
vi.mock('@/components/profile/CorrectionReportModal', () => ({
  CorrectionReportModal: () => <button type="button">Korrektur melden</button>,
}))
vi.mock('@/components/ui', () => ({
  Button: ({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: () => void }) => href
    ? <a href={href}>{children}</a>
    : <button type="button" onClick={onClick}>{children}</button>,
  LoadingState: ({ title, description }: { title: string; description?: string }) => (
    <div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
  ),
  ErrorState: ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
    <div><h1>{title}</h1><p>{description}</p>{action}</div>
  ),
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

import MemberProfileNotFound from './not-found'

function makePublicProfileResponse(
  viewer: PublicMemberProfileResponse['viewer'] = { is_owner: true, is_private_preview: true },
  fansubName = 'Canonical Owner',
): PublicMemberProfileResponse {
  return {
    data: {
      member_id: 3,
      fansub_name: fansubName,
      slug: fansubName.toLowerCase().replaceAll(' ', '-'),
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
      known_for: { active_years: '', top_roles: [], known_groups: [] },
      current_projects: [],
      latest_contributions: [],
      previous_contributions: [],
      previous_contributions_count: 0,
    },
    viewer,
  }
}

function setAuthSession(overrides: Record<string, boolean> = {}) {
  useAuthSessionMock.mockReturnValue({
    hasAccessToken: false,
    hasRefreshToken: false,
    isClientInitialized: true,
    ...overrides,
  })
}

beforeEach(() => {
  usePathnameMock.mockReturnValue('/members/canonical-owner')
  setAuthSession()
  getOwnProfileMock.mockResolvedValue({ data: { member_id: 3 } })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MemberProfileNotFound loading boundary', () => {
  it('resolves the code-split boundary and serves the full owner preview', async () => {
    setAuthSession({ hasRefreshToken: true })
    getMemberProfileMock.mockResolvedValue(makePublicProfileResponse())

    render(<MemberProfileNotFound />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Canonical Owner' })).toBeTruthy())

    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    expect(getMemberProfileMock).toHaveBeenCalledWith('canonical-owner')
    expect(screen.getByText('Privates Profil – nur für dich sichtbar')).toBeTruthy()
    expect(screen.queryByText('Profil nicht verfügbar')).toBeNull()
  })

  it('resolves the code-split boundary and serves the anonymous unavailable state', async () => {
    render(<MemberProfileNotFound />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profil nicht verfügbar' })).toBeTruthy())

    expect(
      screen.getByText('Dieses Profil ist nicht verfügbar. Prüfe den Link oder kehre zur Anime-Übersicht zurück.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zur Anime-Übersicht' }).getAttribute('href')).toBe('/anime')
    expect(getMemberProfileMock).not.toHaveBeenCalled()
  })
})
