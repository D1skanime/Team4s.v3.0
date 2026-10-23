// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FansubGroup } from '@/types/fansub'

const mocks = vi.hoisted(() => ({ getFansubList: vi.fn() }))
vi.mock('@/lib/api', () => ({
  getFansubList: mocks.getFansubList,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { ApiError, getFansubList } from '@/lib/api'
import { useFansubGroupSearch } from './useFansubGroupSearch'

function makeGroup(id: number, name = `Gruppe ${id}`): FansubGroup {
  return { id, slug: `gruppe-${id}`, name } as FansubGroup
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.getFansubList.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useFansubGroupSearch', () => {
  it('debounces the query by 180ms before calling getFansubList', async () => {
    mocks.getFansubList.mockResolvedValue({ data: [makeGroup(1)] })
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [] }))

    act(() => result.current.setQuery('red'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(179)
    })
    expect(getFansubList).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(getFansubList).toHaveBeenCalledWith({ q: 'red', page: 1, per_page: 10 })
  })

  it('cancels a pending debounced call when the query changes again before it fires', async () => {
    mocks.getFansubList.mockResolvedValue({ data: [makeGroup(1)] })
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [] }))

    act(() => result.current.setQuery('re'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    act(() => result.current.setQuery('red'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(179)
    })
    expect(getFansubList).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(getFansubList).toHaveBeenCalledTimes(1)
    expect(getFansubList).toHaveBeenCalledWith({ q: 'red', page: 1, per_page: 10 })
  })

  it('clears results/message and does not call the API for an empty or whitespace-only query', async () => {
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [] }))

    act(() => result.current.setQuery('   '))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(getFansubList).not.toHaveBeenCalled()
    expect(result.current.results).toEqual([])
    expect(result.current.message).toBeNull()
    expect(result.current.isSearching).toBe(false)
  })

  it('filters out results whose id is in excludeIds', async () => {
    mocks.getFansubList.mockResolvedValue({ data: [makeGroup(1), makeGroup(2), makeGroup(3)] })
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [2] }))

    act(() => result.current.setQuery('gruppe'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180)
    })

    expect(result.current.results.map((group) => group.id)).toEqual([1, 3])
  })

  it('sets the exact empty-result message when the filtered result set is empty', async () => {
    mocks.getFansubList.mockResolvedValue({ data: [makeGroup(1)] })
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [1] }))

    act(() => result.current.setQuery('gruppe'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180)
    })

    expect(result.current.message).toBe('Keine passende Gruppe oder kein passender Alias gefunden.')
    expect(result.current.results).toEqual([])
  })

  it('formats an ApiError into the message field on a failed fetch', async () => {
    mocks.getFansubList.mockRejectedValue(new ApiError(500, 'Serverfehler'))
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [] }))

    act(() => result.current.setQuery('gruppe'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180)
    })

    expect(result.current.message).toBe('(500) Serverfehler')
    expect(result.current.isSearching).toBe(false)
  })

  it('addGroup clears query, results, and message', async () => {
    mocks.getFansubList.mockResolvedValue({ data: [makeGroup(1)] })
    const { result } = renderHook(() => useFansubGroupSearch({ excludeIds: [] }))

    act(() => result.current.setQuery('gruppe'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180)
    })
    expect(result.current.results).toHaveLength(1)

    act(() => result.current.addGroup(makeGroup(1)))

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.message).toBeNull()
  })
})
