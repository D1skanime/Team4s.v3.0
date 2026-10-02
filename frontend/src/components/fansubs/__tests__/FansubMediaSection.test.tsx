import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubGroupMediaBlock } from '../FansubGroupMediaBlock'
import { FansubMediaSection } from '../FansubMediaSection'
import type { PublicFansubMediaItem } from '@/types/fansub'

function mediaRow(overrides: Partial<PublicFansubMediaItem> = {}): PublicFansubMediaItem {
  return {
    id: 1,
    media_type: 'group_gallery',
    caption: 'visible_group_media',
    mime_type: 'image/jpeg',
    // 173-16 Task 0a: realistic post-D-09-migration path -- group gallery
    // media lives under /media/fansub/<group_id>/..., which images.localPatterns
    // actually covers. A flat, pre-migration-shaped path like the previous
    // '/media/group-gallery-thumb.jpg' fixture value is NOT covered by any
    // localPatterns entry and would now (correctly) render unoptimized instead
    // of crashing -- exercise the realistic, covered shape here instead.
    thumbnail_url: '/media/fansub/7/group-gallery-thumb.jpg',
    original_url: '/media/fansub/7/group-gallery.jpg',
    category: 'other',
    ...overrides,
  }
}

describe('FansubMediaSection', () => {
  it('rendert Public-Fansub-Medien aus dem public-profile DTO', () => {
    const html = renderToStaticMarkup(<FansubGroupMediaBlock media={[mediaRow()]} />)

    expect(html).toContain('visible_group_media')
    // ResponsiveImage routes through the Next.js image optimizer (173-14), so the raw
    // path now appears URL-encoded inside the generated /_next/image src/srcSet.
    expect(html).toContain(encodeURIComponent('/media/fansub/7/group-gallery-thumb.jpg'))
  })

  it('zeigt Empty State wenn keine public-profile Medien geliefert werden', () => {
    const html = renderToStaticMarkup(<FansubGroupMediaBlock media={[]} />)

    expect(html).toContain('Noch keine Medien hinterlegt')
  })

  it('rendert genau einen Medien-Header ohne redundanten Zwischentitel (AO6-04)', () => {
    const html = renderToStaticMarkup(<FansubMediaSection media={[mediaRow()]} />)

    expect(html).toContain('visible_group_media')
    expect(html).not.toContain('Gruppenmedien')
    expect(html).not.toContain('Release-Einblicke')
    expect(html).not.toContain('Team &amp; Erinnerungen')
  })
})
