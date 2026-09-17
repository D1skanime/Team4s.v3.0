import { describe, expect, it } from 'vitest'

import type { AnimeFansubRelation } from '@/types/fansub'

import { buildFansubStoryGroups, buildFansubStoryPreview, resolveActiveFansubSlug } from './fansub-summary'

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

describe('resolveActiveFansubSlug', () => {
  // RED (Plan 163-03): resolveActiveFansubSlug ist absichtlich unimplementiert
  // (throw new Error('not implemented — see Plan 163-04')) -- jeder Fall hier
  // schlaegt heute mit genau diesem Fehler fehl, nicht mit einem Modul-Crash.
  // Die eigentliche Resolutionslogik liefert Plan 163-04.

  it('liefert undefined bei null Relationen, unabhaengig von rawSlug', () => {
    expect(resolveActiveFansubSlug([], 'irgendein-slug')).toBeUndefined()
    expect(resolveActiveFansubSlug([], undefined)).toBeUndefined()
  })

  it('liefert undefined bei genau einer Relation mit fansub_group, unabhaengig von rawSlug', () => {
    const relations = [makeRelation({ fansub_group: { id: 1, slug: 'c-subs', name: 'C-Subs' } })]

    expect(resolveActiveFansubSlug(relations, 'c-subs')).toBeUndefined()
    expect(resolveActiveFansubSlug(relations, 'fremder-slug')).toBeUndefined()
    expect(resolveActiveFansubSlug(relations, undefined)).toBeUndefined()
  })

  it('liefert den Slug unveraendert bei zwei distinkten Gruppen und passendem rawSlug (zweite Gruppe)', () => {
    const relations = [
      makeRelation({ fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } }),
      makeRelation({ fansub_group: { id: 2, slug: 'beta-subs', name: 'Beta-Subs' } }),
    ]

    expect(resolveActiveFansubSlug(relations, 'beta-subs')).toBe('beta-subs')
  })

  it('liefert undefined bei zwei distinkten Gruppen und einem zu keiner Gruppe passenden rawSlug', () => {
    const relations = [
      makeRelation({ fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } }),
      makeRelation({ fansub_group: { id: 2, slug: 'beta-subs', name: 'Beta-Subs' } }),
    ]

    expect(resolveActiveFansubSlug(relations, 'does-not-exist')).toBeUndefined()
  })

  it('liefert undefined bei zwei distinkten Gruppen und rawSlug=undefined', () => {
    const relations = [
      makeRelation({ fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } }),
      makeRelation({ fansub_group: { id: 2, slug: 'beta-subs', name: 'Beta-Subs' } }),
    ]

    expect(resolveActiveFansubSlug(relations, undefined)).toBeUndefined()
  })

  it('dedupliziert nach fansub_group.id (zwei Relationen dieselbe Gruppe) und findet die dritte, distinkte Gruppe ueber ihren Slug', () => {
    const relations = [
      makeRelation({ fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } }),
      makeRelation({ fansub_group: { id: 1, slug: 'alpha-subs', name: 'Alpha-Subs' } }),
      makeRelation({ fansub_group: { id: 3, slug: 'gamma-subs', name: 'Gamma-Subs' } }),
    ]

    expect(resolveActiveFansubSlug(relations, 'gamma-subs')).toBe('gamma-subs')
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
