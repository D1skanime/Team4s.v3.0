import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubStoryBlock } from '../FansubStoryBlock'
import type { PublicFansubStory } from '@/types/fansub'

const story: PublicFansubStory = {
  id: 8,
  title: 'Alle jahre wieder',
  body_html: '<p>2003 stiegen wir in diese Serie ein.</p>',
  body_text: '2003 stiegen wir in diese Serie ein.',
}

describe('FansubStoryBlock', () => {
  it('rendert Titel und Inhalt eines Blocks', () => {
    const html = renderToStaticMarkup(<FansubStoryBlock story={story} />)

    expect(html).toContain('Alle jahre wieder')
    expect(html).toContain('2003 stiegen wir')
  })

  it('rendert null bei einem inhaltslosen Block', () => {
    const emptyStory: PublicFansubStory = { id: 9, title: '', body_html: '', body_text: '' }
    const html = renderToStaticMarkup(<FansubStoryBlock story={emptyStory} />)

    expect(html).toBe('')
  })
})
