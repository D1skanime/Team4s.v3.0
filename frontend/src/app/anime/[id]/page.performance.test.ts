// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cleanup, render } from '@testing-library/react'
import Image from 'next/image'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '../../../../next.config.mjs'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(), cache: <T,>(fn: T): T => fn,
}))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getAnimeByID: vi.fn(), getAnimeFansubs: vi.fn(), getGroupedEpisodes: vi.fn(),
  getAnimeComments: vi.fn(), getAnimeRelations: vi.fn(), getAnimeBackdrops: vi.fn(),
}))

import { getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeComments, getAnimeRelations, getAnimeBackdrops } from '@/lib/api'
import * as media from '@/lib/animeBackdrops'
import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import type { PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import AnimeDetailPage from './page'

const groupedMock = vi.mocked(getGroupedEpisodes as (id: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('process', { ...process, env: {
    ...process.env, NEXT_PUBLIC_API_URL: 'http://192.168.235.196:18092',
    __NEXT_IMAGE_OPTS: { ...imageConfigDefault, ...nextConfig.images },
  } })
  vi.mocked(getAnimeFansubs).mockResolvedValue({ data: [] })
  groupedMock.mockResolvedValue({ data: { anime_id: 1, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
  vi.mocked(getAnimeComments).mockResolvedValue({ data: [], meta: { page: 1, per_page: 10, total: 0, total_pages: 0 } })
  vi.mocked(getAnimeRelations).mockResolvedValue({ data: [] })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Record<string, unknown>>(child)
    ? [child, ...elements(child.props.children as ReactNode)] : [])
}


const detailPageSource = () => readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.tsx'), 'utf8')

describe('Anime-Detailseite Performance-Grenze', () => {
  it('blockiert das Server-Rendering nicht mehr auf dem Backdrop-Manifest', () => {
    const source = detailPageSource()

    expect(source).not.toMatch(/\bgetAnimeBackdrops\b/)
    expect(source).toMatch(/<AnimeMediaProvider\b/)
    expect(source).toMatch(/<AnimeBackdropRotator\b/)
  })

  it('keeps viewer auth and extra link-resolution fetches outside the public server page', () => {
    const source = detailPageSource()
    expect(source).not.toMatch(/\b(cookies|AUTH_BEARER_TOKEN|AUTH_TOKEN_COOKIE_NAME|getWatchlistEntry|getWatchlistStatus)\b/)
    expect(source).not.toMatch(/\b(getGroupDetail|getPublicFansubProfileBySlug|resolveFansubProject)\b/)
  })
})


describe('one bounded cover for every detail consumer', () => {
  it.each([
    '/api/v1/media/image?provider=jellyfin&item_id=series&kind=primary',
    '/media/anime/1/poster/asset/original.jpg',
    undefined,
  ])('shares the generated display source across poster, hero, reflection and mounted rotator: %s', async (rawCover) => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: {
      id: 1, title: 'Coverfixture', type: 'tv', content_type: 'anime', status: 'done',
      view_count: 0, episodes: [], cover_image: rawCover,
    } })
    const expected = media.resolveAnimeCoverURL(rawCover)
    const resolveCover = vi.spyOn(media, 'resolveAnimeCoverURL')
    const boundary = await AnimeDetailPage({ params: Promise.resolve({ id: '1' }) })
    const content = await boundary.props.children.type(boundary.props.children.props) as ReactNode
    const all = elements(content)
    const poster = all.find((element) => element.type === Image && element.props.alt === 'Coverfixture')
    const hero = all.find((element) => (element.props.style as Record<string, string> | undefined)?.backgroundImage)
    const reflection = all.find((element) => (element.props.style as Record<string, string> | undefined)?.['--poster-image'])
    const rotator = all.find((element) => element.type === AnimeBackdropRotator)
    expect(resolveCover).toHaveBeenCalledExactlyOnceWith(rawCover)
    expect(poster?.props.src).toBe(expected)
    expect(poster?.props.unoptimized).toBe(true)
    expect((hero?.props.style as Record<string, string>).backgroundImage).toBe('url("' + expected + '")')
    expect((reflection?.props.style as Record<string, string>)['--poster-image']).toBe('url("' + expected + '")')
    expect(rotator?.props.fallbackImageURL).toBe(expected)
    expect(rotator?.props).not.toHaveProperty('coverImage')
    expect(getAnimeBackdrops).not.toHaveBeenCalled()

    const view = render(createElement(AnimeBackdropRotator, rotator?.props as unknown as Parameters<typeof AnimeBackdropRotator>[0]))
    const background = view.container.querySelector<HTMLElement>('[style]')
    expect(background?.style.backgroundImage).toBe('url("' + expected + '")')
    expect(getAnimeBackdrops).not.toHaveBeenCalled()
    expect(expected).not.toBe(rawCover)
  })
})

describe('Tags-Block ohne zusaetzliche Netzwerkkosten (Auftraggeber-Mandat Punkt 4/5)', () => {
  /** Rendert die Detailseite fuer die gegebenen Tags und zaehlt alle SSR-Datenabrufe. */
  async function totalFetchCallsFor(tags: string[] | undefined): Promise<number> {
    vi.clearAllMocks()
    vi.mocked(getAnimeFansubs).mockResolvedValue({ data: [] })
    groupedMock.mockResolvedValue({ data: { anime_id: 1, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
    vi.mocked(getAnimeComments).mockResolvedValue({ data: [], meta: { page: 1, per_page: 10, total: 0, total_pages: 0 } })
    vi.mocked(getAnimeRelations).mockResolvedValue({ data: [] })
    vi.mocked(getAnimeByID).mockResolvedValue({ data: {
      id: 1, title: 'Fetch-Paritaetsfixture', type: 'tv', content_type: 'anime', status: 'done',
      view_count: 0, episodes: [], tags,
    } })
    const boundary = await AnimeDetailPage({ params: Promise.resolve({ id: '1' }) })
    await boundary.props.children.type(boundary.props.children.props)
    return (
      vi.mocked(getAnimeByID).mock.calls.length
      + vi.mocked(getAnimeFansubs).mock.calls.length
      + groupedMock.mock.calls.length
      + vi.mocked(getAnimeComments).mock.calls.length
      + vi.mocked(getAnimeRelations).mock.calls.length
    )
  }

  it('zaehlt fuer eine Detailseite MIT Tags exakt dieselbe Anzahl an Fetch-Aufrufen wie OHNE Tags', async () => {
    const withTags = await totalFetchCallsFor(['Amnesia', 'Real Robot', 'PSI-Kräfte'])
    const withoutTags = await totalFetchCallsFor(undefined)
    expect(withTags).toBeGreaterThan(0)
    expect(withTags).toBe(withoutTags)
  })
})
