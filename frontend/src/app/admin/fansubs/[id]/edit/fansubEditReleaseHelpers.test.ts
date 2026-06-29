import { describe, expect, it } from 'vitest'

import type { AdminAnimeTheme, AdminAnimeThemeSegment } from '@/types/admin'
import type { AdminFansubRelease, AnimeContribution } from '@/types/fansub'

import {
  mapReleaseSegmentCards,
  releaseAssetUploadLockedBySegment,
  uniqueContributionPeople,
  uniqueProjectContributionPeople,
} from './fansubEditReleaseHelpers'

function contribution(
  id: number,
  memberId: number,
  releaseVersionId: number | null,
): AnimeContribution {
  return {
    id,
    member_id: memberId,
    member_display_name: `Member ${memberId}`,
    anime_id: 13,
    role_codes: ['translator'],
    started_year: null,
    ended_year: null,
    note: null,
    is_public_on_anime_page: false,
    is_public_on_member_profile: false,
    status: 'confirmed',
    release_version_id: releaseVersionId,
    created_at: '2026-06-11T00:00:00Z',
  }
}

function release(overrides: Partial<AdminFansubRelease> = {}): AdminFansubRelease {
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
    ...overrides,
  }
}

function theme(): AdminAnimeTheme {
  return {
    id: 7,
    anime_id: 13,
    theme_type_id: 1,
    theme_type_name: 'OP',
    title: 'Naruto OP 1',
    created_at: '2026-06-29T00:00:00Z',
  }
}

function segment(overrides: Partial<AdminAnimeThemeSegment> = {}): AdminAnimeThemeSegment {
  return {
    id: 70,
    theme_id: 7,
    anime_id: 13,
    theme_title: 'Naruto OP 1',
    theme_type_name: 'OP',
    fansub_group_id: null,
    version: '',
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
    playback_source_kind: null,
    playback_duration_seconds: null,
    created_at: '2026-06-29T00:00:00Z',
    ...overrides,
  }
}

describe('fansubEditReleaseHelpers', () => {
  it('dedupliziert Contribution-Rows nach Mitglied', () => {
    const rows = [
      contribution(1, 12, null),
      contribution(2, 12, 6201),
      contribution(3, 13, null),
    ]

    expect(uniqueContributionPeople(rows).map((row) => row.member_id)).toEqual([12, 13])
  })

  it('zählt für das Projektteam nur anime-weite Mitwirkende', () => {
    const rows = [
      contribution(1, 12, null),
      contribution(2, 12, 6201),
      contribution(3, 13, 6201),
      contribution(4, 14, null),
    ]

    expect(uniqueProjectContributionPeople(rows).map((row) => row.member_id)).toEqual([12, 14])
  })

  it('sperrt release_asset-Uploads in einem Episodenbereich nach dem Segmentstart', () => {
    expect(releaseAssetUploadLockedBySegment(release(), [segment()])).toBe(true)
    expect(
      releaseAssetUploadLockedBySegment(release({ episode_number: '1' }), [
        segment(),
      ]),
    ).toBe(false)
  })

  it('markiert Theme-Karten nach dem Segmentstart als zentral gesperrt', () => {
    const cards = mapReleaseSegmentCards(
      release(),
      [theme()],
      [],
      new Map([[7, [segment()]]]),
    )

    expect(cards[0]).toMatchObject({
      status: 'missing',
      release_asset_upload_locked: true,
      source_label: 'Zentraler Theme-Upload am Segmentstart erforderlich',
    })
  })
})
