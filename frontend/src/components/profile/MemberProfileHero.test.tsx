// @vitest-environment jsdom

import type { ImgHTMLAttributes } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MemberProfileData, PublicMemberProfileData } from '@/types/profile'

import { MemberProfileHero } from './MemberProfileHero'

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

function makePublicProfile(overrides: Partial<PublicMemberProfileData> = {}): PublicMemberProfileData {
  return {
    member_id: 3,
    fansub_name: 'Ballelboy',
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
    recent_media: [],
    recent_contributions: [],
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
