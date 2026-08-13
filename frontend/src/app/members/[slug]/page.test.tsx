// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberProfileData } from '@/types/profile'

import MemberProfilePage, { generateMetadata } from './page'

const memberPageStyles = readFileSync('src/app/members/[slug]/page.module.css', 'utf8')
const memberPageSource = readFileSync('src/app/members/[slug]/page.tsx', 'utf8')
const memberProfileContentPath = 'src/app/members/[slug]/MemberProfileContent.tsx'
const memberProfileContentSource = existsSync(memberProfileContentPath)
  ? readFileSync(memberProfileContentPath, 'utf8')
  : ''
const memberStorySource = readFileSync('src/components/profile/MemberStorySection.tsx', 'utf8')
const membershipsSource = readFileSync('src/components/profile/MembershipsSection.tsx', 'utf8')
const currentProjectsSource = readFileSync('src/components/profile/MemberCurrentProjectsSection.tsx', 'utf8')
const memberBadgeChainSource = readFileSync('src/components/profile/MemberBadgeChain.tsx', 'utf8')
const focalCarouselSource = readFileSync('src/components/ui/FocalCarousel.tsx', 'utf8')
const profileStyles = readFileSync('src/components/profile/profile.module.css', 'utf8')

const { getMemberProfileMock, getMemberContributionsMock, notFoundMock, reactCacheEntries } = vi.hoisted(() => ({
  getMemberProfileMock: vi.fn(),
  getMemberContributionsMock: vi.fn(),
  notFoundMock: vi.fn(),
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

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
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
    getMemberProfile: getMemberProfileMock,
    getMemberContributions: getMemberContributionsMock,
    resolveApiUrl: (value: string) => value,
  }
})

vi.mock('./OwnProfileEditLink', () => ({
  OwnProfileEditLink: () => <a href="/me/profile">Profil bearbeiten</a>,
}))

vi.mock('@/components/profile/CorrectionReportModal', () => ({
  CorrectionReportModal: () => <button type="button">Korrektur melden</button>,
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
      { id: 1, badge_code: 'historical_leader', badge_category: 'historical_achievement' },
      { id: 2, badge_code: 'role_entry_timer', badge_category: 'role_entry', current_count: 1 },
    ],
    badge_progress: [
      { family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false },
      { family: 'points', current_count: 50, next_threshold: 200, remaining_count: 150, next_tier: '200 Punkte', complete: false },
      { family: 'contribution_projects', current_count: 1, next_threshold: 5, remaining_count: 4, next_tier: 'Silber', complete: false },
      { family: 'contribution_chronicle', current_count: 5, next_threshold: 25, remaining_count: 20, next_tier: 'Silber', complete: false },
      { family: 'contribution_archivist', current_count: 25, next_threshold: null, remaining_count: null, next_tier: null, complete: true },
      { family: 'membership', current_count: 7, next_threshold: 10, remaining_count: 3, next_tier: '10 Jahre', complete: false },
    ],
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

async function renderMemberPage(
  profile: PublicMemberProfileData,
  viewer = { is_owner: false, is_private_preview: false },
) {
  getMemberProfileMock.mockResolvedValue({
    data: profile,
    viewer,
  })
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

  it('encodes Rhythm C geometry for 390, 768 and 1440 pixel layouts without overflow repairs', () => {
    expect(memberPageStyles).toMatch(/\.rhythmBand\s*\{[\s\S]*?padding:\s*var\(--space-5\);/)
    expect(memberPageStyles).toMatch(/\.profilePair\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 8fr\) minmax\(0, 5fr\)/)
    expect(memberPageStyles).toContain('min-width: 0;')
    expect(memberPageStyles).not.toMatch(/\.page\s*\{[^}]*overflow-wrap:\s*anywhere/s)
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*1099px\)[\s\S]*?\.rhythmBand\s*\{[\s\S]*?padding:\s*var\(--space-5\);/)
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.rhythmBand\s*\{[\s\S]*?padding:\s*var\(--space-4\);/)
    expect(memberPageStyles).toMatch(/\.projectsBand h2\s*\{[\s\S]*?border-bottom:\s*2px solid var\(--ui-line\)/)
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.profilePair,[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    const pageRule = memberPageStyles.match(/^\.page\s*\{[\s\S]*?^\}/m)?.[0] ?? ''
    expect(pageRule).not.toContain('100vw')
    expect(memberPageStyles).not.toMatch(/margin-(?:left|right):\s*-/)
    expect(memberPageStyles).not.toContain('overflow-x: hidden')
    expect(memberPageStyles).not.toMatch(/font-weight:\s*(?:8|9)00/)
  })

  it('keeps every post-hero outer band transparent without changing layout or inner surfaces', () => {
    const rhythmBandRule = memberPageStyles.match(/^\.rhythmBand\s*\{[\s\S]*?^\}/m)?.[0] ?? ''
    const outerBandRule = memberPageStyles.match(/^\.profileBand,[\s\S]*?^\}/m)?.[0] ?? ''

    for (const selector of ['.profileBand', '.projectsBand', '.badgesBand', '.contributionsBand']) {
      expect(outerBandRule).toContain(selector)
    }
    expect(outerBandRule).toContain('background: transparent;')
    expect(outerBandRule).toContain('border: 0;')
    expect(outerBandRule).toContain('border-radius: 0;')
    expect(rhythmBandRule).toContain('display: grid;')
    expect(rhythmBandRule).toContain('gap: var(--space-4);')
    expect(rhythmBandRule).toContain('min-width: 0;')
    expect(rhythmBandRule).toContain('padding: var(--space-5);')
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*1099px\)[\s\S]*?\.rhythmBand\s*\{[\s\S]*?padding:\s*var\(--space-5\);/)
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.rhythmBand\s*\{[\s\S]*?padding:\s*var\(--space-4\);/)
    expect(memberPageStyles).toMatch(/\.profilePair\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 8fr\) minmax\(0, 5fr\)/)
    expect(memberPageStyles).toMatch(/\.contributionPairPresent\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 3fr\) minmax\(20rem, 2fr\)/)
    expect(memberPageStyles).toMatch(/\.contributionPairEmpty\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 3fr\) minmax\(14rem, 1fr\)/)
    expect(memberPageStyles).toMatch(/\.projectsBand h2\s*\{[\s\S]*?border-bottom:\s*2px solid var\(--ui-line\)/)
    expect(memberPageSource).toContain('className={`${styles.section} ${styles.rhythmBand} ${styles.profileBand}`}')
    expect(memberPageSource).toContain('className={`${styles.section} ${styles.rhythmBand} ${styles.projectsBand}`}')
    expect(memberPageSource).toContain('className={`${styles.section} ${styles.rhythmBand} ${styles.badgesBand} ${styles.badgesVisualBand}`}')
    expect(memberPageSource).toContain('className={`${styles.section} ${styles.rhythmBand} ${styles.contributionsBand}`}')
    expect(memberPageSource).toContain('<MemberStorySection')
    expect(memberPageSource).toContain('<MembershipsSection')
    expect(memberStorySource).toContain('<Card variant="section" className={styles.storyCard}>')
    expect(membershipsSource).toContain('<Card variant="interactive" className={styles.membershipCard}>')
    expect(currentProjectsSource).toContain('<Card variant="interactive" className={styles.projectCard}>')
    expect(memberBadgeChainSource).toContain('<Card className={styles.familyCard} data-family={family.key}>')
    expect(memberBadgeChainSource).toContain('<FocalCarousel')
    expect(focalCarouselSource).toContain('onKeyDown={interactionEnabled ? handleKeyDown : undefined}')
    expect(focalCarouselSource).toContain('onPointerDown={interactionEnabled ? handlePointerDown : undefined}')
    expect(profileStyles).toMatch(/\.membershipCard\s*\{[\s\S]*?border:\s*1px solid var\(--border-subtle\);[\s\S]*?border-radius:\s*var\(--radius-lg\);[\s\S]*?background:\s*var\(--surface-card\);[\s\S]*?box-shadow:\s*var\(--shadow-sm\);/)
  })

  it('keeps the role badge band on the same shared section edges', () => {
    expect(memberPageStyles).toMatch(/\.badgesVisualBand\s*\{[^}]*width:\s*100%;/s)
    expect(memberPageStyles).not.toMatch(/\.badgesVisualBand\s*\{[^}]*(?:100vw|left:\s*50%|translateX)/s)
    expect(memberPageStyles).not.toMatch(/@media \(max-width:\s*1599px\)[\s\S]*?\.badgesVisualBand/s)
    expect(memberPageStyles).not.toMatch(/\.(?:profileBand|projectsBand|contributionsBand)\s*\{[^}]*(?:content-width-visual|content-width-visual-cap)/s)
  })

  it('renders the locked Hero B and Rhythm C heading hierarchy in DOM order', async () => {
    await renderMemberPage(makePublicProfile())

    expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent)).toContain('Ballelboy')
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Profil und Mitgliedschaft',
      'Fansub-Projekte',
      'Rollenfortschritt',
      'Fortschritt',
      'Punkte-Meilensteine',
      'Beiträge',
      'Mitgliedschaft',
      'Beiträge',
    ])
    // Quick 260812-pmu: the page outline owns each achievement section title once.
    const pointsGroup = document.querySelector('[data-badge-group="points"]') as HTMLElement
    const membershipGroup = document.querySelector('[data-badge-group="membership"]') as HTMLElement
    expect(within(pointsGroup).getAllByRole('heading', { name: 'Punkte-Meilensteine' })).toHaveLength(1)
    expect(within(membershipGroup).getAllByRole('heading', { name: 'Mitgliedschaft' })).toHaveLength(1)
    expect(within(membershipGroup).getByRole('heading', { level: 3, name: 'Mitgliedsdauer' })).not.toBeNull()
    expect(within(membershipGroup).queryByRole('heading', { level: 4 })).toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(
      expect.arrayContaining([
        'Fansub-Geschichte',
        'Gruppenzugehörigkeit',
        'Letzte Beiträge',
        'Frühere Mitwirkungen',
      ]),
    )
    expect(screen.queryByRole('heading', { name: 'Auszeichnungen' })).toBeNull()

    expect(screen.getByRole('button', { name: 'Frühere Mitwirkungen anzeigen (1)' })).not.toBeNull()
  })
  it('keeps empty earned-only and contribution sections out of the public outline', async () => {
    await renderMemberPage(makePublicProfile({
      public_badges: [],
      latest_contributions: [],
      previous_contributions: [],
      previous_contributions_count: 0,
    }))

    expect(screen.queryByRole('heading', { name: 'Besondere Auszeichnungen' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Letzte Beiträge' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Frühere Mitwirkungen' })).toBeNull()
    expect(screen.getAllByRole('heading', { name: 'Beiträge', level: 2 })).toHaveLength(1)
  })


  it('deduplicates anonymous metadata and page reads for the same stored slug', async () => {
    getMemberProfileMock.mockResolvedValue({
      data: makePublicProfile({ noindex: true }),
      viewer: { is_owner: true, is_private_preview: false },
    })

    const metadata = await generateMetadata({ params: { slug: 'ballelboy' } })
    const page = await MemberProfilePage({ params: { slug: 'ballelboy' } })
    render(page)

    expect(metadata).toEqual({ robots: { index: false, follow: false } })
    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    expect(getMemberProfileMock).toHaveBeenCalledWith('ballelboy')
    expect(screen.getAllByRole('heading', { name: 'Ballelboy' })[0]).toBeTruthy()
  })

  it('keeps owner edit and viewer correction actions mutually exclusive', async () => {
    const profile = makePublicProfile()
    const ownerView = await renderMemberPage(
      profile,
      { is_owner: true, is_private_preview: false },
    )
    expect(screen.getByRole('link', { name: 'Profil bearbeiten' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Korrektur melden' })).toBeNull()
    ownerView.unmount()

    reactCacheEntries.splice(0)
    await renderMemberPage(profile)
    expect(screen.queryByRole('link', { name: 'Profil bearbeiten' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Korrektur melden' })).toBeTruthy()
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
  })

})


describe('Phase 124 deterministic points SSR projection', () => {
  it.each([
    [0, null, 1, 1, false],
    [734, 'point_milestone_engaged', 1000, 266, false],
    [2500, 'point_milestone_legend', null, null, true],
    [5000, 'point_milestone_legend', null, null, true],
  ])('derives only the highest badge at %i and forwards authoritative progress unchanged', async (totalPoints, expectedCode, nextThreshold, remainingCount, complete) => {
    const profile = makePublicProfile({
      total_points: totalPoints,
      public_badges: [{ id: 1, badge_code: 'historical_leader', badge_category: 'historical_achievement' }],
      badge_progress: [{
        family: 'points',
        current_count: totalPoints,
        next_threshold: nextThreshold,
        remaining_count: remainingCount,
        next_tier: nextThreshold == null ? null : `${nextThreshold} Punkte`,
        complete,
      }],
    })
    const { container } = await renderMemberPage(profile)
    const stage = container.querySelector('[data-points-achievement-stage]') as HTMLElement
    expect(stage).not.toBeNull()

    const current = stage.querySelector('[aria-current="step"]')
    if (expectedCode == null) {
      expect(current).toBeNull()
      expect(stage.querySelector('[data-achievement-art^="point_milestone_"]')).toBeNull()
    } else {
      expect(current?.getAttribute('data-badge-code')).toBe(expectedCode)
      expect(stage.querySelector(`[data-achievement-art="${expectedCode}"]`)).not.toBeNull()
    }

    const progress = within(stage).getByRole('progressbar', { name: /Punkte/ })
    const boundedMax = nextThreshold ?? 2500
    expect(progress.getAttribute('aria-valuenow')).toBe(String(Math.min(totalPoints, boundedMax)))
    expect(progress.getAttribute('aria-valuemax')).toBe(String(boundedMax))
    expect(stage.textContent).toContain(`${totalPoints.toLocaleString('de-CH')} Punkte`)
    expect(stage.textContent?.includes('Noch ')).toBe(!complete)
  })

  it('keeps initial point selection props-only during repeat server renders', async () => {
    const profile = makePublicProfile({
      total_points: 734,
      badge_progress: [{ family: 'points', current_count: 734, next_threshold: 1000, remaining_count: 266, next_tier: '1000 Punkte', complete: false }],
    })
    const first = await renderMemberPage(profile)
    const firstMarkup = first.container.querySelector('[data-points-achievement-stage]')?.outerHTML
    first.unmount()
    reactCacheEntries.splice(0)
    const second = await renderMemberPage(profile)
    const secondMarkup = second.container.querySelector('[data-points-achievement-stage]')?.outerHTML

    expect(firstMarkup).toBeTruthy()
    expect(secondMarkup).toBe(firstMarkup)
    expect(firstMarkup).not.toMatch(/Date\.now|localStorage|sessionStorage|matchMedia|innerWidth/)
  })
})

describe('Phase 126 membership SSR projection', () => {
  it('keeps membership visible at zero and below five', async () => {
    for (const currentCount of [0, 1, 4]) {
      const view = await renderMemberPage(makePublicProfile({
        public_badges: [],
        badge_progress: [{
          family: 'membership', current_count: currentCount, next_threshold: 5,
          remaining_count: 5 - currentCount, next_tier: '5 Jahre', complete: false,
        }],
      }))
      expect(view.container.textContent).toContain('Mitgliedschaft')
      expect(view.container.textContent).toContain('5+ Jahre Mitglied')
      expect(view.container.textContent).not.toContain('Gründungsmitglied')
      view.unmount()
      reactCacheEntries.splice(0)
    }
  })
})

describe('Phase 127 RED SSR hero composition', () => {
  it('Phase 127 RED page forwards public badges through one cached request and suppresses legacy Special', async () => {
    getMemberProfileMock.mockResolvedValue({
      data: makePublicProfile({
        is_verified: true,
      public_badges: [
        { id: 1, badge_code: 'historical_leader', badge_category: 'historical_achievement' },
        { id: 2, badge_code: 'all_rounder', badge_category: 'historical_achievement' },
        { id: 3, badge_code: 'verified', badge_category: 'historical_achievement' },
        { id: 4, badge_code: 'founding_member', badge_category: 'historical_achievement' },
      ],
      }),
      viewer: { is_owner: false, is_private_preview: false },
    })
    await generateMetadata({ params: { slug: 'ballelboy' } })
    const page = await MemberProfilePage({ params: { slug: 'ballelboy' } })
    const { container } = render(page)
    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    expect(getMemberProfileMock).toHaveBeenCalledWith('ballelboy')
    const hero = screen.getByTestId('member-profile-hero-panel')
    const list = within(hero).getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Historische Leitung', 'Allrounder'])
    expect(within(hero).getAllByText('Verifiziert')).toHaveLength(1)
    expect(within(hero).queryByText('Gründungsmitglied')).toBeNull()
    expect(container.querySelector('[data-badge-group="special"]')).toBeNull()
    expect(screen.getByRole('button', { name: /Gründungsmitglied Vorschau/ })).not.toBeNull()
  })
})


describe('Quick 260811-pqe responsive profile composition', () => {
  it('pins distinct profile and history-aware contribution grids without global word breaking', () => {
    expect(memberPageStyles).toMatch(/\.profilePair\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 8fr\) minmax\(0, 5fr\)/)
    expect(memberPageStyles).toMatch(/\.contributionPairPresent\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 3fr\) minmax\(20rem, 2fr\)/)
    expect(memberPageStyles).toMatch(/\.contributionPairEmpty\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 3fr\) minmax\(14rem, 1fr\)/)
    expect(memberPageStyles).not.toMatch(/\.sectionPair\s*>\s*\*\s*\{[^}]*overflow-wrap:\s*anywhere/s)
    expect(memberPageStyles).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.profilePair,[\s\S]*?\.contributionPairPresent,[\s\S]*?\.contributionPairEmpty\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/)
  })
})

describe('Quick 260811-rms widescreen profile balance', () => {
  it('keeps profile columns balanced on widescreen and stacks them through tight tablet widths', () => {
    const profileRule = memberPageStyles.match(/^\.profilePair\s*\{[\s\S]*?^\}/m)?.[0] ?? ''
    expect(profileRule).toMatch(/grid-template-columns:\s*minmax\(0, 8fr\) minmax\(0, 5fr\)/)

    const profileChildrenRule = memberPageStyles.match(/^\.sectionPair\s*>\s*\*\s*\{[\s\S]*?^\}/m)?.[0] ?? ''
    expect(profileChildrenRule).toContain('min-width: 0;')
    expect(profileChildrenRule).not.toContain('overflow-wrap: anywhere')

    expect(memberPageStyles).toMatch(/@media \(max-width: 1399px\)[\s\S]*?\.profilePair\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/)
    expect(memberPageStyles).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.profilePair,[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/)

    expect(profileRule).not.toMatch(/(?:width:\s*\d|100vw|overflow-x:\s*hidden|margin-(?:left|right):\s*-)/)
    expect(memberPageStyles).not.toMatch(/\.profilePair\s*\{[^}]*overflow-wrap:\s*anywhere/s)
  })
})

describe('Quick 260812-rps full-page responsive contract', () => {
  it('stacks constrained pairs before tablet portrait geometry fails without clipping the page', () => {
    const pageRule = memberPageStyles.match(/^\.page\s*\{[\s\S]*?^\}/m)?.[0] ?? ''
    expect(pageRule).not.toMatch(/(?:overflow-wrap:\s*anywhere|overflow-x:\s*hidden|width:\s*100vw|margin-(?:left|right):\s*-)/)
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*1099px\)[\s\S]*?\.contributionPairPresent,[\s\S]*?\.contributionPairEmpty\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
    expect(memberPageStyles).toMatch(/\.sectionPair\s*>\s*\*\s*\{[^}]*min-width:\s*0;/s)
    expect(memberPageStyles).not.toMatch(/word-break:\s*break-all/)
  })
})

describe('Quick 260812-rps widescreen UAT regression', () => {
  it('keeps the shared section edges aligned and the profile pair near 60/40', () => {
    expect(memberPageStyles).toMatch(/\.profilePair\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*8fr\) minmax\(0,\s*5fr\)/s)
    const visualBand = memberPageStyles.match(/\.badgesVisualBand\s*\{[^}]*\}/s)?.[0] ?? ''
    expect(visualBand).toContain('width: 100%;')
    expect(visualBand).not.toMatch(/(?:100vw|left:\s*50%|translateX)/)
    expect(memberPageStyles).not.toMatch(/\.contributionPairEmpty\s*\{[^}]*\.contributionPairPresent/s)
  })
})

describe('Quick 260812-jtp owner-scoped vertical rhythm', () => {
  it('uses the shared spacing scale for outer sections, bands, pairs and heading content', () => {
    expect(memberPageStyles).toMatch(/\.section\s*\{[^}]*margin:\s*0 auto var\(--space-4\);/s)
    expect(memberPageStyles).toMatch(/\.rhythmBand\s*\{[^}]*gap:\s*var\(--space-4\);[^}]*padding:\s*var\(--space-5\);/s)
    expect(memberPageStyles).toMatch(/\.sectionPair\s*\{[^}]*gap:\s*var\(--space-4\);/s)
    expect(memberPageStyles).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.rhythmBand\s*\{[^}]*padding:\s*var\(--space-4\);/s)
  })
})

it('Quick 260812-lql reserves two columns only for populated previous contributions', () => {
  const emptyRules = [...memberPageStyles.matchAll(/\.contributionPairEmpty\s*\{([^}]*)\}/g)]
  expect(emptyRules.at(-1)?.[1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
  expect(memberPageStyles).toMatch(/\.contributionPairPresent\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*3fr\) minmax\(20rem,\s*2fr\)/s)
})

describe('Phase 128 authoritative profile composition', () => {
  it('Phase128AuthoritativeCompositionExtraction', () => {
    const requiredComposition = [
      'MemberProfileHero',
      'MemberStorySection',
      'MembershipsSection',
      'MemberCurrentProjectsSection',
      'MemberBadgeChain',
      'LatestContributionsSection',
      'PreviousContributionsSection',
    ]

    expect({
      routeLocalComponentExists: memberProfileContentSource.length > 0,
      exportsReusableComposition: memberProfileContentSource.includes(
        'export function MemberProfileContent',
      ),
      acceptsAuthoritativeProfile: memberProfileContentSource.includes(
        'profile: PublicMemberProfileData',
      ),
      acceptsStoredSlug: memberProfileContentSource.includes('storedSlug: string'),
      acceptsViewerAccess: memberProfileContentSource.includes('viewer: PublicMemberViewer'),
      preservesEverySection: requiredComposition.every((name) => (
        memberProfileContentSource.includes(name)
      )),
      pageDelegatesComposition: memberPageSource.includes('<MemberProfileContent'),
      pageDoesNotOwnHero: !memberPageSource.includes('<MemberProfileHero'),
    }).toEqual({
      routeLocalComponentExists: true,
      exportsReusableComposition: true,
      acceptsAuthoritativeProfile: true,
      acceptsStoredSlug: true,
      acceptsViewerAccess: true,
      preservesEverySection: true,
      pageDelegatesComposition: true,
      pageDoesNotOwnHero: true,
    })
  })
})

describe('Phase 128 neutral public-member route contract', () => {
  const nextNotFound = new Error('NEXT_NOT_FOUND')

  async function recordsNotFound(slug: string, response: 'not-found' | 'private-denied') {
    reactCacheEntries.splice(0)
    getMemberProfileMock.mockReset()
    notFoundMock.mockReset()
    notFoundMock.mockImplementation(() => {
      throw nextNotFound
    })
    getMemberProfileMock.mockRejectedValue(Object.assign(new Error(response), { status: 404 }))

    let thrown: unknown
    try {
      await MemberProfilePage({ params: { slug } })
    } catch (error) {
      thrown = error
    }

    return {
      invoked: thrown === nextNotFound && notFoundMock.mock.calls.length === 1,
      profileRequests: getMemberProfileMock.mock.calls.length,
    }
  }

  it('Phase128PageInvokesNotFound', async () => {
    const missing = await recordsNotFound('missing-member', 'not-found')
    const privateDenied = await recordsNotFound('private-member', 'private-denied')
    const numeric = await recordsNotFound('123', 'not-found')
    const invalid = await recordsNotFound('encoded%2Fslash', 'not-found')

    reactCacheEntries.splice(0)
    getMemberProfileMock.mockReset()
    getMemberProfileMock.mockRejectedValue(Object.assign(new Error('not-found'), { status: 404 }))
    const metadata = await generateMetadata({ params: { slug: 'metadata-missing-member' } })

    expect({ missing, privateDenied, numeric, invalid, metadata }).toEqual({
      missing: { invoked: true, profileRequests: 1 },
      privateDenied: { invoked: true, profileRequests: 1 },
      numeric: { invoked: true, profileRequests: 0 },
      invalid: { invoked: true, profileRequests: 0 },
      metadata: {
        title: 'Profil nicht verfügbar | Team4s',
        robots: { index: false, follow: false },
      },
    })
  })

  it('keeps the server route anonymous, token-free and authoritative', () => {
    expect({
      readsServerCookies: /from ['"]next\/headers['"]/.test(memberPageSource),
      importsTokenConstant: memberPageSource.includes('AUTH_TOKEN_COOKIE_NAME'),
      passesTokenArgument: /getMemberProfile\s*\(\s*slug\s*,/.test(memberPageSource),
      rendersLegacyPreview: memberPageSource.includes('OwnHiddenProfilePreview'),
      invokesNextNotFound: /notFound\s*\(\s*\)/.test(memberPageSource),
      delegatesAllowedData: memberPageSource.includes('<MemberProfileContent'),
      usesGenericErrorState: memberPageSource.includes('<ErrorState'),
    }).toEqual({
      readsServerCookies: false,
      importsTokenConstant: false,
      passesTokenArgument: false,
      rendersLegacyPreview: false,
      invokesNextNotFound: true,
      delegatesAllowedData: true,
      usesGenericErrorState: true,
    })
  })

  it('uses the exact generic state for non-404 failures', async () => {
    reactCacheEntries.splice(0)
    getMemberProfileMock.mockReset()
    getMemberProfileMock.mockRejectedValue(new Error('sensitive backend detail'))

    const page = await MemberProfilePage({ params: { slug: 'transport-failure' } })
    render(page)

    expect(screen.getByRole('heading', { name: 'Profil konnte nicht geladen werden' })).toBeTruthy()
    expect(screen.getByText('Bitte versuche es später erneut.')).toBeTruthy()
    expect(screen.queryByText('sensitive backend detail')).toBeNull()
  })

  it('keeps route-owned client-gate geometry without the reduced legacy grid', () => {
    expect(memberPageStyles).toContain('container-type: inline-size;')
    expect(memberPageStyles).toMatch(
      /@container owner-preview-notice \(min-width:\s*36rem\)/,
    )
    expect(memberPageStyles).toContain('min-width: 0;')
    expect(memberPageStyles).not.toContain('overflow-wrap: anywhere')
    expect(memberPageStyles).not.toMatch(
      /\.(?:profileGrid|storySection|fullWidthSection|contentSection)\b/,
    )
  })
})
