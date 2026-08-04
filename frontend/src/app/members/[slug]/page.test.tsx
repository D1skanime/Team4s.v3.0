// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberProfileData } from '@/types/profile'

import MemberProfilePage, { generateMetadata } from './page'

const memberPageStyles = readFileSync('src/app/members/[slug]/page.module.css', 'utf8')

const { cookieGetMock, getMemberProfileMock, getMemberContributionsMock, reactCacheEntries } = vi.hoisted(() => ({
  cookieGetMock: vi.fn(),
  getMemberProfileMock: vi.fn(),
  getMemberContributionsMock: vi.fn(),
  reactCacheEntries: [] as Array<{ args: unknown[]; value: unknown }>,
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => ((...args: Parameters<T>) => {
      const cached = reactCacheEntries.find((entry) => (
        entry.args.length === args.length && entry.args.every((value, index) => Object.is(value, args[index]))
      ))
      if (cached) return cached.value

      const value = fn(...args)
      reactCacheEntries.push({ args, value })
      return value
    }) as T,
  }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: cookieGetMock,
  })),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError,
    AUTH_TOKEN_COOKIE_NAME: 'team4s_access_token',
    getMemberProfile: getMemberProfileMock,
    getMemberContributions: getMemberContributionsMock,
    resolveApiUrl: (value: string) => value,
  }
})

vi.mock('./OwnHiddenProfilePreview', () => ({
  OwnHiddenProfilePreview: ({ slug }: { slug: string }) => (
    <div data-testid="own-hidden-profile-preview">OwnHiddenProfilePreview:{slug}</div>
  ),
}))

vi.mock('./OwnProfileEditLink', () => ({
  OwnProfileEditLink: () => <a href="/me/profile">Profil bearbeiten</a>,
}))

vi.mock('@/components/profile/CorrectionReportModal', () => ({
  CorrectionReportModal: () => null,
}))

function makePublicProfile(overrides: Partial<PublicMemberProfileData> = {}): PublicMemberProfileData {
  return {
    member_id: 41,
    fansub_name: 'Ballelboy',
    bio: 'Timing und Typesetting.',
    member_story_html: '<p>Seit vielen Jahren in Fansub-Projekten aktiv.</p>',
    active_from_date: '2014-01-01',
    active_until_date: null,
    is_currently_active: true,
    noindex: false,
    is_verified: true,
    profile_status: 'active',
    profile_visibility: 'public',
    avatar: null,
    background_image: null,
    memberships: [
      {
        fansub_group_id: 7,
        fansub_group_name: 'AnimeOwnage',
        fansub_group_slug: 'animeownage',
        logo_url: null,
        group_status: 'active',
        joined_year: 2014,
        left_year: null,
        has_historical_link: true,
        historical_member_status: 'confirmed',
      },
    ],
    public_badges: [
      { id: 1, badge_code: 'founding_member', badge_category: 'historical_achievement' },
    ],
    badge_progress: [],
    total_points: 0,
    recent_media: [],
    recent_contributions: [],
    current_projects: [
      {
        anime_id: 11,
        anime_title: 'Maboroshi no Fansub',
        cover_url: null,
        fansub_group_id: 7,
        fansub_group_name: 'AnimeOwnage',
        roles: ['Timing', 'Typesetting'],
        release_versions: [
          {
            release_version_id: 501,
            release_version_label: 'Episode 01 - v2',
            version: 'v2',
            title: null,
            episode_number: '01',
            episode_title: 'Start',
            roles: ['Timing'],
          },
        ],
        is_project_level: false,
        contribution_status: 'confirmed',
        started_year: 2014,
        ended_year: null,
      },
    ],
    latest_contributions: [
      {
        type: 'text',
        id: 91,
        occurred_at: '2026-07-07T10:00:00Z',
        anime_id: 11,
        anime_title: 'Maboroshi no Fansub',
        release_version_id: 501,
        release_version_label: 'Episode 01 - v2',
        title: 'Ein Versuch',
        text_preview: 'Ein kurzer öffentlicher Beitrag.',
      },
    ],
    previous_contributions: [
      {
        anime_id: 12,
        anime_title: 'Archiv der Sterne',
        fansub_group_id: 7,
        fansub_group_name: 'AnimeOwnage',
        roles: ['Übersetzung'],
        started_year: 2014,
        ended_year: 2017,
      },
    ],
    previous_contributions_count: 1,
    ...overrides,
  }
}

async function renderMemberPage(profile: PublicMemberProfileData | { visible: false; reason: string }) {
  getMemberProfileMock.mockResolvedValue('visible' in profile ? profile : { data: profile })
  getMemberContributionsMock.mockResolvedValue({ role_timeline: [] })
  const result = await MemberProfilePage({ params: { slug: 'ballelboy' } })
  return render(result)
}

beforeEach(() => {
  vi.clearAllMocks()
  reactCacheEntries.splice(0)
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn()
    disconnect = vi.fn()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MemberProfilePage Phase 99 route composition', () => {
  it('lets every visible profile section consume the shared 1480px shell', () => {
    expect(memberPageStyles).toContain('width: min(var(--public-page-max-width), calc(100% - var(--public-page-gutter)));')
    expect(memberPageStyles).not.toContain('min(1280px')
    const sectionRule = memberPageStyles.match(/^\.section\s*\{[\s\S]*?^\}/m)?.[0] ?? ''
    expect(sectionRule).toContain('width: 100%;')
    expect(sectionRule).not.toContain('max-width: 920px;')
  })

  it('renders the full locked seven-section public profile order', async () => {
    await renderMemberPage(makePublicProfile())

    const orderedSections = [
      screen.getAllByRole('heading', { name: 'Ballelboy' })[0],
      screen.getByRole('heading', { name: 'Fansub-Geschichte' }),
      screen.getByRole('heading', { name: 'Gruppenzugehörigkeit' }),
      screen.getByRole('heading', { name: 'Aktuelle Projekte' }),
      screen.getByRole('heading', { name: 'Auszeichnungen' }),
      screen.getByRole('heading', { name: 'Letzte Beiträge' }),
      screen.getByRole('heading', { name: 'Frühere Mitwirkungen' }),
    ]

    for (let index = 1; index < orderedSections.length; index += 1) {
      const previous = orderedSections[index - 1]
      const next = orderedSections[index]
      expect(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    }

    expect(screen.getByRole('button', { name: 'Frühere Mitwirkungen anzeigen (1)' })).not.toBeNull()
  })

  it('Phase 120 RED: deduplicates metadata and page reads for the same slug and viewer token', async () => {
    cookieGetMock.mockImplementation((name: string) => (
      name === 'team4s_access_token' ? { value: '  viewer-token  ' } : undefined
    ))
    getMemberProfileMock.mockResolvedValue({ data: makePublicProfile({ noindex: true }) })

    const metadata = await generateMetadata({ params: { slug: 'ballelboy' } })
    const page = await MemberProfilePage({ params: { slug: 'ballelboy' } })
    render(page)

    expect(metadata).toEqual({ robots: { index: false, follow: false } })
    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    expect(getMemberProfileMock).toHaveBeenCalledWith('ballelboy', 'viewer-token')
    expect(screen.getAllByRole('heading', { name: 'Ballelboy' })[0]).toBeTruthy()
  })

  it('Phase 120 RED: isolates anonymous and owner-preview cache keys', async () => {
    const ownerProfile = makePublicProfile({
      noindex: true,
      avatar: {
        public_url: '/media/profile/41/avatar/display.png',
      },
      background_image: {
        public_url: '/media/profile/41/background/display.png',
        source_original_url: '/media/profile/41/background/source-original.png',
      },
      public_badges: [
        { id: 1, badge_code: 'founding_member', badge_category: 'historical_achievement' },
      ],
    })
    getMemberProfileMock.mockImplementation((_slug: string, token?: string) => (
      token === 'owner-token'
        ? Promise.resolve({ data: ownerProfile })
        : Promise.resolve({ visible: false, reason: 'members_only' })
    ))

    cookieGetMock.mockReturnValue(undefined)
    const anonymousMetadata = await generateMetadata({ params: { slug: 'ballelboy' } })
    const anonymousPage = await MemberProfilePage({ params: { slug: 'ballelboy' } })
    const anonymousRender = render(anonymousPage)

    expect(anonymousMetadata).toEqual({})
    expect(screen.getByTestId('own-hidden-profile-preview').textContent).toBe(
      'OwnHiddenProfilePreview:ballelboy',
    )
    expect(anonymousRender.container.textContent).not.toContain('Ballelboy')
    expect(anonymousRender.container.textContent).not.toContain('Gründungsmitglied')
    expect(anonymousRender.container.innerHTML).not.toContain('/media/profile/41/avatar/display.png')
    expect(anonymousRender.container.innerHTML).not.toContain('source-original.png')
    anonymousRender.unmount()

    cookieGetMock.mockImplementation((name: string) => (
      name === 'team4s_access_token' ? { value: '  owner-token  ' } : undefined
    ))
    const ownerMetadata = await generateMetadata({ params: { slug: 'ballelboy' } })
    const ownerPage = await MemberProfilePage({ params: { slug: 'ballelboy' } })
    render(ownerPage)

    expect(ownerMetadata).toEqual({ robots: { index: false, follow: false } })
    expect(screen.getAllByRole('heading', { name: 'Ballelboy' })[0]).toBeTruthy()
    expect(getMemberProfileMock).toHaveBeenCalledTimes(2)
    expect(getMemberProfileMock.mock.calls).toEqual([
      ['ballelboy', undefined],
      ['ballelboy', 'owner-token'],
    ])
  })
  it('does not render the old public tab navigation labels as section navigation or fetch the old timeline', async () => {
    await renderMemberPage(makePublicProfile())

    expect(screen.queryByRole('navigation', { name: 'Seitennavigation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Identität' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Badges' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Geschichte' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mitwirkende' })).toBeNull()
    expect(getMemberContributionsMock).not.toHaveBeenCalled()
  })

  it('passes badge progress through the existing route', async () => {
    await renderMemberPage(makePublicProfile({ badge_progress: [{ family: 'progress', current_count: 9, next_threshold: 10, remaining_count: 1, next_tier: '10 Projekte', complete: false }] }))
    expect(screen.getByRole('heading', { name: 'Fortschritt' })).toBeTruthy()
    expect(screen.getByText(/9 von 10 Anime-Projekten/)).toBeTruthy()
  })

  it('keeps the hidden-profile owner preview path intact', async () => {
    await renderMemberPage({ visible: false, reason: 'members_only' })

    expect(screen.getByTestId('own-hidden-profile-preview').textContent).toBe('OwnHiddenProfilePreview:ballelboy')
  })
})
