import { describe, expect, it } from 'vitest'

import type { AnimeFansubRelation } from '@/types/fansub'

import { buildFansubStoryGroups, buildFansubStoryPreview } from './fansub-summary'

function makeRelation(overrides: Partial<AnimeFansubRelation> = {}): AnimeFansubRelation {
  return {
    anime_id: 1,
    fansub_group_id: overrides.fansub_group?.id ?? 1,
    is_primary: false,
    created_at: '2020-01-01T00:00:00Z',
    fansub_group: {
      id: 1,
      slug: 'c-subs',
      name: 'C-Subs',
    },
    ...overrides,
  }
}

describe('buildFansubStoryGroups', () => {
  it('dedupliziert nach fansub_group.id, wenn zwei Relationen dieselbe Gruppe referenzieren', () => {
    const relations = [
      makeRelation({ fansub_group: { id: 1, slug: 'c-subs', name: 'C-Subs' } }),
      makeRelation({ fansub_group: { id: 1, slug: 'c-subs', name: 'C-Subs' } }),
      makeRelation({ fansub_group: { id: 2, slug: 'other-subs', name: 'Other-Subs' } }),
    ]

    const groups = buildFansubStoryGroups(relations)

    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.id)).toEqual([1, 2])
  })

  it('überspringt Relationen mit fansub_group: null', () => {
    const relations = [
      makeRelation({ fansub_group: null }),
      makeRelation({ fansub_group: { id: 3, slug: 'third-subs', name: 'Third-Subs' } }),
    ]

    const groups = buildFansubStoryGroups(relations)

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe(3)
  })

  it('übernimmt founded_year/dissolved_year/country/status unverändert aus der Relation', () => {
    const relations = [
      makeRelation({
        fansub_group: {
          id: 4,
          slug: 'story-subs',
          name: 'Story-Subs',
          founded_year: 2008,
          dissolved_year: null,
          country: 'Schweiz',
          status: 'active',
        },
      }),
    ]

    const groups = buildFansubStoryGroups(relations)

    expect(groups).toEqual([
      {
        id: 4,
        slug: 'story-subs',
        name: 'Story-Subs',
        founded_year: 2008,
        dissolved_year: null,
        country: 'Schweiz',
        status: 'active',
      },
    ])
  })
})

describe('buildFansubStoryPreview mit FansubGroupSummary-artigem Minimalobjekt', () => {
  it('akzeptiert die schmalere Struktur ohne volle FansubGroup-Pflichtfelder', () => {
    const summary = {
      founded_year: 2008,
      country: 'Schweiz',
      status: 'active' as const,
    }

    expect(buildFansubStoryPreview(summary)).toBe('gegründet 2008 • Schweiz • aktiv')
  })
})
