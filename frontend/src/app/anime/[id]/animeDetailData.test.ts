import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  // Vitest is not a Server Component render; request-cache integration is tested in 158-04.
  cache: <T,>(fn: T): T => fn,
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') } }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(), getAnimeByID: vi.fn(),
}))

import { ApiError, getAnimeByID } from '@/lib/api'
import type { AnimeDetail } from '@/types/anime'
import { loadAnimeDetail } from './animeDetailData'

const anime: AnimeDetail = {
  id: 22, slug: 'stored-slug', title: 'Ein ganz anderer Titel', type: 'tv',
  content_type: 'anime', status: 'done', view_count: 0, episodes: [],
}
beforeEach(() => { vi.mocked(getAnimeByID).mockReset() })

describe('strict public anime detail resource', () => {
  it.each(['1abc', '1.5', '0', '-1', '9007199254740992', '1e2', '+1', ' 1', '1 ', '', '0x10', '１', '1\n', '1\r', '1\u2028', '1\u2029']) (
    'rejects %j before requesting any anime', async (id) => {
      await expect(loadAnimeDetail(id)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
      expect(getAnimeByID).not.toHaveBeenCalled()
    },
  )

  it.each(['22', '00022'])('loads the numeric resource for %s and preserves its stored slug', async (id) => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: anime })
    await expect(loadAnimeDetail(id)).resolves.toBe(anime)
    expect(getAnimeByID).toHaveBeenCalledWith(22)
  })

  it('accepts the largest safe positive integer', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { ...anime, id: Number.MAX_SAFE_INTEGER } })
    await loadAnimeDetail(String(Number.MAX_SAFE_INTEGER))
    expect(getAnimeByID).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  })

  it('maps only an API 404 to the Next not-found boundary', async () => {
    vi.mocked(getAnimeByID).mockRejectedValue(new ApiError(404, 'Anime fehlt'))
    await expect(loadAnimeDetail('987')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it.each([new ApiError(500, 'Backendfehler'), new ApiError(401, 'Nicht angemeldet'), new TypeError('Netzwerkfehler')])(
    'preserves technical failures (%s)', async (error) => {
      vi.mocked(getAnimeByID).mockRejectedValue(error)
      await expect(loadAnimeDetail('22')).rejects.toBe(error)
    },
  )
})
