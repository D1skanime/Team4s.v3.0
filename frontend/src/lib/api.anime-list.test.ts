import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAnimeList } from './api'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('anime list AbortSignal transport', () => {
  it.each([false, true])('forwards the signal through the existing public/admin transport (admin=%s)', async (include_disabled) => {
    const signal = new AbortController().signal
    const payload = { data: [], meta: { page: 2, per_page: 24, total: 0, total_pages: 0 } }
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(getAnimeList({ page: 2, include_disabled }, { signal, cache: 'no-store' })).resolves.toEqual(payload)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toContain(include_disabled ? '/api/v1/admin/anime?' : '/api/v1/anime?')
    expect(fetcher.mock.calls[0][1]).toMatchObject({ signal, cache: 'no-store' })
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('next')
  })
  it('preserves revalidation and propagates abort without replacing it by a network error', async () => {
    const controller = new AbortController()
    controller.abort()
    const abort = new DOMException('Aborted', 'AbortError')
    const fetcher = vi.fn().mockRejectedValue(abort)
    vi.stubGlobal('fetch', fetcher)
    await expect(getAnimeList({ page: 1 }, { signal: controller.signal, revalidate: 7 })).rejects.toBe(abort)
    expect(fetcher.mock.calls[0][1]).toEqual({ signal: controller.signal, next: { revalidate: 7 } })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
