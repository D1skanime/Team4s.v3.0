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

const storyA: PublicFansubStory = {
  id: 8,
  title: 'Alle jahre wieder',
  body_html: '<p>2003 stiegen wir in diese Serie ein.</p>',
  body_text: '2003 stiegen wir in diese Serie ein.',
}

const storyB: PublicFansubStory = {
  id: 9,
  title: 'Der zweite Block',
  body_html: '<p>2010 kam ein neues Kapitel.</p>',
  body_text: '2010 kam ein neues Kapitel.',
}

const storyC: PublicFansubStory = {
  id: 10,
  title: 'Der dritte Block',
  body_html: '<p>2015 wurde die Geschichte groesser.</p>',
  body_text: '2015 wurde die Geschichte groesser.',
}

describe('FansubStorySection', () => {
  it('rendert genau einen Sektions-Header und bis zu zwei Bloecke mit eigenem Titel in Reihenfolge', () => {
    const html = renderToStaticMarkup(<FansubStorySection group={group} stories={[storyA, storyB]} />)

    const headerOccurrences = html.split('Geschichte').length - 1
    expect(headerOccurrences).toBeGreaterThanOrEqual(1)
    expect(html).toContain('Alle jahre wieder')
    expect(html).toContain('Der zweite Block')
    expect(html.indexOf('Alle jahre wieder')).toBeLessThan(html.indexOf('Der zweite Block'))
  })

  it('begrenzt die Inline-Ausgabe und bietet bei mehr als zwei Stories das Archiv an', () => {
    const html = renderToStaticMarkup(<FansubStorySection group={group} stories={[storyA, storyB, storyC]} />)

    expect(html).toContain('Alle jahre wieder')
    expect(html).toContain('Der zweite Block')
    expect(html).not.toContain('Der dritte Block')
    expect(html).toContain('Alle Geschichten lesen (3)')
  })

  it('ueberspringt Bloecke ohne jeglichen Inhalt', () => {
    const emptyStory: PublicFansubStory = { id: 10, title: '', body_html: '', body_text: '' }
    const html = renderToStaticMarkup(<FansubStorySection group={group} stories={[emptyStory, storyA]} />)

    expect(html).toContain('Alle jahre wieder')
    expect(html).not.toContain('Noch keine Geschichte hinterlegt')
  })

  it('rendert null wenn stories leer ist', () => {
    const html = renderToStaticMarkup(<FansubStorySection group={group} stories={[]} />)

    expect(html).toBe('')
  })
})
