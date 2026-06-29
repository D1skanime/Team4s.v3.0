// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { AdminFansubRelease } from '@/types/fansub'
import type { ReleaseSegmentCard } from './fansubEditTypes'
import { ReleaseThemeDrawerSection } from './ReleaseThemeDrawerSection'

vi.mock('@/lib/api', () => ({
  resolveApiUrl: (value: string) => value,
}))

afterEach(() => {
  cleanup()
})

const styles = new Proxy(
  {},
  {
    get: (_target, property) => String(property),
  },
) as Record<string, string>

function release(): AdminFansubRelease {
  return {
    release_id: 2,
    release_version_id: 2002,
    anime_id: 13,
    anime_title: 'Naruto',
    fansub_group_id: 88,
    fansub_name: 'AnimeOwnage',
    episode_id: 502,
    episode_number: '2',
    episode_title: 'Der ehrenwerte Enkel',
    source: null,
    version_count: 1,
    has_theme_assets: false,
    duration_seconds: 1200,
    created_at: '2026-06-29T00:00:00Z',
  }
}

function card(overrides: Partial<ReleaseSegmentCard> = {}): ReleaseSegmentCard {
  return {
    theme_id: 7,
    theme_type_name: 'OP',
    theme_title: 'Naruto OP 1',
    status: 'missing',
    segments: [
      {
        id: 70,
        theme_id: 7,
        anime_id: 13,
        start_episode: 1,
        end_episode: 12,
        start_episode_id: 501,
        end_episode_id: 512,
        start_episode_number: '1',
        end_episode_number: '12',
        start_time: '00:00:20',
        end_time: '00:01:30',
        source_type: 'release_asset',
        source_ref: null,
        source_label: null,
        created_at: '2026-06-29T00:00:00Z',
      },
    ],
    release_asset_upload_locked: true,
    ...overrides,
  }
}

describe('ReleaseThemeDrawerSection', () => {
  it('blendet den Upload bei release_asset-Segmenten nach dem Segmentstart aus', () => {
    render(
      <ReleaseThemeDrawerSection
        styles={styles}
        themeDrawerOpen
        selectedReleaseSegment={{ release: release(), card: card() }}
        hasAuthSession
        canManageReleaseThemeAssets
        drawerError={null}
        drawerBusy={false}
        drawerUploadProgress={null}
        themeUploadName=""
        themePreviewOpen={false}
        setThemePreviewOpen={vi.fn()}
        themeUploadInputRef={{ current: null }}
        closeThemeDrawer={vi.fn()}
        handleThemeUploadInputChange={vi.fn()}
        handleDrawerUploadClick={vi.fn()}
        handleDrawerDelete={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Upload starten' })).toBeNull()
    expect(
      screen.getByText(
        'Dieses Theme gilt für einen Episodenbereich. Der Upload wird am Segmentstart verwaltet, nicht an dieser Folge.',
      ),
    ).not.toBeNull()
  })
})
