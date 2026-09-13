import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(), cache: <T,>(fn: T): T => fn,
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') } }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getAnimeByID: vi.fn(), getAnimeFansubs: vi.fn(), getGroupedEpisodes: vi.fn(),
  getAnimeComments: vi.fn(), getAnimeRelations: vi.fn(), getWatchlistEntry: vi.fn(),
}))

import { ApiError, getAnimeByID, getAnimeFansubs, getGroupedEpisodes, getAnimeComments, getAnimeRelations } from '@/lib/api'
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
