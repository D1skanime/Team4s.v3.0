import { describe, expect, it } from 'vitest'

import type { AnimeContribution } from '@/types/fansub'

import {
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
})
