// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EpisodeReleaseSummary } from '@/types/group'

const mocks = vi.hoisted(() => ({ getGroupReleaseListCursor: vi.fn() }))
vi.mock('@/lib/api', () => ({
  getGroupReleaseListCursor: mocks.getGroupReleaseListCursor,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { ApiError } from '@/lib/api'
import { buildReleaseOptionLabel, useProposalFormReleaseOptions } from './ProposalForm.useReleaseOptions'

function makeRelease(overrides: Partial<EpisodeReleaseSummary> = {}): EpisodeReleaseSummary {
  return {
    id: 1,
    episode_number: 12,
    episode_number_label: '12',
    title: 'Foo',
    version_label: 'v2',
    has_op: false,
    has_ed: false,
    karaoke_count: 0,
    insert_count: 0,
    screenshot_count: 0,
    ...overrides,
  }
}

beforeEach(() => {
  mocks.getGroupReleaseListCursor.mockReset()
})
afterEach(() => {
  cleanup()
})

describe('buildReleaseOptionLabel', () => {
  it('builds "Episode {label} — {title} · {version}" when both title and version are present', () => {
    expect(buildReleaseOptionLabel(makeRelease({ title: 'Foo', version_label: 'v2' }))).toBe('Episode 12 — Foo · v2')
  })

  it('falls back to "Episode {label}" when title and version are both null', () => {
    expect(buildReleaseOptionLabel(makeRelease({ title: null, version_label: null }))).toBe('Episode 12')
  })

  it('omits the title separator but keeps the version suffix when only title is null', () => {
    expect(buildReleaseOptionLabel(makeRelease({ title: null, version_label: 'v2' }))).toBe('Episode 12 · v2')
  })
})

describe('useProposalFormReleaseOptions', () => {
  it('does not call getGroupReleaseListCursor and returns empty options when animeId/groupId are null', async () => {
    const { result } = renderHook(() => useProposalFormReleaseOptions({ animeId: null, groupId: null }))

    expect(mocks.getGroupReleaseListCursor).not.toHaveBeenCalled()
    expect(result.current.options).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('loads and maps options for a given anime/group pair, calling the cursor API exactly once', async () => {
    let resolveCall: (value: unknown) => void = () => {}
    mocks.getGroupReleaseListCursor.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve
      }),
    )

    const { result } = renderHook(() => useProposalFormReleaseOptions({ animeId: 2, groupId: 24 }))

    expect(result.current.isLoading).toBe(true)
    expect(mocks.getGroupReleaseListCursor).toHaveBeenCalledTimes(1)
    expect(mocks.getGroupReleaseListCursor).toHaveBeenCalledWith(2, 24, { limit: 100, sort: 'release_date' })

    await act(async () => {
      resolveCall({
        items: [makeRelease({ id: 7, title: 'Foo', version_label: 'v2' })],
        next_cursor: null,
        has_more: false,
      })
      await Promise.resolve()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.options).toEqual([{ id: 7, label: 'Episode 12 — Foo · v2' }])
  })

  it('re-fetches exactly once when animeId/groupId change to a new, different pair', async () => {
    mocks.getGroupReleaseListCursor.mockResolvedValue({ items: [], next_cursor: null, has_more: false })

    const { result, rerender } = renderHook(
      ({ animeId, groupId }: { animeId: number | null; groupId: number | null }) =>
        useProposalFormReleaseOptions({ animeId, groupId }),
      { initialProps: { animeId: 2, groupId: 24 } as { animeId: number | null; groupId: number | null } },
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(mocks.getGroupReleaseListCursor).toHaveBeenCalledTimes(1)

    await act(async () => {
      rerender({ animeId: 3, groupId: 25 })
      await Promise.resolve()
    })
    expect(mocks.getGroupReleaseListCursor).toHaveBeenCalledTimes(2)
    expect(mocks.getGroupReleaseListCursor).toHaveBeenLastCalledWith(3, 25, { limit: 100, sort: 'release_date' })

    void result
  })

  it('clears options to [] without an extra network call when animeId/groupId go back to null', async () => {
    mocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [makeRelease({ id: 7 })],
      next_cursor: null,
      has_more: false,
    })

    const { result, rerender } = renderHook(
      ({ animeId, groupId }: { animeId: number | null; groupId: number | null }) =>
        useProposalFormReleaseOptions({ animeId, groupId }),
      { initialProps: { animeId: 2, groupId: 24 } as { animeId: number | null; groupId: number | null } },
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.options).toHaveLength(1)
    expect(mocks.getGroupReleaseListCursor).toHaveBeenCalledTimes(1)

    await act(async () => {
      rerender({ animeId: null, groupId: null })
      await Promise.resolve()
    })

    expect(result.current.options).toEqual([])
    expect(mocks.getGroupReleaseListCursor).toHaveBeenCalledTimes(1)
  })

  it('sets a non-null error string and leaves options empty on a rejected call, never throwing', async () => {
    mocks.getGroupReleaseListCursor.mockRejectedValue(new ApiError(500, 'Serverfehler'))

    const { result } = renderHook(() => useProposalFormReleaseOptions({ animeId: 2, groupId: 24 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.error).toBe('(500) Serverfehler')
    expect(result.current.options).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('initializes selectedReleaseVersionId from initialReleaseVersionId (default null) and allows independent updates', () => {
    const { result } = renderHook(() => useProposalFormReleaseOptions({ animeId: null, groupId: null }))
    expect(result.current.selectedReleaseVersionId).toBeNull()

    act(() => result.current.setSelectedReleaseVersionId(9))
    expect(result.current.selectedReleaseVersionId).toBe(9)

    const { result: resultWithInitial } = renderHook(() =>
      useProposalFormReleaseOptions({ animeId: null, groupId: null, initialReleaseVersionId: 5 }),
    )
    expect(resultWithInitial.current.selectedReleaseVersionId).toBe(5)
  })

  it('reset() sets selectedReleaseVersionId back to null and clears options/error', async () => {
    mocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [makeRelease({ id: 7 })],
      next_cursor: null,
      has_more: false,
    })

    const { result } = renderHook(() =>
      useProposalFormReleaseOptions({ animeId: 2, groupId: 24, initialReleaseVersionId: 5 }),
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.options).toHaveLength(1)
    expect(result.current.selectedReleaseVersionId).toBe(5)

    act(() => result.current.setSelectedReleaseVersionId(7))
    expect(result.current.selectedReleaseVersionId).toBe(7)

    act(() => result.current.reset())
    expect(result.current.selectedReleaseVersionId).toBeNull()
    expect(result.current.options).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
