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
    thumbnail_url: '/media/group-gallery-thumb.jpg',
    original_url: '/media/group-gallery.jpg',
    ...overrides,
  }
}

describe('FansubMediaSection', () => {
  it('rendert Public-Fansub-Medien aus dem public-profile DTO', () => {
    const html = renderToStaticMarkup(<FansubGroupMediaBlock media={[mediaRow()]} />)

    expect(html).toContain('visible_group_media')
    expect(html).toContain('/media/group-gallery-thumb.jpg')
  })

  it('zeigt Empty State wenn keine public-profile Medien geliefert werden', () => {
    const html = renderToStaticMarkup(<FansubGroupMediaBlock media={[]} />)

    expect(html).toContain('Noch keine Medien hinterlegt')
  })

  it('rendert keinen Release- oder Member-Medienblock aus einem group-scoped Fetch', () => {
    const html = renderToStaticMarkup(<FansubMediaSection media={[mediaRow()]} />)

    expect(html).toContain('Gruppenmedien')
    expect(html).not.toContain('Release-Einblicke')
    expect(html).not.toContain('Team &amp; Erinnerungen')
  })
})
