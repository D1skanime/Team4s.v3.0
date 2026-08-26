// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listReleaseReviews: vi.fn(),
  getReleaseReviewCounts: vi.fn(),
}))

vi.mock('@/lib/api', () => api)

import { useReleaseReviewLane } from './useReleaseReviewLane'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const item = {
  id: 'review-1',
  source_revision: 1,
  type: 'text' as const,
  category: null,
  status: 'pending' as const,
  fansub_group_id: 88,
  anime_id: 42,
  anime_title: 'Frieren',
  episode_id: 7,
  episode_number: '1',
  release_id: 5,
  release_version_id: 62,
  release_version: 'v1',
  submitter_app_user_id: 11,
  submitter_member_id: 12,
  submitter_display_name: 'Akari',
  submitted_at: '2026-07-23T12:00:00Z',
  last_activity_at: '2026-07-23T12:05:00Z',
  decided_at: null,
}

const counts = {
  text: 1,
  image: 4,
  contribution: 0,
  allowed_types: ['text' as const, 'image' as const],
  image_categories: {
    screenshot: 1,
    typesetting_karaoke: 1,
    fun_outtake: 1,
    other: 1,
  },
}

function baseOptions(overrides: Partial<Parameters<typeof useReleaseReviewLane>[0]> = {}) {
  return {
    fansubId: 88,
    view: 'open' as const,
    animeId: null,
    releaseVersionId: null,
    type: null,
    category: null,
    search: '',
    enabled: true,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useReleaseReviewLane', () => {
  it('loads items, counts and nextCursor for the given inputs', async () => {
    api.listReleaseReviews.mockResolvedValue({ data: { items: [item], next_cursor: 'cursor-1' } })
    api.getReleaseReviewCounts.mockResolvedValue({ data: counts })

    const { result } = renderHook(() => useReleaseReviewLane(baseOptions()))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([item])
    expect(result.current.counts).toEqual(counts)
    expect(result.current.nextCursor).toBe('cursor-1')
    expect(result.current.error).toBeNull()
    expect(api.listReleaseReviews).toHaveBeenCalledWith(88, expect.objectContaining({
      view: 'open',
      animeId: null,
      releaseVersionId: null,
      type: null,
      category: null,
      search: '',
      limit: 50,
    }))
  })

  it('never fetches while disabled', () => {
    renderHook(() => useReleaseReviewLane(baseOptions({ enabled: false })))

    expect(api.listReleaseReviews).not.toHaveBeenCalled()
    expect(api.getReleaseReviewCounts).not.toHaveBeenCalled()
  })

  it('sets a generic German error message when the initial load fails', async () => {
    api.listReleaseReviews.mockRejectedValue(new Error('boom'))
    api.getReleaseReviewCounts.mockResolvedValue({ data: counts })

    const { result } = renderHook(() => useReleaseReviewLane(baseOptions()))

    await waitFor(() => expect(result.current.error).toBe(
      'Die Prüfungen konnten nicht geladen werden. Bitte versuche es erneut.',
    ))
    expect(result.current.isLoading).toBe(false)
  })

  it('re-triggers loadInitial exactly once when a filter option changes, with no stale-request race', async () => {
    const openCall = deferred<{ data: { items: typeof item[]; next_cursor: string | null } }>()
    const filteredCall = { data: { items: [{ ...item, id: 'review-filtered' }], next_cursor: null } }
    api.listReleaseReviews
      .mockReturnValueOnce(openCall.promise)
      .mockResolvedValueOnce(filteredCall)
    api.getReleaseReviewCounts.mockResolvedValue({ data: counts })

    const { result, rerender } = renderHook(
      (props: { animeId: number | null }) => useReleaseReviewLane(baseOptions({ animeId: props.animeId })),
      { initialProps: { animeId: null } },
    )

    rerender({ animeId: 42 })
    await waitFor(() => expect(result.current.items).toEqual([{ ...item, id: 'review-filtered' }]))

    // The slow first (superseded) request resolving later must never overwrite the fresher result.
    await act(async () => {
      openCall.resolve({ data: { items: [item], next_cursor: 'stale-cursor' } })
      await openCall.promise
    })

    expect(result.current.items).toEqual([{ ...item, id: 'review-filtered' }])
    expect(result.current.nextCursor).toBeNull()
    expect(api.listReleaseReviews).toHaveBeenCalledTimes(2)
  })

  it('loadMore appends deduped items, updates nextCursor and aborts a prior in-flight loadMore', async () => {
    api.listReleaseReviews
      .mockResolvedValueOnce({ data: { items: [item], next_cursor: 'next' } })
      .mockResolvedValueOnce({ data: { items: [item, { ...item, id: 'review-2' }], next_cursor: null } })
    api.getReleaseReviewCounts.mockResolvedValue({ data: counts })

    const { result } = renderHook(() => useReleaseReviewLane(baseOptions()))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.nextCursor).toBe('next')

    await act(async () => {
      result.current.loadMore()
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(result.current.items.map((entry) => entry.id)).toEqual(['review-1', 'review-2'])
    expect(result.current.nextCursor).toBeNull()
  })
})
