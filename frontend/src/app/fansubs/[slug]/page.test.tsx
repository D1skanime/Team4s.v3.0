// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicFansubProfileResponse } from '@/types/fansub'

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

    constructor(message: string, status: number) {
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

function makeProfileResponse(): PublicFansubProfileResponse {
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
    },
  }
}

async function renderFansubProfilePage(profile = makeProfileResponse()) {
  getPublicFansubProfileBySlugMock.mockResolvedValue(profile)
  getFansubGroupDomainProjectionMock.mockResolvedValue({
    members: [],
    historical: [],
    contributors: [],
  })
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
