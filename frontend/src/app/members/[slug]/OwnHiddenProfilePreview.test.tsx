// @vitest-environment jsdom

import type { ComponentType, ReactNode } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const getMemberProfileMock = vi.fn()
const useAuthSessionMock = vi.fn()
const usePathnameMock = vi.fn()
const apiSource = readFileSync('src/lib/api.ts', 'utf8')
const ownProfilePageSource = readFileSync('src/app/me/profile/page.tsx', 'utf8')
const previewSourcePath = 'src/app/members/[slug]/OwnHiddenProfilePreview.tsx'
const notFoundSourcePath = 'src/app/members/[slug]/not-found.tsx'

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
  deriveMilestoneBadge: () => null,
}))
vi.mock('@/components/profile/CorrectionReportModal', () => ({
  CorrectionReportModal: () => <button type="button">Korrektur melden</button>,
}))
vi.mock('@/components/ui', () => ({
  Button: ({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: () => void }) => href
    ? <a href={href}>{children}</a>
    : <button type="button" onClick={onClick}>{children}</button>,
  LoadingState: ({ title, description }: { title: string; description: string }) => (
    <div><h1>{title}</h1><p>{description}</p></div>
  ),
  ErrorState: ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
    <div><h1>{title}</h1><p>{description}</p>{action}</div>
  ),
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'

const Preview = OwnHiddenProfilePreview as ComponentType<Record<string, never>>

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
      recent_media: [],
      recent_contributions: [],
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

describe('OwnHiddenProfilePreview route-local access gate', () => {
  it('keeps the initial server/client output neutral while auth initializes', () => {
    setAuthSession({ isClientInitialized: false })
    render(<Preview />)

    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(screen.getByRole('heading', { name: 'Profil wird geladen.' })).toBeTruthy()
    expect(screen.getByText('Team4s prüft, ob dieses Profil angezeigt werden kann.')).toBeTruthy()
    expect(screen.queryByText('Profil nicht verfügbar')).toBeNull()
    expect(screen.queryByText(/Anmeldung erforderlich/)).toBeNull()
    expect(screen.queryByText('Canonical Owner')).toBeNull()
    expect(getMemberProfileMock).not.toHaveBeenCalled()
  })

  it('defines a route-local not-found document that delegates without slug props', () => {
    expect(existsSync(notFoundSourcePath)).toBe(true)
    const source = existsSync(notFoundSourcePath) ? readFileSync(notFoundSourcePath, 'utf8') : ''
    expect(source).toContain('<OwnHiddenProfilePreview')
    expect(source).not.toMatch(/OwnHiddenProfilePreview\s+slug=/)
  })

  it('derives the canonical pathname slug and upgrades a refresh-only owner without a flash', async () => {
    setAuthSession({ hasRefreshToken: true })
    getMemberProfileMock.mockResolvedValue(makePublicProfileResponse())
    render(<Preview />)

    expect(screen.getByText('Profil wird geladen.')).toBeTruthy()
    expect(screen.queryByText('Profil nicht verfügbar')).toBeNull()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Canonical Owner' })).toBeTruthy())

    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    expect(getMemberProfileMock).toHaveBeenCalledWith('canonical-owner')
    expect(getOwnProfileMock).not.toHaveBeenCalled()
    expect(screen.getByText('Privates Profil – nur für dich sichtbar')).toBeTruthy()
    expect(screen.getByText('Du siehst die vollständige Vorschau. Andere Personen können dieses Profil nicht öffnen.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sichtbarkeit ändern' }).getAttribute('href')).toBe('/me/profile?tab=visibility')
    expect(
      screen.getAllByRole('link', { name: 'Profil bearbeiten' }).every((link) => link.getAttribute('href') === '/me/profile'),
    ).toBe(true)
    expect(screen.getByText(/Vollständige Fansub-Geschichte/)).toBeTruthy()
    expect(screen.queryByText('Korrektur melden')).toBeNull()
    expect(screen.queryByText('Profil nicht verfügbar')).toBeNull()
  })

  it('settles anonymous, denied, and authenticated non-owner states identically', async () => {
    const snapshots: string[] = []

    render(<Preview />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profil nicht verfügbar' })).toBeTruthy())
    snapshots.push(document.body.textContent ?? '')
    cleanup()

    setAuthSession({ hasAccessToken: true })
    getMemberProfileMock.mockRejectedValueOnce(new MockApiError(404))
    render(<Preview />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profil nicht verfügbar' })).toBeTruthy())
    snapshots.push(document.body.textContent ?? '')
    cleanup()

    getMemberProfileMock.mockResolvedValueOnce(makePublicProfileResponse({ is_owner: false, is_private_preview: false }))
    render(<Preview />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profil nicht verfügbar' })).toBeTruthy())
    snapshots.push(document.body.textContent ?? '')

    expect(new Set(snapshots).size).toBe(1)
    expect(screen.getByText('Dieses Profil ist nicht verfügbar. Prüfe den Link oder kehre zur Anime-Übersicht zurück.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zur Anime-Übersicht' }).getAttribute('href')).toBe('/anime')
    expect(screen.queryByText('Canonical Owner')).toBeNull()
  })

  it('shows the generic retry state for non-404 failures and retries centrally', async () => {
    setAuthSession({ hasAccessToken: true })
    getMemberProfileMock
      .mockRejectedValueOnce(new MockApiError(503))
      .mockResolvedValueOnce(makePublicProfileResponse())
    render(<Preview />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profil konnte nicht geladen werden' })).toBeTruthy())
    expect(screen.getByText('Bitte versuche es später erneut.')).toBeTruthy()
    expect(screen.queryByText('Profil nicht verfügbar')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Canonical Owner' })).toBeTruthy())
    expect(getMemberProfileMock).toHaveBeenCalledTimes(2)
  })

  it('ignores stale profile responses after the pathname changes', async () => {
    setAuthSession({ hasAccessToken: true })
    let resolveFirst!: (value: PublicMemberProfileResponse) => void
    const firstRequest = new Promise<PublicMemberProfileResponse>((resolve) => { resolveFirst = resolve })
    getMemberProfileMock
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(makePublicProfileResponse(undefined, 'Second Owner'))

    const view = render(<Preview />)
    expect(screen.getByText('Profil wird geladen.')).toBeTruthy()

    usePathnameMock.mockReturnValue('/members/second-owner')
    view.rerender(<Preview />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Second Owner' })).toBeTruthy())

    resolveFirst(makePublicProfileResponse(undefined, 'Stale Owner'))
    await Promise.resolve()

    expect(screen.queryByText('Stale Owner')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Second Owner' })).toBeTruthy()
  })

  it('keeps the protected boundary on the central helper with no duplicate authority', () => {
    const previewSource = readFileSync(previewSourcePath, 'utf8')
    const sourceViolations = [
      ['getOwnProfile conversion', /\bgetOwnProfile\b|\btoPublicProfile\b/.test(previewSource)],
      ['token or cookie read', /getRuntimeAuthToken|AUTH_(?:TOKEN|REFRESH)_COOKIE_NAME|document\.cookie/.test(previewSource)],
      ['direct refresh or bearer', /refreshKeycloakToken|refreshActiveAuthSession|Authorization\s*:|Bearer\s/.test(previewSource)],
      ['protected bare fetch', /\bfetch\s*\(/.test(previewSource)],
      ['nickname slugification', /slugifyMemberName|fansub_name[^\n]*toLowerCase/.test(previewSource)],
      ['numeric fallback', /\^\\d\+\$|Number\(normalizedSlug\)/.test(previewSource)],
      ['slug prop', /type OwnHiddenProfilePreviewProps|OwnHiddenProfilePreview\s*\(\s*\{[^)]*\bslug\b/.test(previewSource)],
      ['slug or member id link', /profile\.slug\s*\|\|\s*profile\.member_id/.test(ownProfilePageSource)],
      ['member contributions bare fetch', /function getMemberContributions[\s\S]{0,500}?await fetch\s*\(/.test(apiSource)],
      ['project member bare fetch', /function getProjectMemberSummary[\s\S]{0,500}?await fetch\s*\(/.test(apiSource)],
    ].filter(([, present]) => present).map(([name]) => name)
    expect(sourceViolations).toEqual([])
  })
})