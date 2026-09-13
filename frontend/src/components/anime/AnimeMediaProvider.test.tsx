// @vitest-environment jsdom

import { StrictMode, useEffect, type ImgHTMLAttributes } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AnimeBackdropManifest, AnimeBackdropResponse } from '@/types/anime'

import { AnimeBackdropRotator } from './AnimeBackdropRotator'
import { AnimeInfoBanner, AnimeMediaProvider, AnimeTitleLogo, useAnimeMediaManifest } from './AnimeMediaProvider'

const getAnimeBackdropsMock = vi.fn()

vi.mock('@/lib/api', () => ({
  getAnimeBackdrops: (...args: unknown[]) => getAnimeBackdropsMock(...args),
}))

vi.mock('next/image', () => ({
  default: ({ unoptimized, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

afterEach(async () => {
  cleanup()
  await Promise.resolve()
  vi.useRealTimers()
  vi.restoreAllMocks()
  getAnimeBackdropsMock.mockReset()
})

describe('AnimeMediaProvider', () => {
  it('zeigt zuerst das Cover und startet das Theme-Video automatisch, sobald das Manifest bereit ist', async () => {
    let resolveManifest!: (value: AnimeBackdropResponse) => void
    getAnimeBackdropsMock.mockReturnValue(
      new Promise<AnimeBackdropResponse>((resolve) => {
        resolveManifest = resolve
      }),
    )

    const { container } = render(
      <AnimeMediaProvider animeID={1}>
        <AnimeBackdropRotator coverImage="/cover.jpg" />
        <AnimeTitleLogo title="Viper's Creed" />
        <AnimeInfoBanner />
      </AnimeMediaProvider>,
    )

    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByAltText("Viper's Creed Logo")).toBeNull()
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    expect(getAnimeBackdropsMock).toHaveBeenCalledWith(1, { signal: expect.any(AbortSignal) })

    resolveManifest({
      data: {
        anime_id: 1,
        provider: 'jellyfin',
        backdrops: ['/backdrop.jpg'],
        theme_videos: ['/theme.mp4'],
        logo_url: '/logo.png',
        banner_url: '/banner.jpg',
      },
    })

    await waitFor(() => expect(container.querySelector('video')).not.toBeNull())

    const video = container.querySelector('video')
    expect(video?.autoplay).toBe(true)
    expect(video?.muted).toBe(true)
    expect(video?.playsInline).toBe(true)
    expect(video?.preload).toBe('auto')
    expect(video?.getAttribute('src')).toContain('/theme.mp4')
    expect(screen.getByAltText("Viper's Creed Logo")).toBeTruthy()
    expect(container.querySelectorAll('img')).toHaveLength(2)
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
  })

  it('dedupliziert den Manifest-Request auch bei doppelten Development-Effects', async () => {
    getAnimeBackdropsMock.mockResolvedValue({
      data: {
        anime_id: 2,
        provider: 'jellyfin',
        backdrops: [],
        theme_videos: [],
        logo_url: '/logo-2.png',
        banner_url: undefined,
      },
    } satisfies AnimeBackdropResponse)

    render(
      <StrictMode>
        <AnimeMediaProvider animeID={2}>
          <AnimeTitleLogo title="Anime 2" />
        </AnimeMediaProvider>
      </StrictMode>,
    )

    await screen.findByAltText('Anime 2 Logo')
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    expect(getAnimeBackdropsMock).toHaveBeenCalledWith(2, { signal: expect.any(AbortSignal) })
  })
})


function deferredManifest() {
  let resolve!: (value: AnimeBackdropResponse) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<AnimeBackdropResponse>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function response(animeID: number, logo = 'first'): AnimeBackdropResponse {
  return { data: { anime_id: animeID, provider: 'jellyfin', backdrops: [], theme_videos: [], logo_url: '/covers/' + logo + '.png' } }
}

function Observer({ name, changed }: { name: string; changed?: (value: AnimeBackdropManifest | null) => void }) {
  const manifest = useAnimeMediaManifest()
  useEffect(() => { changed?.(manifest) }, [changed, manifest])
  return <output data-testid={name}>{manifest ? manifest.anime_id + ':' + manifest.logo_url : 'empty'}</output>
}

function provider(animeID: number, name = 'manifest', changed?: (value: AnimeBackdropManifest | null) => void) {
  return <AnimeMediaProvider animeID={animeID}><Observer name={name} changed={changed} /></AnimeMediaProvider>
}

async function flush() { await act(async () => { await Promise.resolve() }) }
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

describe('manifest lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-14T10:00:00Z'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  })

  it('shares across two providers and aborts only after the final consumer leaves', async () => {
    const pending = deferredManifest()
    getAnimeBackdropsMock.mockReturnValue(pending.promise)
    const first = render(provider(101, 'first'))
    const second = render(provider(101, 'second'))
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    const signal = getAnimeBackdropsMock.mock.calls[0][1]?.signal as AbortSignal
    expect(signal).toBeInstanceOf(AbortSignal)
    first.unmount()
    await flush()
    expect(signal.aborted).toBe(false)
    second.unmount()
    expect(signal.aborted).toBe(false)
    await flush()
    expect(signal.aborted).toBe(true)
    pending.reject(new DOMException('Aborted', 'AbortError'))
    await flush()
  })

  it('shares pending work through StrictMode cleanup and setup', async () => {
    const pending = deferredManifest()
    getAnimeBackdropsMock.mockReturnValue(pending.promise)
    const view = render(<StrictMode>{provider(102)}</StrictMode>)
    await flush()
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    const signal = getAnimeBackdropsMock.mock.calls[0][1]?.signal as AbortSignal
    expect(signal?.aborted).toBe(false)
    pending.resolve(response(102))
    await flush()
    expect(screen.getByTestId('manifest').textContent).toContain('102:')
    view.unmount()
    await flush()
    expect(signal.aborted).toBe(false)
  })

  it('reuses fresh success, renews expired acquisition and does not poll', async () => {
    getAnimeBackdropsMock.mockImplementation((id: number) => Promise.resolve(response(id)))
    const first = render(provider(103))
    await flush()
    first.unmount()
    await flush()
    await advance(59_999)
    const fresh = render(provider(103))
    await flush()
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    fresh.unmount()
    await flush()
    await advance(1)
    render(provider(103))
    await flush()
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
    await advance(180_000)
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
  })

  it('coalesces expired focus/visibility bursts and updates both providers while preserving equal manifest identity', async () => {
    const changed = vi.fn()
    getAnimeBackdropsMock.mockResolvedValue(response(104))
    render(provider(104, 'first', changed))
    render(provider(104, 'second'))
    await flush()
    const firstObject = changed.mock.calls.at(-1)?.[0]
    await advance(60_000)
    const pending = deferredManifest()
    getAnimeBackdropsMock.mockReturnValue(pending.promise)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    })
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
    pending.resolve({ data: { logo_url: '/covers/first.png', theme_videos: [], backdrops: [], provider: 'jellyfin', anime_id: 104 } })
    await flush()
    expect(changed.mock.calls.at(-1)?.[0]).toBe(firstObject)
    expect(changed.mock.calls.filter(([value]) => value !== null)).toHaveLength(1)
    await advance(60_000)
    getAnimeBackdropsMock.mockResolvedValue(response(104, 'changed'))
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.getByTestId('first').textContent).toContain('changed.png')
    expect(screen.getByTestId('second').textContent).toContain('changed.png')
    expect(changed.mock.calls.at(-1)?.[0]).not.toBe(firstObject)
  })

  it('ignores hidden focus and revalidates once visible, then retries failure without a polling loop', async () => {
    getAnimeBackdropsMock.mockResolvedValueOnce(response(105)).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response(105, 'retry'))
    render(provider(105))
    await flush()
    await advance(60_000)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
    await advance(180_000)
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(screen.getByTestId('manifest').textContent).toContain('retry.png')
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(3)
  })

  it('does not let an old rejection evict a replacement request', async () => {
    const old = deferredManifest()
    const replacement = deferredManifest()
    getAnimeBackdropsMock.mockReturnValueOnce(old.promise).mockReturnValue(replacement.promise)
    render(provider(106, 'old')).unmount()
    await flush()
    render(provider(106, 'new'))
    old.reject(new DOMException('Late abort', 'AbortError'))
    await flush()
    render(provider(106, 'other'))
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
    replacement.resolve(response(106, 'replacement'))
    await flush()
    expect(screen.getByTestId('new').textContent).toContain('replacement')
    expect(screen.getByTestId('other').textContent).toContain('replacement')
  })

  it('retries rejected requests on a later acquisition', async () => {
    getAnimeBackdropsMock.mockRejectedValueOnce(new Error('failed')).mockResolvedValue(response(107))
    const failed = render(provider(107))
    await flush()
    expect(screen.getByTestId('manifest').textContent).toContain('empty')
    failed.unmount()
    await flush()
    render(provider(107))
    await flush()
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('manifest').textContent).toContain('107:')
  })

  it('never presents the previous anime manifest under a new anime ID, including late completion', async () => {
    const pending = deferredManifest()
    getAnimeBackdropsMock.mockResolvedValueOnce(response(108)).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(110))
    const observed = vi.fn()
    const view = render(provider(108, 'manifest', observed))
    await flush()
    view.rerender(provider(109, 'manifest', observed))
    expect(screen.getByTestId('manifest').textContent).toContain('empty')
    view.rerender(provider(110, 'manifest', observed))
    await flush()
    pending.resolve(response(109, 'late'))
    await flush()
    expect(screen.getByTestId('manifest').textContent).toContain('110:')
    expect(observed.mock.calls.some(([value]) => value?.anime_id === 109)).toBe(false)
  })

  it('keeps only 20 unused fulfilled entries by LRU while protecting active and pending providers', async () => {
    const pending = deferredManifest()
    getAnimeBackdropsMock.mockImplementation((id: number) => id === 199 ? pending.promise : Promise.resolve(response(id)))
    render(provider(198, 'active'))
    render(provider(199, 'pending'))
    await flush()
    for (let id = 200; id < 220; id += 1) {
      const view = render(provider(id, 'item-' + id))
      await flush()
      view.unmount()
      await flush()
    }
    // Touch the oldest: 201, rather than 200, must be evicted next.
    const touched = render(provider(200, 'touched'))
    await flush()
    touched.unmount()
    await flush()
    const extra = render(provider(220, 'extra'))
    await flush()
    extra.unmount()
    await flush()
    const count = (id: number) => getAnimeBackdropsMock.mock.calls.filter(([called]) => called === id).length
    render(provider(200, 'retained'))
    render(provider(201, 'evicted'))
    render(provider(198, 'active-again'))
    render(provider(199, 'pending-again'))
    await flush()
    expect(count(200)).toBe(1)
    expect(count(201)).toBe(2)
    expect(count(198)).toBe(1)
    expect(count(199)).toBe(1)
    pending.resolve(response(199))
    await flush()
  })
})
