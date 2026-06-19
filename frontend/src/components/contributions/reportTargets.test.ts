import { describe, expect, it } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

import { buildReportTargetOptions, optionsForTargetType } from './reportTargets'

const CONTRIBUTIONS: MeAnimeContribution[] = [
  {
    id: 41,
    anime_id: 3,
    anime_title: 'Naruto',
    fansub_group_id: 88,
    fansub_group_member_id: 5,
    fansub_group_name: 'AnimeOwnage',
    status: 'confirmed',
    role_codes: ['translator'],
    role_labels: ['Übersetzung'],
    started_year: null,
    ended_year: null,
    is_public_on_anime_page: true,
    is_public_on_member_profile: true,
    note: null,
    release_version_id: null,
    is_own_proposal: false,
  },
  {
    id: 42,
    anime_id: 3,
    anime_title: 'Naruto',
    fansub_group_id: 88,
    fansub_group_member_id: 5,
    fansub_group_name: 'AnimeOwnage',
    status: 'proposed',
    role_codes: ['timer'],
    role_labels: ['Timing'],
    started_year: null,
    ended_year: null,
    is_public_on_anime_page: false,
    is_public_on_member_profile: false,
    note: null,
    release_version_id: null,
    is_own_proposal: true,
  },
]

describe('buildReportTargetOptions', () => {
  it('builds deduplicated anime and fansub targets plus concrete contribution targets', () => {
    const options = buildReportTargetOptions(CONTRIBUTIONS)

    expect(optionsForTargetType(options, 'anime')).toEqual([
      { type: 'anime', id: 3, label: 'Naruto' },
    ])
    expect(optionsForTargetType(options, 'fansub_group')).toEqual([
      { type: 'fansub_group', id: 88, label: 'AnimeOwnage' },
    ])
    expect(optionsForTargetType(options, 'contribution')).toEqual([
      {
        type: 'contribution',
        id: 42,
        label: 'Naruto · AnimeOwnage · Timing',
        description: 'Hinweis #42',
      },
      {
        type: 'contribution',
        id: 41,
        label: 'Naruto · AnimeOwnage · Übersetzung',
        description: 'Hinweis #41',
      },
    ])
  })
})
