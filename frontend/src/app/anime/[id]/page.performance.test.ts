// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cleanup, render } from '@testing-library/react'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BannerSection, ResponsiveImage, SplitLayout } from '@/components/ui'
import nextConfig from '../../../../next.config.mjs'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(), cache: <T,>(fn: T): T => fn,
}))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getAnimeByID: vi.fn(), getAnimeFansubs: vi.fn(), getGroupedEpisodes: vi.fn(),
  // getAnimeList ist defensiv mitgemockt (192-RESEARCH.md Pitfall 2): keine der bestehenden
  // Testfaelle dieser Datei setzt bislang einen grid_query-Suchparameter, ein kuenftiger Testfall
  // wuerde ohne diesen Eintrag sonst unbemerkt durch importOriginal auf einen echten fetch()
  // gegen das konfigurierte Backend durchfallen.
  getAnimeRelations: vi.fn(), getAnimeBackdrops: vi.fn(), getAnimeList: vi.fn(),
}))

import { getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeRelations, getAnimeBackdrops } from '@/lib/api'
import * as media from '@/lib/animeBackdrops'
import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import type { PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import AnimeDetailPage from './page'
import { AnimeDetailHero } from './AnimeDetailHero'

const groupedMock = vi.mocked(getGroupedEpisodes as (id: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('process', { ...process, env: {
    ...process.env, NEXT_PUBLIC_API_URL: 'http://192.168.235.196:18092',
    __NEXT_IMAGE_OPTS: { ...imageConfigDefault, ...nextConfig.images },
  } })
  vi.mocked(getAnimeFansubs).mockResolvedValue({ data: [] })
  groupedMock.mockResolvedValue({ data: { anime_id: 1, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
  vi.mocked(getAnimeRelations).mockResolvedValue({ data: [] })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    // Der Kopf ist seit der Storybook-Komposition eine eigene reine Darstellungskomponente.
    // Für die unveränderte Cover-Invariante wird er hier wie die Seitenansicht materialisiert,
    // damit Poster, Reflexion und die an den Rotator gereichte Quelle weiterhin geprüft werden.
    // SplitLayout reicht Poster-/Info-Spalte seit Befund 21 als firstColumn/secondColumn-PROPS
    // durch, nicht als `children` -- ohne diesen Zweig faende der Standard-Zweig nichts
    // innerhalb eines noch nicht materialisierten SplitLayout-Elements.
    if (child.type === AnimeDetailHero) {
      return [child, ...elements(AnimeDetailHero(child.props as unknown as Parameters<typeof AnimeDetailHero>[0]))]
    }
    if (child.type === SplitLayout) {
      const component = child.type as (props: Record<string, unknown>) => ReactNode
      return [child, ...elements(component(child.props))]
    }
    return [child, ...elements(child.props.children as ReactNode)]
  })
}


const detailPageSource = () => readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.tsx'), 'utf8')
// Seit dem Server/Ansicht-Split (261102-cb2) leben AnimeMediaProvider/AnimeBackdropRotator im
// JSX von AnimeDetailView.tsx, nicht mehr im JSX von page.tsx selbst -- page.tsx reicht nur noch
// die geladenen Daten als Props durch.
const detailViewSource = () => readFileSync(join(process.cwd(), 'src/app/anime/[id]/AnimeDetailView.tsx'), 'utf8')

describe('Anime-Detailseite Performance-Grenze', () => {
  it('blockiert das Server-Rendering nicht mehr auf dem Backdrop-Manifest', () => {
    const source = detailPageSource()

    expect(source).not.toMatch(/\bgetAnimeBackdrops\b/)
    expect(detailViewSource()).toMatch(/<AnimeMediaProvider\b/)
    expect(detailViewSource()).toMatch(/<AnimeBackdropRotator\b/)
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
    const contentElement = (await boundary.props.children.type(boundary.props.children.props)) as ReactElement<
      Record<string, unknown>
    >
    // `AnimeDetailContent` liefert seit dem Server/Ansicht-Split (261102-cb2) nur noch ein
    // einzelnes <AnimeDetailView ... />-Element statt des vollen verschachtelten JSX-Baums direkt
    // -- `AnimeDetailView` wird hier einmal synchron aufgerufen, um denselben verschachtelten
    // Baum wie vor dem Split für die bestehenden Struktur-Assertions bereitzustellen.
    const content = (contentElement.type as (props: Record<string, unknown>) => ReactNode)(
      contentElement.props,
    ) as ReactNode
    const all = elements(content)
    const poster = all.find((element) => element.type === ResponsiveImage && element.props.alt === 'Coverfixture')
    const hero = all.find((element) => element.type === BannerSection)
    const reflection = all.find((element) => (element.props.style as Record<string, string> | undefined)?.['--poster-image'])
    const rotator = all.find((element) => element.type === AnimeBackdropRotator)
    expect(resolveCover).toHaveBeenCalledExactlyOnceWith(rawCover)
    expect(poster?.props.src).toBe(expected)
    expect(poster?.props.unoptimized).toBe(true)
    expect(hero?.props.imageUrl).toBe(expected)
    expect(hero?.props.variant).toBe('anime')
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
