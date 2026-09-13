import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Children, isValidElement, Suspense, type ReactElement, type ReactNode } from 'react'
import { cookies } from 'next/headers'
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
import type { AnimeDetail } from '@/types/anime'
import AnimeDetailPage, { generateMetadata } from './page'

const anime: AnimeDetail = {
  id: 22, slug: 'stored-slug', title: 'Tatsächlicher Anime', type: 'tv',
  content_type: 'anime', status: 'done', view_count: 0, episodes: [],
}
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAnimeByID).mockReset().mockResolvedValue({ data: anime })
  vi.mocked(getAnimeFansubs).mockReset().mockResolvedValue({ data: [] })
  vi.mocked(getGroupedEpisodes).mockReset().mockResolvedValue({ data: { anime_id: anime.id, episodes: [] } })
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
    vi.mocked(getGroupedEpisodes).mockRejectedValue(new ApiError(500, 'Versionen nicht verfügbar'))
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
