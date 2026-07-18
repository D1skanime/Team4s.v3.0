// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ActiveFansubStory } from '../ActiveFansubStory'
import type { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

afterEach(() => {
  cleanup()
})

describe('ActiveFansubStory', () => {
  it('rendert Gruppenname und Story-Vorschau aus FansubGroupSummary[] ohne volle FansubGroup-Felder', () => {
    const fansubGroups: FansubGroupSummary[] = [
      {
        id: 1,
        slug: 'c-subs',
        name: 'C-Subs',
        founded_year: 2008,
        country: 'Schweiz',
        status: 'active',
      },
    ]
    const animeFansubs: AnimeFansubRelation[] = [
      {
        anime_id: 1,
        fansub_group_id: 1,
        is_primary: true,
        created_at: '2020-01-01T00:00:00Z',
        fansub_group: fansubGroups[0],
      },
    ]

    render(<ActiveFansubStory animeID={1} fansubGroups={fansubGroups} animeFansubs={animeFansubs} />)

    expect(screen.getByText('C-Subs')).not.toBeNull()
    expect(screen.getByText('gegründet 2008 • Schweiz • aktiv')).not.toBeNull()
  })
})
