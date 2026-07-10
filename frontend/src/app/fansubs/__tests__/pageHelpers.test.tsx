import { describe, expect, it } from 'vitest'

import { hasStoriesContent } from '../[slug]/page'
import type { PublicFansubStory } from '@/types/fansub'

describe('hasStoriesContent', () => {
  it('liefert false wenn keine Bloecke vorhanden sind', () => {
    expect(hasStoriesContent([])).toBe(false)
  })

  it('liefert false wenn alle Bloecke ohne Titel/Text/HTML sind', () => {
    const stories: PublicFansubStory[] = [{ id: 1, title: '', body_html: '', body_text: '' }]
    expect(hasStoriesContent(stories)).toBe(false)
  })

  it('liefert true wenn mindestens ein Block body_html befuellt hat', () => {
    const stories: PublicFansubStory[] = [
      { id: 1, title: '', body_html: '', body_text: '' },
      { id: 2, title: '', body_html: '<p>Inhalt</p>', body_text: '' },
    ]
    expect(hasStoriesContent(stories)).toBe(true)
  })

  it('liefert true wenn mindestens ein Block nur einen Titel hat', () => {
    const stories: PublicFansubStory[] = [{ id: 1, title: 'Unsere Geschichte', body_html: '', body_text: '' }]
    expect(hasStoriesContent(stories)).toBe(true)
  })
})
