// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberProfileResponse, PublicMemberViewer } from '@/types/profile'

const getMemberProfileMock = vi.hoisted(() => vi.fn())
const getMemberViewerAccessMock = vi.hoisted(() => vi.fn())

const { MockApiError } = vi.hoisted(() => ({
  MockApiError: class extends Error {
    status: number
    constructor(status: number, message = 'API request failed') {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  getMemberProfile: (...args: unknown[]) => getMemberProfileMock(...args),
  getMemberViewerAccess: (...args: unknown[]) => getMemberViewerAccessMock(...args),
}))

import { useMemberViewer, useMemberViewerAccess } from './useMemberViewer'

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

function makeResponse(isOwner: boolean): PublicMemberProfileResponse {
  return {
    data: {
      member_id: 3,
      fansub_name: 'Canonical Owner',
      slug: 'canonical-owner',
      bio: null,
      member_story_html: null,
      active_from_date: null,
      active_until_date: null,
      is_currently_active: true,
      noindex: false,
      is_verified: false,
      profile_status: 'active',
      profile_visibility: 'private',
      avatar: null,
      background_image: null,
      memberships: [],
      public_badges: [],
      badge_progress: [],
      total_points: 0,
      known_for: { active_years: '', top_roles: [], known_groups: [] },
      current_projects: [],
      latest_contributions: [],
      previous_contributions: [],
      previous_contributions_count: 0,
    },
    viewer: { is_owner: isOwner, is_private_preview: isOwner },
  } as unknown as PublicMemberProfileResponse
}

function makeViewerAccessResponse(isOwner: boolean): { viewer: PublicMemberViewer } {
  return { viewer: { is_owner: isOwner, is_private_preview: isOwner } }
}

describe('useMemberViewer', () => {
  it('stays loading and never fetches while disabled', () => {
    const { result } = renderHook(() => useMemberViewer('canonical-owner', { enabled: false }))

    expect(result.current.status).toBe('loading')
    expect(result.current.response).toBeNull()
    expect(getMemberProfileMock).not.toHaveBeenCalled()
  })

  it('stays loading and never fetches while slug is null, even when enabled', () => {
    const { result } = renderHook(() => useMemberViewer(null, { enabled: true }))

    expect(result.current.status).toBe('loading')
    expect(getMemberProfileMock).not.toHaveBeenCalled()
  })

  it('never reports resolved while the request is still in flight', async () => {
    const pending = deferred<PublicMemberProfileResponse>()
    getMemberProfileMock.mockReturnValue(pending.promise)

    const { result } = renderHook(() => useMemberViewer('canonical-owner', { enabled: true }))

    expect(result.current.status).toBe('loading')
    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)
    // Phase 154 (P154-08..10): the fetcher now forwards useCancellableSlugState's
    // AbortSignal instead of dropping it -- assert both the slug and the signal instance.
    const [slugArg, signalArg] = getMemberProfileMock.mock.calls[0] as [string, unknown]
    expect(slugArg).toBe('canonical-owner')
    expect(signalArg).toBeInstanceOf(AbortSignal)

    await act(async () => {
      pending.resolve(makeResponse(true))
      await pending.promise
    })

    await waitFor(() => expect(result.current.status).toBe('resolved'))
    expect(result.current.response?.viewer.is_owner).toBe(true)
  })

  it('never reports resolved for a stale (superseded) requestKey, even if it later settles', async () => {
    const stale = deferred<PublicMemberProfileResponse>()
    const fresh = deferred<PublicMemberProfileResponse>()
    getMemberProfileMock
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise)

    const { result, rerender } = renderHook(
      ({ retryKey }: { retryKey: number }) => useMemberViewer('canonical-owner', { enabled: true, retryKey }),
      { initialProps: { retryKey: 0 } },
    )

    rerender({ retryKey: 1 })
    expect(result.current.status).toBe('loading')

    await act(async () => {
      stale.resolve(makeResponse(true))
      await stale.promise.catch(() => {})
    })
    // Superseded response must never flip status to 'resolved'.
    expect(result.current.status).toBe('loading')

    await act(async () => {
      fresh.resolve(makeResponse(true))
      await fresh.promise
    })

    await waitFor(() => expect(result.current.status).toBe('resolved'))
  })

  it('resolves to unavailable on a 404 ApiError', async () => {
    getMemberProfileMock.mockRejectedValue(new MockApiError(404))

    const { result } = renderHook(() => useMemberViewer('canonical-owner', { enabled: true }))

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.response).toBeNull()
  })

  it('resolves to error on a non-404 failure', async () => {
    getMemberProfileMock.mockRejectedValue(new MockApiError(503))

    const { result } = renderHook(() => useMemberViewer('canonical-owner', { enabled: true }))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.response).toBeNull()
  })

  it('re-fetches exactly once per retryKey bump', async () => {
    getMemberProfileMock
      .mockResolvedValueOnce(makeResponse(false))
      .mockResolvedValueOnce(makeResponse(true))

    const { result, rerender } = renderHook(
      ({ retryKey }: { retryKey: number }) => useMemberViewer('canonical-owner', { enabled: true, retryKey }),
      { initialProps: { retryKey: 0 } },
    )

    await waitFor(() => expect(result.current.status).toBe('resolved'))
    expect(result.current.response?.viewer.is_owner).toBe(false)
    expect(getMemberProfileMock).toHaveBeenCalledTimes(1)

    rerender({ retryKey: 1 })

    await waitFor(() => expect(getMemberProfileMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.response?.viewer.is_owner).toBe(true))
  })
})

// Phase 154 (RCA-08 / P154-08..10): useMemberViewerAccess mirrors useMemberViewer's PMFE-10
// fail-closed guard exactly, since both are backed by the same deriveViewerStatus<T> helper.
// These cases are the slim-hook equivalent of every case above.
describe('useMemberViewerAccess', () => {
  it('stays loading and never fetches while disabled', () => {
    const { result } = renderHook(() => useMemberViewerAccess('canonical-owner', { enabled: false }))

    expect(result.current.status).toBe('loading')
    expect(result.current.viewer).toBeNull()
    expect(getMemberViewerAccessMock).not.toHaveBeenCalled()
  })

  it('stays loading and never fetches while slug is null, even when enabled', () => {
    const { result } = renderHook(() => useMemberViewerAccess(null, { enabled: true }))

    expect(result.current.status).toBe('loading')
    expect(getMemberViewerAccessMock).not.toHaveBeenCalled()
  })

  it('never reports resolved while the request is still in flight', async () => {
    const pending = deferred<{ viewer: PublicMemberViewer }>()
    getMemberViewerAccessMock.mockReturnValue(pending.promise)

    const { result } = renderHook(() => useMemberViewerAccess('canonical-owner', { enabled: true }))

    expect(result.current.status).toBe('loading')
    expect(getMemberViewerAccessMock).toHaveBeenCalledTimes(1)
    const [slugArg, signalArg] = getMemberViewerAccessMock.mock.calls[0] as [string, unknown]
    expect(slugArg).toBe('canonical-owner')
    expect(signalArg).toBeInstanceOf(AbortSignal)

    await act(async () => {
      pending.resolve(makeViewerAccessResponse(true))
      await pending.promise
    })

    await waitFor(() => expect(result.current.status).toBe('resolved'))
    expect(result.current.viewer?.is_owner).toBe(true)
  })

  it('never reports resolved for a stale (superseded) requestKey, even if it later settles', async () => {
    const stale = deferred<{ viewer: PublicMemberViewer }>()
    const fresh = deferred<{ viewer: PublicMemberViewer }>()
    getMemberViewerAccessMock
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise)

    const { result, rerender } = renderHook(
      ({ retryKey }: { retryKey: number }) => useMemberViewerAccess('canonical-owner', { enabled: true, retryKey }),
      { initialProps: { retryKey: 0 } },
    )

    rerender({ retryKey: 1 })
    expect(result.current.status).toBe('loading')

    await act(async () => {
      stale.resolve(makeViewerAccessResponse(true))
      await stale.promise.catch(() => {})
    })
    expect(result.current.status).toBe('loading')

    await act(async () => {
      fresh.resolve(makeViewerAccessResponse(true))
      await fresh.promise
    })

    await waitFor(() => expect(result.current.status).toBe('resolved'))
  })

  it('resolves to unavailable on a 404 ApiError', async () => {
    getMemberViewerAccessMock.mockRejectedValue(new MockApiError(404))

    const { result } = renderHook(() => useMemberViewerAccess('canonical-owner', { enabled: true }))

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.viewer).toBeNull()
  })

  it('resolves to error on a non-404 failure', async () => {
    getMemberViewerAccessMock.mockRejectedValue(new MockApiError(503))

    const { result } = renderHook(() => useMemberViewerAccess('canonical-owner', { enabled: true }))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.viewer).toBeNull()
  })

  it('re-fetches exactly once per retryKey bump', async () => {
    getMemberViewerAccessMock
      .mockResolvedValueOnce(makeViewerAccessResponse(false))
      .mockResolvedValueOnce(makeViewerAccessResponse(true))

    const { result, rerender } = renderHook(
      ({ retryKey }: { retryKey: number }) => useMemberViewerAccess('canonical-owner', { enabled: true, retryKey }),
      { initialProps: { retryKey: 0 } },
    )

    await waitFor(() => expect(result.current.status).toBe('resolved'))
    expect(result.current.viewer?.is_owner).toBe(false)
    expect(getMemberViewerAccessMock).toHaveBeenCalledTimes(1)

    rerender({ retryKey: 1 })

    await waitFor(() => expect(getMemberViewerAccessMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.viewer?.is_owner).toBe(true))
  })
})
