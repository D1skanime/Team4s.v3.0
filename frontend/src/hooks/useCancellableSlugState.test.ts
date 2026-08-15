// @vitest-environment jsdom

import { StrictMode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useCancellableSlugState } from './useCancellableSlugState'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

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

describe('useCancellableSlugState', () => {
  it('stays idle and never fetches while disabled', () => {
    const fetcher = vi.fn()
    const { result } = renderHook(() =>
      useCancellableSlugState({ requestKey: 'a', enabled: false, fetcher }),
    )

    expect(result.current.state).toEqual({ key: '', status: 'idle', data: null, error: null })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('resolves to success keyed by requestKey and forwards a real AbortSignal to the fetcher', async () => {
    const first = deferred<{ value: number }>()
    const fetcher = vi.fn<(signal: AbortSignal) => Promise<{ value: number }>>(() => first.promise)

    const { result } = renderHook(() =>
      useCancellableSlugState({ requestKey: 'subaru:0', enabled: true, fetcher }),
    )

    expect(result.current.state.status).toBe('loading')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBeInstanceOf(AbortSignal)

    await act(async () => {
      first.resolve({ value: 1 })
      await first.promise
    })

    await waitFor(() =>
      expect(result.current.state).toEqual({
        key: 'subaru:0',
        status: 'success',
        data: { value: 1 },
        error: null,
      }),
    )
  })

  it('sets a local error state on a genuine (non-abort) failure', async () => {
    const failure = deferred<unknown>()
    const fetcher = vi.fn(() => failure.promise)
    const boom = new Error('boom')

    const { result } = renderHook(() =>
      useCancellableSlugState({ requestKey: 'subaru:0', enabled: true, fetcher }),
    )

    await act(async () => {
      failure.reject(boom)
      await failure.promise.catch(() => {})
    })

    await waitFor(() =>
      expect(result.current.state).toEqual({
        key: 'subaru:0',
        status: 'error',
        data: null,
        error: boom,
      }),
    )
  })

  it('ignores its own AbortError and never surfaces it as a local error', async () => {
    const failure = deferred<unknown>()
    const fetcher = vi.fn(() => failure.promise)
    const abortError = new DOMException('aborted', 'AbortError')

    const { result } = renderHook(() =>
      useCancellableSlugState({ requestKey: 'subaru:0', enabled: true, fetcher }),
    )

    await act(async () => {
      failure.reject(abortError)
      await failure.promise.catch(() => {})
    })

    expect(result.current.state.status).toBe('loading')
    expect(result.current.state.error).toBeNull()
  })

  it('aborts the superseded request on a key change and applies only the newest key, even if the stale request later resolves', async () => {
    const stale = deferred<{ value: string }>()
    const fresh = deferred<{ value: string }>()
    const signals: AbortSignal[] = []
    const fetcher = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return signals.length === 1 ? stale.promise : fresh.promise
    })

    const { result, rerender } = renderHook(
      ({ requestKey }: { requestKey: string }) =>
        useCancellableSlugState({ requestKey, enabled: true, fetcher }),
      { initialProps: { requestKey: 'subaru:0' } },
    )

    rerender({ requestKey: 'subaru:6' })

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    expect(result.current.state).toEqual({ key: 'subaru:6', status: 'loading', data: null, error: null })

    await act(async () => {
      stale.resolve({ value: 'stale' })
      await stale.promise
    })
    // Superseded (aborted) resolution must never apply, even though it settled after supersession.
    expect(result.current.state).toEqual({ key: 'subaru:6', status: 'loading', data: null, error: null })

    await act(async () => {
      fresh.resolve({ value: 'fresh' })
      await fresh.promise
    })

    await waitFor(() =>
      expect(result.current.state).toEqual({
        key: 'subaru:6',
        status: 'success',
        data: { value: 'fresh' },
        error: null,
      }),
    )
  })

  it('aborts the in-flight request on unmount without an act()/state-update-after-unmount warning', () => {
    const pending = deferred<unknown>()
    const fetcher = vi.fn<(signal: AbortSignal) => Promise<unknown>>(() => pending.promise)

    const { unmount } = renderHook(() =>
      useCancellableSlugState({ requestKey: 'subaru:0', enabled: true, fetcher }),
    )

    const signal = fetcher.mock.calls[0][0]
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('settles exactly once per requestKey under a React 18 StrictMode double-invoke (mount -> cleanup -> mount)', async () => {
    const resolved = deferred<{ value: number }>()
    let callCount = 0
    const fetcher = vi.fn((signal: AbortSignal) => {
      callCount += 1
      const thisCall = callCount
      return resolved.promise.then((value) => {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError')
        return { ...value, call: thisCall }
      })
    })

    const { result } = renderHook(
      () => useCancellableSlugState({ requestKey: 'subaru:0', enabled: true, fetcher }),
      { wrapper: StrictMode },
    )

    // StrictMode double-invokes the effect (mount -> cleanup -> mount) in dev; the first
    // controller is aborted by the cleanup, so only the second (non-aborted) call may settle.
    expect(fetcher).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolved.resolve({ value: 1 })
      await resolved.promise
    })

    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.state).toEqual({
      key: 'subaru:0',
      status: 'success',
      data: { value: 1, call: 2 },
      error: null,
    })
  })
})
