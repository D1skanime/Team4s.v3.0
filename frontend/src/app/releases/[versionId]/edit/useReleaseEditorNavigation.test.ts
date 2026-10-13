// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getGroupedEpisodesMock = vi.fn()
const getMyProjectDetailMock = vi.fn()

vi.mock('@/lib/api', () => ({
  getGroupedEpisodes: (...args: unknown[]) => getGroupedEpisodesMock(...args),
  getMyProjectDetail: (...args: unknown[]) => getMyProjectDetailMock(...args),
}))

import { useReleaseEditorNavigation } from './useReleaseEditorNavigation'

const groupedResponse = {
  data: {
    anime_id: 1,
    episodes: [
      {
        episode_number: 1,
        version_count: 1,
        versions: [
          {
            id: 101,
            anime_id: 1,
            episode_number: 1,
            release_version: 'v1',
            fansub_groups: [{ id: 10, slug: 'subgroup', name: 'SubGroup' }],
            media_provider: 'manual',
            media_item_id: '',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
      {
        episode_number: 2,
        version_count: 1,
        versions: [
          {
            id: 102,
            anime_id: 1,
            episode_number: 2,
            release_version: 'v1',
            fansub_groups: [{ id: 10, slug: 'subgroup', name: 'SubGroup' }],
            media_provider: 'manual',
            media_item_id: '',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
    ],
  },
}

const release100 = {
  release_version_id: 100,
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
const release200 = { ...release100, release_version_id: 200, episode_number: '2', episode_title: 'Episode 2' }
const release300 = { ...release100, release_version_id: 300, episode_number: '3', episode_title: 'Episode 3' }

const projectResponse = {
  data: {
    anime_id: 1,
    anime_title: 'Beispiel Anime',
    fansub_group_id: 10,
    fansub_group_name: 'SubGroup',
    backdrop_url: null,
    role_codes: [],
    role_labels: [],
    release_versions: [release100, release200, release300],
  },
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useReleaseEditorNavigation (D-03)', () => {
  it("context='episode' ruft NUR getGroupedEpisodes auf, niemals getMyProjectDetail (T-181-08)", async () => {
    getGroupedEpisodesMock.mockResolvedValue(groupedResponse)

    const { result } = renderHook(() =>
      useReleaseEditorNavigation('episode', {
        animeId: 1,
        selectedGroupId: 10,
        currentReleaseVersionId: 101,
        episodeVersion: 'v1',
        activeTab: 'metadata',
        projectReturnHref: null,
      }),
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getGroupedEpisodesMock).toHaveBeenCalled()
    expect(getMyProjectDetailMock).not.toHaveBeenCalled()
    expect(result.current.centerLabel).toBe('Folge 1 / 2')
    expect(result.current.nextHref).toBe('/releases/102/edit?tab=metadata')
    expect(result.current.previousHref).toBeNull()
  })

  it("context='project' ruft NUR getMyProjectDetail auf, niemals getGroupedEpisodes (T-181-08)", async () => {
    getMyProjectDetailMock.mockResolvedValue(projectResponse)

    const { result } = renderHook(() =>
      useReleaseEditorNavigation('project', {
        animeId: 1,
        selectedGroupId: 10,
        currentReleaseVersionId: 200,
        episodeVersion: 'v1',
        activeTab: 'metadata',
        projectReturnHref: '/me/projects/1/group/10',
      }),
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getMyProjectDetailMock).toHaveBeenCalled()
    expect(getGroupedEpisodesMock).not.toHaveBeenCalled()
    expect(result.current.centerLabel).toBeUndefined()
    expect(result.current.previousHref).toBe(
      '/releases/100/edit?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F10',
    )
    expect(result.current.previousLabel).toBe('Episode 1')
    expect(result.current.nextHref).toBe('/releases/300/edit?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F10')
  })
})
