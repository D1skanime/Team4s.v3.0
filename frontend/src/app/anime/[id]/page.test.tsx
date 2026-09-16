import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Children, isValidElement, Suspense, type ReactElement, type ReactNode } from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { AnimeInfoBanner } from '@/components/anime/AnimeMediaProvider'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import AnimeListPage from '../page'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(), cache: <T,>(fn: T): T => fn,
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') } }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => ({ value: 'server-session-test' }) })) }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getAnimeList: vi.fn(), getAnimeByID: vi.fn(), getAnimeFansubs: vi.fn(), getGroupedEpisodes: vi.fn(),
  getAnimeComments: vi.fn(), getAnimeRelations: vi.fn(), getWatchlistEntry: vi.fn(),
}))

import { ApiError, getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeComments, getAnimeRelations, getWatchlistEntry } from '@/lib/api'
import type { PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import type { AnimeDetail } from '@/types/anime'
import AnimeDetailPage, { generateMetadata } from './page'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

const anime: AnimeDetail = {
  id: 22, slug: 'stored-slug', title: 'Tatsächlicher Anime', type: 'tv',
  content_type: 'anime', status: 'done', view_count: 0, episodes: [],
}
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAnimeByID).mockReset().mockResolvedValue({ data: anime })
  vi.mocked(getAnimeFansubs).mockReset().mockResolvedValue({ data: [] })
  groupedMock.mockReset().mockResolvedValue({ data: { anime_id: anime.id, episodes: [], pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
  vi.mocked(getAnimeComments).mockReset().mockResolvedValue({ data: [], meta: { page: 1, per_page: 10, total: 0, total_pages: 0 } })
  vi.mocked(getAnimeRelations).mockReset().mockResolvedValue({ data: [] })
})

describe('anime detail page and metadata', () => {
  it('uses the resource title and numeric canonical without the grid query', async () => {
    const metadata = await generateMetadata({
      ...paramsFor('00022'), searchParams: Promise.resolve({ from: 'grid', grid_query: 'page=2&q=other' }),
    })
    expect(metadata.title).toBe('Tatsächlicher Anime | Team4s')
    expect(metadata.alternates?.canonical).toBe('/anime/22')
  })

  it.each(['1abc', '1.5', '0', '-1', '9007199254740992'])('rejects %s in both resource consumers', async (id) => {
    await expect(AnimeDetailPage(paramsFor(id))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(generateMetadata(paramsFor(id))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(getAnimeByID).not.toHaveBeenCalled()
    expect(getAnimeFansubs).not.toHaveBeenCalled()
    expect(getGroupedEpisodes).not.toHaveBeenCalled()
    expect(getAnimeComments).not.toHaveBeenCalled()
    expect(getAnimeRelations).not.toHaveBeenCalled()
  })

  it('uses Next notFound for missing anime and metadata, which supplies robots noindex', async () => {
    vi.mocked(getAnimeByID).mockRejectedValue(new ApiError(404, 'Fehlt'))
    await expect(AnimeDetailPage(paramsFor('987'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(generateMetadata(paramsFor('987'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(getAnimeFansubs).not.toHaveBeenCalled()
  })

  it.each([new ApiError(500, 'Serverfehler'), new TypeError('Netzwerkfehler')])(
    'does not relabel technical failures as missing content (%s)', async (error) => {
      vi.mocked(getAnimeByID).mockRejectedValue(error)
      await expect(AnimeDetailPage(paramsFor('22'))).rejects.toBe(error)
      await expect(generateMetadata(paramsFor('22'))).rejects.toBe(error)
    },
  )
})

describe('loading boundaries follow resource validation', () => {
  it('does not inherit an automatic loading boundary on the anime detail route', () => {
    expect(existsSync(join(process.cwd(), 'src/app/anime/loading.tsx'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'src/app/anime/[id]/loading.tsx'))).toBe(false)
  })

  it('keeps the list loading UI in an explicit list-only Suspense', async () => {
    const page = await AnimeListPage({ searchParams: undefined })
    expect(page.type).toBe(Suspense)
    expect(page.props.fallback.type.name).toBe('AnimeListLoading')
  })

  it('validates the anime before returning its content boundary or starting secondary reads', async () => {
    const page = await AnimeDetailPage(paramsFor('22'))
    expect(getAnimeByID).toHaveBeenCalledWith(22)
    expect(page.type).toBe(Suspense)
    expect(page.props.fallback.type.name).toBe('AnimeDetailLoading')
    expect(getAnimeFansubs).not.toHaveBeenCalled()
    expect(getGroupedEpisodes).not.toHaveBeenCalled()
    expect(getAnimeComments).not.toHaveBeenCalled()
    expect(getAnimeRelations).not.toHaveBeenCalled()
  })
})

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    return [child, ...elements(child.props.children as ReactNode)]
  })
}
function textContent(node: ReactNode): string {
  return Children.toArray(node).map((child) =>
    isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child),
  ).join('')
}
async function loadContent(id = '22') {
  const boundary = await AnimeDetailPage(paramsFor(id))
  return boundary.props.children.type(boundary.props.children.props) as Promise<ReactNode>
}

describe('anime detail integration without invented data', () => {
  it('keeps public SSR free from viewer cookies and watchlist status reads', async () => {
    const content = await loadContent()
    expect(cookies).not.toHaveBeenCalled()
    expect(getWatchlistEntry).not.toHaveBeenCalled()
    const button = elements(content).find((item) => item.type === WatchlistAddButton)
    expect(button?.props.animeID).toBe(22)
    expect(button?.props).not.toHaveProperty('initiallyInWatchlist')
  })

  it('passes the stored anime slug without an additional anime read', async () => {
    const content = await loadContent()
    const browser = elements(content).find((item) => item.type === FansubVersionBrowser)
    expect(browser?.props.animeSlug).toBe('stored-slug')
    expect(getAnimeByID).toHaveBeenCalledTimes(1)
    expect(getAnimeFansubs).toHaveBeenCalledTimes(1)
  })

  it('removes the fabricated rating and anime view metrics while preserving the Anime 22 Emby target', async () => {
    const content = await loadContent()
    expect(textContent(content)).not.toMatch(/7\.8|Views/)
    const embyLink = elements(content).find((item) => item.type === 'a' && textContent(item.props.children as ReactNode).includes('Emby'))
    expect(embyLink?.props.href).toBe('https://anime.team4s.de/web/index.html#!/item?id=2112&serverId=8bc8ae6fe2d946fcbd21cb341832072d&context=tvshows')
  })

  it('does not leave an empty stats row for an anime without an Emby mapping', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, id: 23 } })
    const content = await loadContent('23')
    expect(elements(content).some((item) => String(item.props.className).includes('statsRow'))).toBe(false)
    expect(textContent(content)).not.toContain('Emby')
  })

  it('preserves the real episode inventory and stored fallback episode counters', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, max_episodes: 12, episodes: [{
      id: 73, episode_number: '1', title: 'Neutrale Folge', status: 'public', view_count: 3, download_count: 8,
    }] } })
    groupedMock.mockRejectedValue(new ApiError(500, 'Versionen nicht verfügbar'))
    const text = textContent(await loadContent())
    expect(text).toContain('12 Episodes')
    expect(text).toContain('Episoden (1)')
    expect(text).toContain('Neutrale Folge')
    expect(text).toContain('Views: 3 | Downloads: 8')
  })

  it('clips only the decorative hero banner, leaving the hero controls outside its clipping boundary', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.module.css'), 'utf8')
    expect(css.match(/\.heroBanner\s*\{([^}]+)\}/)?.[1]).toMatch(/overflow:\s*(hidden|clip)/)
    expect(css.match(/\.heroContainer\s*\{([^}]+)\}/)?.[1]).toMatch(/overflow:\s*visible/)
    expect(css.match(/\.page\s*\{([^}]+)\}/)?.[1]).not.toMatch(/overflow/)
  })
})

describe('bounded public SSR inventory', () => {
  it('requests one 24-row public page and forwards cursor/story without claiming the slice is the total', async () => {
    groupedMock.mockResolvedValue({ data: { anime_id: 22, episodes: [], pagination: { has_more: true, next_cursor: 'next', row_limit: 24 } } })
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, episodes: Array.from({ length: 30 }, (_, index) => ({
      id: index + 1, episode_number: String(index + 1), status: 'public' as const, view_count: 0, download_count: 0,
    })) } })
    const content = await loadContent()
    expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, { projection: 'public', limit: 24 })
    const browser = elements(content).find((item) => item.type === FansubVersionBrowser)
    expect(browser?.props.pagination).toEqual({ has_more: true, next_cursor: 'next', row_limit: 24 })
    expect(browser?.props.storyGroups).toEqual([])
    expect(textContent(content)).toContain('Episoden (30)')
  })
})

/** Zerlegt einen `/suche?...`-Chip-Link wieder in seine URLSearchParams zum Rundreise-Vergleich (D-09). */
function paramsFromHref(href: string): URLSearchParams {
  return new URLSearchParams(href.split('?')[1] ?? '')
}

describe('Tags-Block und Genre-Links (D-06/D-09/D-12-D-20)', () => {
  it('rendert die Ueberschrift "Tags" und einen Link-Chip je Tag in der vom Backend gelieferten Reihenfolge (kein Re-Sort)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Real Robot', 'Amnesia', 'Zeitreise'] } })
    const content = await loadContent()
    const all = elements(content)
    expect(textContent(content)).toMatch(/Tags/)
    const tagLinks = all.filter((item) => item.type === Link && String((item.props.href as string)).includes('tag='))
    expect(tagLinks).toHaveLength(3)
    expect(tagLinks.map((item) => textContent(item.props.children as ReactNode))).toEqual(['Real Robot', 'Amnesia', 'Zeitreise'])
  })

  it('rendert exakt einen Chip bei genau einem Tag (kein Leer-Container)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Amnesia'] } })
    const content = await loadContent()
    const tagLinks = elements(content).filter((item) => item.type === Link && String(item.props.href as string).includes('tag='))
    expect(tagLinks).toHaveLength(1)
    expect(textContent(tagLinks[0]?.props.children as ReactNode)).toBe('Amnesia')
  })

  it('rendert weder Ueberschrift noch Container bei fehlenden/leeren Tags (D-13)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: [] } })
    const contentEmpty = await loadContent()
    expect(elements(contentEmpty).some((item) => String(item.props.className ?? '').includes('tagsSection'))).toBe(false)
    expect(textContent(contentEmpty)).not.toMatch(/>?Tags</)

    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: undefined } })
    const contentUndefined = await loadContent()
    expect(elements(contentUndefined).some((item) => String(item.props.className ?? '').includes('tagsSection'))).toBe(false)
  })

  it('kodiert Leerzeichen und Umlaute im Tag-Link ueber URLSearchParams korrekt und rundreist zum Originalnamen (D-09)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Real Robot', 'PSI-Kräfte'] } })
    const content = await loadContent()
    const tagLinks = elements(content).filter((item) => item.type === Link && String(item.props.href as string).includes('tag='))
    const realRobot = tagLinks.find((item) => textContent(item.props.children as ReactNode) === 'Real Robot')
    const psiKraefte = tagLinks.find((item) => textContent(item.props.children as ReactNode) === 'PSI-Kräfte')
    expect(paramsFromHref(realRobot?.props.href as string).get('tag')).toBe('Real Robot')
    expect(paramsFromHref(realRobot?.props.href as string).get('type')).toBe('anime')
    expect(paramsFromHref(psiKraefte?.props.href as string).get('tag')).toBe('PSI-Kräfte')
  })

  it('jeder Tag-Chip ist ein echter Link mit dem Namen als einzigem sichtbarem/zugaenglichem Text (Tastatur-erreichbar per Anker-Semantik)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Amnesia'] } })
    const content = await loadContent()
    const tagLink = elements(content).find((item) => item.type === Link && String(item.props.href as string).includes('tag='))
    expect(tagLink?.type).toBe(Link)
    expect(tagLink?.props).not.toHaveProperty('tabIndex')
    expect(tagLink?.props).not.toHaveProperty('onClick')
    expect(textContent(tagLink?.props.children as ReactNode)).toBe('Amnesia')
  })

  it('der Tags-Block steht nach der Beschreibung und vor dem Emby-Bereich/AnimeInfoBanner in Dokumentreihenfolge (D-12)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, tags: ['Amnesia'] } })
    const content = await loadContent()
    const all = elements(content)
    const descriptionIndex = all.findIndex((item) => String(item.props.className ?? '').includes('description'))
    const tagsSectionIndex = all.findIndex((item) => String(item.props.className ?? '').includes('tagsSection'))
    const statsRowIndex = all.findIndex((item) => String(item.props.className ?? '').includes('statsRow'))
    const infoBannerIndex = all.findIndex((item) => item.type === AnimeInfoBanner)
    expect(descriptionIndex).toBeGreaterThanOrEqual(0)
    expect(tagsSectionIndex).toBeGreaterThan(descriptionIndex)
    expect(statsRowIndex).toBeGreaterThan(tagsSectionIndex)
    expect(infoBannerIndex).toBeGreaterThan(tagsSectionIndex)
    // Keine eigene Linie zwischen Beschreibung und Tags; die Linie gehört zum Banner.
    const dividerBetween = all
      .slice(descriptionIndex + 1, tagsSectionIndex)
      .some((item) => item.type === 'hr')
    expect(dividerBetween).toBe(false)
  })

  it('Genre-Chips sind Links auf /suche?type=anime&genre=<Name>, der Platzhalter "Anime" bleibt unverlinkt (D-20)', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, genres: ['Action', 'Mecha'] } })
    const content = await loadContent()
    const all = elements(content)
    const genreLinks = all.filter((item) => item.type === Link && String(item.props.href as string).includes('genre='))
    expect(genreLinks).toHaveLength(2)
    expect(genreLinks.map((item) => textContent(item.props.children as ReactNode)).sort()).toEqual(['Action', 'Mecha'])
    for (const link of genreLinks) {
      expect(paramsFromHref(link.props.href as string).get('type')).toBe('anime')
    }

    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, genres: [] } })
    const contentNoGenres = await loadContent()
    const placeholder = elements(contentNoGenres).find((item) => item.type === 'span' && textContent(item.props.children as ReactNode) === 'Anime')
    expect(placeholder).toBeDefined()
    expect(placeholder?.props).not.toHaveProperty('href')
  })
})
