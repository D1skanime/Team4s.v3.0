// @vitest-environment jsdom

import type { ImgHTMLAttributes } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PublicMemberProfileData } from '@/types/profile'

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
    recent_media: [],
    recent_contributions: [],
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
})
