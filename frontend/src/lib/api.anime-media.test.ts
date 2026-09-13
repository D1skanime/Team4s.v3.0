import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getAnimeBackdrops } from './api'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('anime manifest transport', () => {
  it('preserves the one-argument response and no-store policy', async () => {
    const payload = { data: { anime_id: 1, provider: 'jellyfin', backdrops: [], theme_videos: [] } }
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(getAnimeBackdrops(1)).resolves.toEqual(payload)
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/v1/anime/1/backdrops'), expect.objectContaining({ cache: 'no-store' }))
  })

  it('forwards the exact AbortSignal through the central client and propagates abort unchanged', async () => {
    const controller = new AbortController()
    const abort = new DOMException('Aborted', 'AbortError')
    const fetcher = vi.fn().mockImplementation((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(abort), { once: true })
    }))
    vi.stubGlobal('fetch', fetcher)
    const result = getAnimeBackdrops(2, { signal: controller.signal })
    const rejected = expect(result).rejects.toBe(abort)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    expect(fetcher.mock.calls[0][1]).toMatchObject({ signal: controller.signal, cache: 'no-store' })
    controller.abort()
    await rejected
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('retains documented ApiError handling for unavailable manifests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Nicht gefunden' } }), { status: 404 })))
    await expect(getAnimeBackdrops(3)).rejects.toBeInstanceOf(ApiError)
  })
})
