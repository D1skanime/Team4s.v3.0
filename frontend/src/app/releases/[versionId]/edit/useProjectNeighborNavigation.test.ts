// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getMyProjectDetailMock = vi.fn()

vi.mock('@/lib/api', () => ({
  getMyProjectDetail: (...args: unknown[]) => getMyProjectDetailMock(...args),
}))

import { useProjectNeighborNavigation } from './useProjectNeighborNavigation'

afterEach(() => {
  vi.clearAllMocks()
})

describe('useProjectNeighborNavigation', () => {
  it('ruft getMyProjectDetail nicht auf, wenn enabled=false ist, und liefert einen leeren Zustand', () => {
    const { result } = renderHook(() =>
      useProjectNeighborNavigation({
        animeId: 1,
        selectedGroupId: 10,
        currentReleaseVersionId: 500,
        enabled: false,
      }),
    )

    expect(getMyProjectDetailMock).not.toHaveBeenCalled()
    expect(result.current).toEqual({
      previous: null,
      next: null,
      isLoading: false,
      error: null,
    })
  })

  it('liefert die korrekten previous/next-Eintraege relativ zu currentReleaseVersionId, wenn enabled=true ist', async () => {
    const release400 = {
      release_version_id: 400,
      episode_number: '1',
      episode_title: 'Episode 1',
      episode_sort_index: 1,
      version: 'v1',
      title: null,
      role_codes: [],
      role_labels: [],
      has_own_contribution: false,
      has_own_notes: false,
      has_own_media: false,
      has_own_rejected_notes: false,
      has_own_rejected_media: false,
    }
    const release500 = { ...release400, release_version_id: 500, episode_number: '2', episode_title: 'Episode 2' }
    const release600 = { ...release400, release_version_id: 600, episode_number: '3', episode_title: 'Episode 3' }

    getMyProjectDetailMock.mockResolvedValue({
      data: {
        anime_id: 1,
        anime_title: 'Beispiel Anime',
        fansub_group_id: 10,
        fansub_group_name: 'SubGroup',
        backdrop_url: null,
        role_codes: [],
        role_labels: [],
        release_versions: [release400, release500, release600],
      },
    })

    const { result } = renderHook(() =>
      useProjectNeighborNavigation({
        animeId: 1,
        selectedGroupId: 10,
        currentReleaseVersionId: 500,
        enabled: true,
      }),
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getMyProjectDetailMock).toHaveBeenCalledWith(1, 10)
    expect(result.current.error).toBeNull()
    expect(result.current.previous?.release_version_id).toBe(400)
    expect(result.current.next?.release_version_id).toBe(600)
  })

  it('setzt error, wenn getMyProjectDetail wirft', async () => {
    getMyProjectDetailMock.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() =>
      useProjectNeighborNavigation({
        animeId: 1,
        selectedGroupId: 10,
        currentReleaseVersionId: 500,
        enabled: true,
      }),
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.previous).toBeNull()
    expect(result.current.next).toBeNull()
  })

  it('wechselt von enabled=true zu enabled=false auf den leeren Zustand zurueck, ohne einen weiteren Fetch', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: {
        anime_id: 1,
        anime_title: 'Beispiel Anime',
        fansub_group_id: 10,
        fansub_group_name: 'SubGroup',
        backdrop_url: null,
        role_codes: [],
        role_labels: [],
        release_versions: [],
      },
    })

    const { result, rerender } = renderHook(
      (props: { enabled: boolean }) =>
        useProjectNeighborNavigation({
          animeId: 1,
          selectedGroupId: 10,
          currentReleaseVersionId: 500,
          enabled: props.enabled,
        }),
      { initialProps: { enabled: true } },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getMyProjectDetailMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      rerender({ enabled: false })
    })

    expect(result.current).toEqual({
      previous: null,
      next: null,
      isLoading: false,
      error: null,
    })
    expect(getMyProjectDetailMock).toHaveBeenCalledTimes(1)
  })
})
