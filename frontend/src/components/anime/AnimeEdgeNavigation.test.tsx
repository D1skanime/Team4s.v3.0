// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnimeList } from '@/lib/api'
import { buildAnimeDetailHref, buildAnimeGridQuery } from '@/lib/animeGridContext'
import type { AnimeListItem, PaginatedAnimeResponse } from '@/types/anime'
import { AnimeEdgeNavigation } from './AnimeEdgeNavigation'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api', () => ({ getAnimeList: vi.fn() }))
const filters = { per_page: 2, q: 'Ein Titel', letter: 'E', content_type: 'anime' as const, status: 'done' as const }
const query = (page: number) => buildAnimeGridQuery({ ...filters, page })
const item = (id: number): AnimeListItem => ({ id, title: `Anime ${id}`, type: 'tv', status: 'done' })
function response(page: number, ids = [page * 2 - 1, page * 2]): PaginatedAnimeResponse {
  return { data: ids.map(item), meta: { page, per_page: 2, total: 6, total_pages: 3 } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
beforeEach(() => {
  push.mockReset()
  vi.mocked(getAnimeList).mockReset().mockImplementation(async (params) => response(params.page ?? 1))
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('interaction-only grid navigation', () => {
  it('makes zero mount requests and renders nothing for missing context', () => {
    const { rerender } = render(<AnimeEdgeNavigation currentAnimeID={2} gridQuery={query(1)} />)
    expect(getAnimeList).not.toHaveBeenCalled()
    rerender(<AnimeEdgeNavigation currentAnimeID={2} gridQuery="" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(getAnimeList).not.toHaveBeenCalled()
  })
  it('uses the first awaited result when the first click is slow', async () => {
    const pending = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValueOnce(pending.promise)
    render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Anime' }))
    expect(push).not.toHaveBeenCalled()
    await act(async () => pending.resolve(response(2)))
    expect(push).toHaveBeenCalledExactlyOnceWith(buildAnimeDetailHref(4, query(2)), { scroll: true })
  })
  it.each(['mouseEnter', 'focus'] as const)('shows the first slow %s preview and shares hover/focus/touch/click in-flight work', async (intent) => {
    const pending = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValueOnce(pending.promise)
    render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    const next = screen.getByRole('button', { name: 'Nächster Anime' })
    fireEvent[intent](next)
    fireEvent.focus(next); fireEvent.touchStart(next); fireEvent.mouseEnter(next)
    expect(next.hasAttribute('disabled')).toBe(false)
    expect(getAnimeList).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve(response(2)))
    expect(screen.getByText('Anime 4')).toBeTruthy()
    fireEvent.click(next)
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
    expect(getAnimeList).toHaveBeenCalledTimes(2) // Current page plus the previous boundary page.
  })
  it('accepts a click while a hover request is pending', async () => {
    const pending = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValueOnce(pending.promise)
    render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    const next = screen.getByRole('button', { name: 'Nächster Anime' })
    fireEvent.mouseEnter(next); fireEvent.click(next)
    await act(async () => pending.resolve(response(2)))
    expect(push).toHaveBeenCalledExactlyOnceWith(buildAnimeDetailHref(4, query(2)), { scroll: true })
    expect(getAnimeList).toHaveBeenCalledTimes(2)
  })
  it('carries the actual page through three pages and the return path while retaining every filter', async () => {
    const { rerender } = render(<AnimeEdgeNavigation currentAnimeID={2} gridQuery={query(1)} />)
    for (const [from, page, direction, target, targetPage] of [
      [2, 1, 'Nächster Anime', 3, 2], [4, 2, 'Nächster Anime', 5, 3],
      [5, 3, 'Vorheriger Anime', 4, 2], [3, 2, 'Vorheriger Anime', 2, 1],
    ] as const) {
      rerender(<AnimeEdgeNavigation currentAnimeID={from} gridQuery={query(page)} />)
      push.mockClear()
      fireEvent.click(screen.getByRole('button', { name: direction }))
      await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(buildAnimeDetailHref(target, query(targetPage)), { scroll: true }))
    }
    for (const [params] of vi.mocked(getAnimeList).mock.calls) expect(params).toMatchObject(filters)
  })
  it.each([[1, 1, 'Vorheriger Anime'], [6, 3, 'Nächster Anime']] as const)('does not invent a neighbor at outer edge %s', async (id, page, direction) => {
    render(<AnimeEdgeNavigation currentAnimeID={id} gridQuery={query(page)} />)
    fireEvent.click(screen.getByRole('button', { name: direction }))
    await waitFor(() => expect(screen.getByRole('button', { name: direction }).hasAttribute('disabled')).toBe(true))
    expect(push).not.toHaveBeenCalled()
    expect(getAnimeList).toHaveBeenCalledTimes(1)
  })
  it('does not guess when the current ID is missing from the requested page', async () => {
    render(<AnimeEdgeNavigation currentAnimeID={99} gridQuery={query(2)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Anime' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nächster Anime' }).hasAttribute('disabled')).toBe(true))
    expect(push).not.toHaveBeenCalled()
    expect(getAnimeList).toHaveBeenCalledTimes(1)
  })
  it('allows an explicit retry after a failed first click', async () => {
    vi.mocked(getAnimeList).mockRejectedValueOnce(new Error('unavailable'))
    render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Anime' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nächster Anime' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Anime' }))
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
  })
  it.each(['resolve', 'reject'] as const)('aborts old context and ignores late %s, including its finally and router continuation', async (outcome) => {
    const old = deferred<PaginatedAnimeResponse>()
    const current = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const { rerender } = render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Anime' }))
    const signal = vi.mocked(getAnimeList).mock.calls[0][1]?.signal
    rerender(<AnimeEdgeNavigation currentAnimeID={5} gridQuery={query(3)} />)
    expect(signal?.aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Anime' }))
    await act(async () => { if (outcome === 'resolve') old.resolve(response(2)); else old.reject(new Error('old')) })
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Nächster Anime' }).hasAttribute('disabled')).toBe(true)
    await act(async () => current.resolve(response(3)))
    expect(push).toHaveBeenCalledExactlyOnceWith(buildAnimeDetailHref(6, query(3)), { scroll: true })
  })
  it('aborts when only the query changes, and when unmounted', async () => {
    const pending = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValue(pending.promise)
    const { rerender, unmount } = render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    fireEvent.focus(screen.getByRole('button', { name: 'Nächster Anime' }))
    const oldSignal = vi.mocked(getAnimeList).mock.calls[0][1]?.signal
    rerender(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(1)} />)
    expect(oldSignal?.aborted).toBe(true)
    fireEvent.touchStart(screen.getByRole('button', { name: 'Nächster Anime' }))
    const signal = vi.mocked(getAnimeList).mock.calls[1][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve(response(2)))
    expect(push).not.toHaveBeenCalled()
  })
})
