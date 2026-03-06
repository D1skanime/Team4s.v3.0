import { describe, expect, it } from 'vitest'

import { buildGroupNavigationGroups } from './groupNavigation'
import type { AnimeFansubRelation, FansubGroupSummary } from '../types/fansub'

function createRelation(
  id: number,
  name: string,
  isPrimary: boolean,
): AnimeFansubRelation {
  return {
    anime_id: 1,
    fansub_group_id: id,
    is_primary: isPrimary,
    created_at: '2026-03-04T00:00:00Z',
    fansub_group: {
      id,
      slug: `group-${id}`,
      name,
      logo_url: null,
    },
  }
}

describe('buildGroupNavigationGroups', () => {
  it('uses anime-fansub relations and keeps current group in the navigation list', () => {
    const currentGroup: FansubGroupSummary = {
      id: 102,
      slug: 'flamehaze',
      name: 'Flamehaze',
      logo_url: null,
    }

    const result = buildGroupNavigationGroups({
      currentGroup,
      fallbackOtherGroups: [
        { id: 75, slug: 'flamehazesubs', name: 'Flamehazesubs', logo_url: null },
      ],
      animeFansubRelations: [
        createRelation(75, 'Flamehazesubs', false),
        createRelation(301, 'Strawhat Subs', false),
        createRelation(102, 'Flamehaze', true),
      ],
    })

    expect(result.map((group) => group.id)).toEqual([102, 75, 301])
  })

  it('falls back to current + other groups when anime relations are unavailable', () => {
    const currentGroup: FansubGroupSummary = {
      id: 200,
      slug: 'beta',
      name: 'Beta',
      logo_url: null,
    }

    const result = buildGroupNavigationGroups({
      currentGroup,
      fallbackOtherGroups: [
        { id: 300, slug: 'gamma', name: 'Gamma', logo_url: null },
        { id: 100, slug: 'alpha', name: 'Alpha', logo_url: null },
      ],
      animeFansubRelations: null,
    })

    expect(result.map((group) => group.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
})
