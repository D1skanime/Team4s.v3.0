import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubStorySection } from '../FansubStorySection'
import type { FansubGroup, PublicFansubStory } from '@/types/fansub'

const group = {
  id: 88,
  name: 'AnimeOwnage',
  slug: 'animeownage',
  status: 'active',
  group_type: 'group',
  anime_relations_count: 1,
  release_versions_count: 0,
  members_count: 0,
  aliases_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as FansubGroup

const story: PublicFansubStory = {
  id: 8,
  title: 'Alle jahre wieder',
  body_html: '<p>2003 stiegen wir in diese Serie ein.</p>',
  body_text: '2003 stiegen wir in diese Serie ein.',
}

describe('FansubStorySection', () => {
  it('rendert veröffentlichte Public-Story statt immer EmptyState', () => {
    const html = renderToStaticMarkup(<FansubStorySection group={group} story={story} />)

    expect(html).toContain('Alle jahre wieder')
    expect(html).toContain('2003 stiegen wir')
    expect(html).not.toContain('Noch keine Geschichte hinterlegt')
  })

  it('zeigt EmptyState wenn keine Public-Story geliefert wird', () => {
    const html = renderToStaticMarkup(<FansubStorySection group={group} story={null} />)

    expect(html).toContain('Noch keine Geschichte hinterlegt')
  })
})
