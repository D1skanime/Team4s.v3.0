// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ActiveFansubStory } from '../ActiveFansubStory'
import type { FansubGroupSummary } from '@/types/fansub'

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
    render(<ActiveFansubStory activeFansubGroupID={1} groups={fansubGroups} />)

    expect(screen.getByText('C-Subs')).not.toBeNull()
    expect(screen.getByText('gegründet 2008 • Schweiz • aktiv')).not.toBeNull()
  })
})
