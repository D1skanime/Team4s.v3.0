// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import type { ImgHTMLAttributes } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MemberProfileData, PublicMemberProfileData, PublicMemberProfileBackgroundImage } from '@/types/profile'

import { MemberProfileHero } from './MemberProfileHero'

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill,
    fetchPriority,
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean
    fetchPriority?: 'high' | 'low' | 'auto'
    unoptimized?: boolean
  }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        data-fill={fill ? 'true' : 'false'}
        data-unoptimized={unoptimized ? 'true' : 'false'}
        {...({ fetchpriority: fetchPriority } as Record<string, string | undefined>)}
        {...props}
      />
    )
  },
}))

function makePublicProfile(overrides: Partial<PublicMemberProfileData> = {}): PublicMemberProfileData {
  return {
    member_id: 3,
    fansub_name: 'Ballelboy',
    slug: 'ballelboy',
    bio: 'Typesetting und Timing.',
    active_from_date: '2016-01-01',
    active_until_date: null,
    is_currently_active: true,
    noindex: false,
    is_verified: false,
    profile_status: 'active',
    profile_visibility: 'public',
    avatar: null,
    background_image: null,
    memberships: [],
    public_badges: [],
    badge_progress: [],
    total_points: 0,
    ...overrides,
  }
}

function makePrivateProfile(overrides: Partial<MemberProfileData> = {}): MemberProfileData {
  return {
    member_id: 3,
    has_member_profile: true,
    has_project_assignments: false,
    app_user_id: 10,
    display_name: 'Ballelboy',
    fansub_name: 'Ballelboy',
    slug: 'ballelboy',
    email: 'ballelboy@example.test',
    keycloak_subject: 'kc-3',
    bio: null,
    active_from_date: null,
    active_until_date: null,
    is_currently_active: true,
    noindex: false,
    is_verified: false,
    profile_visibility: 'public',
    avatar: null,
    background_image: null,
    capabilities: {
      can_view_own_profile: true,
      can_edit_own_profile: true,
      can_upload_own_avatar: true,
      can_open_keycloak_account: true,
      can_view_memberships: true,
      can_view_historical_credits: true,
    },
    memberships: [],
    historical_credits: [],
    recent_media: [],
    recent_contributions: [],
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
    account_status: 'active',
    account_display_name: 'Ballelboy',
    account_global_roles: [],
    ...overrides,
  }
}

// Wave-0 RED-Stub: Memorial-Variante (D-10, C)
// MemberProfileHero muss bei profile_status='memorial' den Gedenk-Text rendern
// und Mengen-/Gamification-Badges unterdrücken.
// RED: profile_status existiert noch nicht in PublicMemberProfileData → Kompilierungsfehler.
describe('MemberProfileHero — Memorial-Variante (Wave-0 RED, D-10)', () => {
  it('rendert Gedenk-Sprache bei profile_status="memorial"', () => {
    render(
      <MemberProfileHero
        profile={makePublicProfile({ profile_status: 'memorial' })}
        isPublicView={true}
      />,
    )

    // Exakter Pflicht-String laut CLAUDE.md §Sprachqualität (D-10)
    expect(screen.getByText('Dieses Profil wird als historisches Gedenkprofil geführt.')).not.toBeNull()
  })

  it('unterdrückt Mengen-/Aktivitäts-Badges bei profile_status="memorial" (D-10)', () => {
    render(
      <MemberProfileHero
        profile={makePublicProfile({ profile_status: 'memorial' })}
        isPublicView={true}
      />,
    )

    // Keine Aktivitätsmetrik-Anzeige (Mengen-/Gamification-Badges verboten bei Memorial)
    const activityMetric = document.querySelector('[data-testid="activity-metric"]')
    if (activityMetric !== null) {
      throw new Error('Mengen-/Aktivitäts-Badge darf bei Memorial-Profil nicht gerendert werden (D-10)')
    }
  })
})

describe('MemberProfileHero', () => {
  it('locks the Hero B responsive geometry and local copy-zone treatment', () => {
    const css = readFileSync('src/components/profile/profile.module.css', 'utf8')

    expect(css).toMatch(/\.heroPanel\s*\{[\s\S]*?min-height:\s*230px[\s\S]*?grid-template-columns:\s*140px minmax\(0, 1fr\)[\s\S]*?gap:\s*24px[\s\S]*?padding:\s*32px/)
    expect(css).toMatch(/@media \(max-width:\s*1099px\)[\s\S]*?\.heroPanel\s*\{[\s\S]*?min-height:\s*220px[\s\S]*?grid-template-columns:\s*120px minmax\(0, 1fr\)[\s\S]*?padding:\s*24px/)
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.heroPanel\s*\{[\s\S]*?min-height:\s*0[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)[\s\S]*?padding:\s*16px/)
    expect(css).toMatch(/\.heroAvatar\s*\{[\s\S]*?width:\s*140px[\s\S]*?height:\s*140px/)
    expect(css).toMatch(/@media \(max-width:\s*1099px\)[\s\S]*?\.heroAvatar\s*\{[\s\S]*?width:\s*120px[\s\S]*?height:\s*120px/)
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*?\.heroAvatar\s*\{[\s\S]*?width:\s*100px[\s\S]*?height:\s*100px/)
    expect(css).toMatch(/\.heroPanel::after\s*\{[\s\S]*?linear-gradient\([\s\S]*?65%[\s\S]*?transparent/)
    expect(css).toMatch(/\.heroStatusSurface[\s\S]*?var\(--surface-card\)/)
    expect(css).not.toMatch(/\.heroBackdrop img\s*\{[^}]*object-position:\s*center\s+(?:42|34)%/s)
    expect(css).not.toMatch(/\.heroBio\s*\{[^}]*-webkit-line-clamp/s)
    expect(css).not.toMatch(/\.(?:heroAvatar|heroTitle|heroEyebrow)\s*\{[^}]*font-weight:\s*(?:800|850|900)/s)
  })

  it.each([
    {
      label: 'public DTO',
      profile: makePublicProfile({
        member_id: 73,
        fansub_name: 'Umbenannter Anzeigename',
        slug: 'gespeicherte-identitaet',
      }),
    },
    {
      label: 'own DTO',
      profile: makePrivateProfile({
        member_id: 73,
        fansub_name: 'Umbenannter Anzeigename',
        slug: 'gespeicherte-identitaet',
      }),
    },
  ])('uses the stored canonical slug for the $label public-profile action', ({ profile }) => {
    render(<MemberProfileHero profile={profile} isPublicView={false} />)

    expect(screen.getByRole('link', { name: /ffentliches Profil ansehen/ }).getAttribute('href')).toBe(
      '/members/gespeicherte-identitaet',
    )
  })

  it('keeps the public-profile URL stable when the nickname changes', () => {
    const { rerender } = render(
      <MemberProfileHero
        profile={makePrivateProfile({ fansub_name: 'Alter Name', slug: 'stabile-identitaet' })}
        isPublicView={false}
      />,
    )

    rerender(
      <MemberProfileHero
        profile={makePrivateProfile({ fansub_name: 'Neuer Name', slug: 'stabile-identitaet' })}
        isPublicView={false}
      />,
    )

    expect(screen.getByRole('link', { name: /ffentliches Profil ansehen/ }).getAttribute('href')).toBe(
      '/members/stabile-identitaet',
    )
  })

  it('omits the public-profile action when runtime data has no stored slug', () => {
    const profileWithoutSlug = {
      ...makePrivateProfile(),
      slug: undefined,
    } as unknown as MemberProfileData

    render(<MemberProfileHero profile={profileWithoutSlug} isPublicView={false} />)

    expect(screen.queryByRole('link', { name: /ffentliches Profil ansehen/ })).toBeNull()
    expect(document.body.innerHTML).not.toContain('/members/3')
  })

  it('rejects numeric, nickname-derived, and union-shape fallbacks in the shared hero source', () => {
    const source = readFileSync('src/components/profile/MemberProfileHero.tsx', 'utf8')
    const hrefHelper = source.match(/function getPublicProfileHref[\s\S]*?\n\}/)?.[0] ?? ''

    expect(hrefHelper).toContain('profile.slug')
    expect(hrefHelper).not.toContain('profile.member_id')
    expect(hrefHelper).not.toContain("'slug' in profile")
    expect(hrefHelper).not.toMatch(/slugify|normalize|fansub_name|display_name/i)
  })

  it('Phase 120 RED: prioritizes both hero background and avatar with differentiated discovery', () => {
    const { container } = render(
      <MemberProfileHero
        profile={makePublicProfile()}
        backgroundImageURL="/media/profile/3/background/current/display.jpg"
        avatarURL="/media/profile/3/avatar/current/display.png"
        isPublicView={true}
      />,
    )

    const background = container.querySelector('img[alt=""]')
    const avatar = screen.getByRole('img', { name: 'Ballelboy Avatar' })

    expect(background).not.toBeNull()
    expect(background?.getAttribute('src')).toBe('/media/profile/3/background/current/display.jpg')
    expect(background?.getAttribute('loading')).toBe('eager')
    expect(background?.getAttribute('fetchpriority')).toBe('high')
    expect(avatar.getAttribute('loading')).toBe('eager')
    expect(avatar.getAttribute('loading')).not.toBe('lazy')
    expect(avatar.getAttribute('width')).toBe('140')
    expect(avatar.getAttribute('height')).toBe('140')
    expect(avatar.getAttribute('sizes')).toBe(
      '(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px',
    )
  })

  it.each([
    ['light', '/media/profile/3/background/current/light-artwork.jpg'],
    ['dark', '/media/profile/3/background/current/dark-artwork.jpg'],
  ])('keeps the same prioritized centered Hero B contract for %s artwork', (_tone, backgroundURL) => {
    const { container } = render(
      <MemberProfileHero
        profile={makePublicProfile()}
        backgroundImageURL={backgroundURL}
        isPublicView={true}
      />,
    )

    const background = container.querySelector('img[alt=""]')
    expect(background?.getAttribute('src')).toBe(backgroundURL)
    expect(background?.getAttribute('loading')).toBe('eager')
    expect(background?.getAttribute('fetchpriority')).toBe('high')
    expect(background?.getAttribute('sizes')).toContain('1360px')
  })

  it('keeps the complete Hero B fallback when member images are absent', () => {
    const { container } = render(
      <MemberProfileHero profile={makePublicProfile()} isPublicView={true} />,
    )

    const panel = screen.getByTestId('member-profile-hero-panel')
    expect(container.querySelector('img[alt=""]')).toBeNull()
    expect(within(panel).getByRole('heading', { level: 1, name: 'Ballelboy' })).not.toBeNull()
    expect(within(panel).getByText('B')).not.toBeNull()
    expect(within(panel).getByText('Aktuell aktiv seit 2016')).not.toBeNull()
  })

  it('composes the public Hero B copy in the locked semantic order without leaking source originals', () => {
    const sourceOriginalURL = '/media/profile/3/background/source-original-secret.png'

    render(
      <MemberProfileHero
        profile={makePublicProfile({
          bio: 'Timing und Typesetting mit ruhigem Blick für lesbare Releases.',
          is_verified: true,
          total_points: 2840,
          // simuliert ein Backend, das faelschlich source_original_url mitschickt; das
          // oeffentliche Shape kennt das Feld nicht mehr (D-01) -> Cast beweist, es rendert nie.
          background_image: {
            public_url: '/media/profile/3/background/current/display.jpg',
            source_original_url: sourceOriginalURL,
          } as PublicMemberProfileBackgroundImage,
          current_projects: [
            {
              anime_id: 12,
              anime_title: 'Frieren',
              fansub_group_id: 7,
              fansub_group_name: 'Tsuki no Fansubs',
              roles: [{ code: 'timer', label_de: 'Timing' }, { code: 'typesetter', label_de: 'Typesetting' }],
              release_versions: [],
              is_project_level: false,
              contribution_status: 'confirmed',
            },
          ],
        })}
        backgroundImageURL="/media/profile/3/background/current/display.jpg"
        avatarURL="/media/profile/3/avatar/current/display.png"
        isPublicView={true}
        isVerified={true}
      />,
    )

    const panel = screen.getByTestId('member-profile-hero-panel')
    const copy = panel.textContent ?? ''
    const orderedCopy = [
      'Fansub-Member',
      'Ballelboy',
      'Verifiziert',
      'Aktiv',
      'Punkte',
      '2840',
      'Timing und Typesetting mit ruhigem Blick für lesbare Releases.',
      'Aktuell aktiv seit 2016',
      'Schwerpunkte: Timing, Typesetting',
    ]

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Aktiv').parentElement).toBe(
      screen.getByRole('heading', { level: 1 }).parentElement,
    )
    for (let index = 1; index < orderedCopy.length; index += 1) {
      expect(copy.indexOf(orderedCopy[index - 1])).toBeLessThan(copy.indexOf(orderedCopy[index]))
    }
    expect(document.body.innerHTML).not.toContain(sourceOriginalURL)
  })

  it('shows the public fansub activity period without adding a separate card', () => {
    render(<MemberProfileHero profile={makePublicProfile()} isPublicView={true} />)

    expect(screen.getByText('Aktuell aktiv seit 2016')).not.toBeNull()
  })

  it('shows a finished public fansub activity period', () => {
    render(<MemberProfileHero
      profile={makePublicProfile({
        active_until_date: '2020-01-01',
        is_currently_active: false,
      })}
      isPublicView={true}
    />)

    expect(screen.getByText('Aktiv von 2016 bis 2020')).not.toBeNull()
  })

  it('renders a year-only public activity period without fabricating a full date (D-02)', () => {
    render(<MemberProfileHero
      profile={makePublicProfile({
        active_from_date: null,
        active_until_date: null,
        active_from_year: 2015,
        active_until_year: 2019,
        is_currently_active: false,
      })}
      isPublicView={true}
    />)

    expect(screen.getByText('Aktiv von 2015 bis 2019')).not.toBeNull()
  })

  it('renders GIF avatars without Next image optimization so animation survives', () => {
    render(
      <MemberProfileHero
        profile={makePublicProfile()}
        avatarURL="/media/profile/3/avatar/current/original.gif"
        isPublicView={true}
      />,
    )

    const avatar = screen.getByRole('img', { name: 'Ballelboy Avatar' })
    expect(avatar.getAttribute('src')).toBe('/media/profile/3/avatar/current/original.gif')
    expect(avatar.getAttribute('data-unoptimized')).toBe('true')
  })

  it('shows the total points hero metric for a public profile with real points (D-02)', () => {
    render(
      <MemberProfileHero
        profile={makePublicProfile({ total_points: 220 })}
        isPublicView={true}
      />,
    )

    const metric = screen.getByLabelText('Mitglied-Punktzahl')
    expect(within(metric).getByText('Punkte')).not.toBeNull()
    expect(within(metric).getByText('220')).not.toBeNull()
    expect(screen.queryByText(/Platz \d/)).toBeNull()
  })

  it('still shows the honest zero total points hero metric, never hidden (D-02)', () => {
    render(
      <MemberProfileHero
        profile={makePublicProfile({ total_points: 0 })}
        isPublicView={true}
      />,
    )

    const metric = screen.getByLabelText('Mitglied-Punktzahl')
    expect(within(metric).getByText('Punkte')).not.toBeNull()
    expect(within(metric).getByText('0')).not.toBeNull()
  })

  it('never renders the total points hero metric on the own-profile edit view', () => {
    render(
      <MemberProfileHero
        profile={makePrivateProfile()}
        isPublicView={false}
      />,
    )

    expect(screen.queryByLabelText('Mitglied-Punktzahl')).toBeNull()
  })
})

describe('Phase 127 RED hero special awards', () => {
  const badge = (badge_code: string, id: number) => ({ id, badge_code, badge_category: 'historical_achievement' })

  it('Phase 127 RED hero renders no gap then Historical alone with approved decorative artwork', () => {
    const empty = render(<MemberProfileHero profile={makePublicProfile()} isPublicView={true} publicBadges={[]} />)
    expect(empty.queryByRole('list', { name: 'Besondere Auszeichnungen' })).toBeNull()
    empty.unmount()
    const { container } = render(<MemberProfileHero profile={makePublicProfile()} isPublicView={true} publicBadges={[badge('historical_leader', 1)]} />)
    const list = screen.getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('Historische Leitung')).not.toBeNull()
    expect(container.querySelector('img[src="/member-achievement-badges/special-historical_leader-v1.png"][alt=""]')).not.toBeNull()
  })

  it('Phase 127 RED hero renders Allrounder alone with Hexagon fallback and no invented image', () => {
    const { container } = render(<MemberProfileHero profile={makePublicProfile()} isPublicView={true} publicBadges={[badge('all_rounder', 2)]} />)
    const list = screen.getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('Allrounder')).not.toBeNull()
    expect(container.querySelector('[data-special-award-icon="all_rounder"]')).not.toBeNull()
    expect(container.querySelector('img[src*="all_rounder"]')).toBeNull()
  })

  it('Phase 127 RED hero renders both once in catalog order as a static nonfocusable list', () => {
    render(<MemberProfileHero profile={makePublicProfile()} isPublicView={true} publicBadges={[badge('all_rounder', 2), badge('historical_leader', 1), badge('historical_leader', 3)]} />)
    const list = screen.getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Historische Leitung', 'Allrounder'])
    expect(within(list).queryAllByRole('button')).toHaveLength(0)
    expect(list.querySelectorAll('[tabindex]')).toHaveLength(0)
    expect(list.querySelector('[aria-roledescription="Karussell"]')).toBeNull()
  })

  it('Phase 127 RED hero rejects Verified Founding role and unknown while Verifiziert stays once', () => {
    render(<MemberProfileHero profile={makePublicProfile({ is_verified: true })} isPublicView={true} isVerified={true} publicBadges={[badge('verified', 1), badge('founding_member', 2), badge('role_entry_timer', 3), badge('unknown', 4), badge('historical_leader', 5), badge('all_rounder', 6)]} />)
    const panel = screen.getByTestId('member-profile-hero-panel')
    expect(within(panel).getAllByText('Verifiziert')).toHaveLength(1)
    const list = within(panel).getByRole('list', { name: 'Besondere Auszeichnungen' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).queryByText('Gründungsmitglied')).toBeNull()
    expect(within(list).queryByText('Timing')).toBeNull()
  })

  it('Phase 127 RED hero CSS normalizes slots and wraps without responsive overflow', () => {
    const css = readFileSync('src/components/profile/profile.module.css', 'utf8')
    expect(css).toMatch(/\.heroSpecialAwardsList\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*min-width:\s*0;/s)
    expect(css).toMatch(/\.heroSpecialArtwork\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;/s)
    expect(css).toMatch(/\.heroSpecialArtwork img\s*\{[^}]*object-fit:\s*contain;/s)
    expect(css).not.toMatch(/\.heroSpecialAwardsList\s*\{[^}]*overflow-x:\s*(?:auto|scroll)/s)
  })
})

describe('Quick 260812-rps responsive Hero contract', () => {
  it('keeps identity, status, points and metadata shrinkable with normal local wrapping', () => {
    const css = readFileSync('src/components/profile/profile.module.css', 'utf8')
    const panelRule = css.match(/\.heroPanel\s*\{[^}]*\}/s)?.[0] ?? ''
    const copyRule = css.match(/\.heroCopy\s*\{[^}]*\}/s)?.[0] ?? ''
    expect(panelRule).toContain('min-width: 0;')
    expect(panelRule).toContain('max-width: 100%;')
    expect(copyRule).toContain('min-width: 0;')
    expect(copyRule).toContain('max-width: min(100%, 760px);')
    expect(css).toMatch(/\.(?:heroTitle|heroBio|heroMetaLine)\s*\{[^}]*overflow-wrap:\s*normal;/s)
    expect(css).toMatch(/\.membershipsList\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*18rem\),\s*1fr\)\)/s)
    expect(css).not.toMatch(/\.(?:heroTitle|heroBio|heroMetaLine)\s*\{[^}]*(?:overflow:\s*hidden|word-break:\s*break-all)/s)
  })
})
