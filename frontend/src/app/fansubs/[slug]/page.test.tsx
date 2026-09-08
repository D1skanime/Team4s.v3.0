// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicFansubProfile, PublicFansubProfileResponse } from '@/types/fansub'
import type {
  DomainProjectionHistoricalRow,
  DomainProjectionMemberRow,
  DomainProjectionResponse,
} from '@/types/domain-projection'
import { ApiError } from '@/lib/api'

import FansubProfilePage from './page'

const { getPublicFansubProfileBySlugMock, getFansubGroupDomainProjectionMock } = vi.hoisted(() => ({
  getPublicFansubProfileBySlugMock: vi.fn(),
  getFansubGroupDomainProjectionMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, priority, fill, ...props }: ImgHTMLAttributes<HTMLImageElement> & {
    unoptimized?: boolean
    priority?: boolean
    fill?: boolean
  }) => {
    void priority
    void fill
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError,
    getPublicFansubProfileBySlug: getPublicFansubProfileBySlugMock,
    getFansubGroupDomainProjection: getFansubGroupDomainProjectionMock,
    resolveApiUrl: (value: string) => value,
  }
})

function makeProfileResponse(overrides: Partial<PublicFansubProfile> = {}): PublicFansubProfileResponse {
  return {
    data: {
      group: {
        id: 1,
        slug: 'c-subs',
        name: 'C-Subs',
        logo_url: null,
        banner_url: null,
        founded_year: 2006,
        dissolved_year: null,
        closed_year: null,
        status: 'active',
        anime_relations_count: 1,
        projects_count: 1,
        release_versions_count: 12,
        members_count: 4,
        aliases_count: 0,
        created_at: '2026-07-14T00:00:00Z',
        updated_at: '2026-07-14T00:00:00Z',
      },
      stories: [],
      projects: [
        {
          id: 13,
          anime_slug: 'vipers-creed',
          title: "Viper's Creed",
          type: 'TV',
          status: 'ongoing',
          year: 2009,
          cover_image: null,
          max_episodes: 12,
          banner_url: '/api/media/vipers-creed-banner.jpg',
        },
      ],
      history: [],
      media: [],
      community_links: [],
      ...overrides,
    },
  }
}

async function renderFansubProfilePage(
  profile = makeProfileResponse(),
  domainProjection: DomainProjectionResponse = { members: [], historical: [], contributors: [] },
) {
  getPublicFansubProfileBySlugMock.mockResolvedValue(profile)
  getFansubGroupDomainProjectionMock.mockResolvedValue(domainProjection)
  const result = await FansubProfilePage({ params: Promise.resolve({ slug: 'c-subs' }) })
  return render(result)
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FansubProfilePage project routing (102-02)', () => {
  it("verdrahtet den Viper's-Creed-Projektclick von /fansubs/c-subs auf die Pretty-Route", async () => {
    await renderFansubProfilePage()

    expect(getPublicFansubProfileBySlugMock).toHaveBeenCalledWith('c-subs')
    expect(screen.getByRole('link', { name: /Viper's Creed/ }).getAttribute('href')).toBe(
      '/fansubs/c-subs/fansubprojekt/vipers-creed',
    )
    expect(screen.getByRole('link', { name: /Viper's Creed/ }).getAttribute('href')).not.toBe('/anime/13/group/1')
  })
})

describe('FansubProfilePage composition (152-06)', () => {
  const emptyDomainProjection: DomainProjectionResponse = { members: [], historical: [], contributors: [] }

  const sectionHeadings = ['Geschichte', 'Projekte', 'Team & Mitglieder', 'Historie & Erfolge', 'Medien']

  it('rendert bei komplett leeren Sektionsdaten nur den Hero, keine Sektions-Header', async () => {
    const profile = makeProfileResponse({ stories: [], projects: [], history: [], media: [] })

    await renderFansubProfilePage(profile, emptyDomainProjection)

    expect(screen.getByRole('heading', { level: 1, name: 'C-Subs' })).toBeTruthy()
    sectionHeadings.forEach((title) => {
      expect(screen.queryByRole('heading', { name: title })).toBeNull()
    })
  })

  it('zeigt die Historie-Sektion nur bei nicht-leerer history', async () => {
    const withHistory = makeProfileResponse({
      history: [
        { id: 1, year: 2012, event_type: 'founding', title: null, note: null, status: 'active' },
      ],
    })

    await renderFansubProfilePage(withHistory, emptyDomainProjection)

    expect(screen.getByRole('heading', { name: 'Historie & Erfolge' })).toBeTruthy()
  })

  it('blendet die Historie-Sektion bei leerer history aus', async () => {
    const withoutHistory = makeProfileResponse({ history: [] })

    await renderFansubProfilePage(withoutHistory, emptyDomainProjection)

    expect(screen.queryByRole('heading', { name: 'Historie & Erfolge' })).toBeNull()
  })

  it('zeigt die Medien-Sektion nur bei nicht-leerem media', async () => {
    const withMedia = makeProfileResponse({
      media: [
        {
          id: 1,
          media_type: 'image',
          caption: null,
          mime_type: 'image/png',
          thumbnail_url: '/media/thumb.png',
          original_url: '/media/original.png',
          title: 'Gruppenfoto',
          description: null,
          category: 'gallery',
        },
      ],
    })

    await renderFansubProfilePage(withMedia, emptyDomainProjection)

    expect(screen.getByRole('heading', { name: 'Medien' })).toBeTruthy()
  })

  it('blendet die Medien-Sektion bei leerem media aus', async () => {
    const withoutMedia = makeProfileResponse({ media: [] })

    await renderFansubProfilePage(withoutMedia, emptyDomainProjection)

    expect(screen.queryByRole('heading', { name: 'Medien' })).toBeNull()
  })

  it('degradiert bei fehlgeschlagener Domain-Projection auf einen renderfähigen Fallback ohne Team-Sektion', async () => {
    getPublicFansubProfileBySlugMock.mockResolvedValue(makeProfileResponse())
    getFansubGroupDomainProjectionMock.mockRejectedValue(new Error('boom'))

    const result = await FansubProfilePage({ params: Promise.resolve({ slug: 'c-subs' }) })
    render(result)

    expect(screen.getByRole('heading', { level: 1, name: 'C-Subs' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Team & Mitglieder' })).toBeNull()
  })

  it('zeigt bei einem 404-Fehler die "nicht gefunden"-Meldung', async () => {
    getPublicFansubProfileBySlugMock.mockRejectedValue(new ApiError(404, 'not found'))

    const result = await FansubProfilePage({ params: Promise.resolve({ slug: 'c-subs' }) })
    render(result)

    expect(screen.getByText('Fansubgruppe nicht gefunden.')).toBeTruthy()
  })

  it('zeigt bei einem generischen Fehler die allgemeine Ladefehler-Meldung', async () => {
    getPublicFansubProfileBySlugMock.mockRejectedValue(new Error('network down'))

    const result = await FansubProfilePage({ params: Promise.resolve({ slug: 'c-subs' }) })
    render(result)

    expect(screen.getByText('Fansub-Profil konnte nicht geladen werden.')).toBeTruthy()
  })

  it('spiegelt die tatsächlich sichtbaren Daten in den Hero-Kennzahlen wider', async () => {
    const profile = makeProfileResponse({
      projects: [
        {
          id: 13,
          anime_slug: 'vipers-creed',
          title: "Viper's Creed",
          type: 'TV',
          status: 'ongoing',
          year: 2009,
          cover_image: null,
          max_episodes: 12,
          banner_url: null,
        },
        {
          id: 14,
          anime_slug: 'second-anime',
          title: 'Second Anime',
          type: 'TV',
          status: 'ongoing',
          year: 2010,
          cover_image: null,
          max_episodes: 12,
          banner_url: null,
        },
      ],
    })
    const activeMember: DomainProjectionMemberRow = {
      id: 1,
      member_id: 1,
      member_display_name: 'Alice',
      member_slug: 'alice',
      member_avatar_url: null,
      member_slogan: null,
      roles: ['translation'],
      role_labels: ['Übersetzung'],
      historical_role_labels: [],
      status: 'active',
      profile_status: 'active',
      claimed: true,
    }
    const memorialMember: DomainProjectionMemberRow = {
      ...activeMember,
      id: 2,
      member_id: 2,
      member_display_name: 'Bob',
      profile_status: 'memorial',
    }
    const historicalRow: DomainProjectionHistoricalRow = {
      id: 3,
      member_id: 3,
      member_display_name: 'Carol',
      member_slug: 'carol',
      member_avatar_url: null,
      member_slogan: null,
      roles: ['encoding'],
      role_labels: ['Encoding'],
      joined_year: 2010,
      left_year: 2015,
      status: 'inactive',
      profile_status: 'historical',
      claimed: false,
    }

    await renderFansubProfilePage(profile, {
      members: [activeMember, memorialMember],
      historical: [historicalRow],
      contributors: [],
    })

    const metrics = screen.getByLabelText('Gruppenkennzahlen')
    expect(metrics.textContent).toBe('Anime-Projekte2Release-Versionen12Mitglieder3')
  })
})
