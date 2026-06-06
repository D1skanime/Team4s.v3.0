import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubGroupMediaBlock } from '../FansubGroupMediaBlock'
import { FansubMediaSection } from '../FansubMediaSection'
import type { FansubGroup } from '@/types/fansub'
import type { MediaOwnershipRow } from '@/types/media-ownership'

function mediaRow(overrides: Partial<MediaOwnershipRow> = {}): MediaOwnershipRow {
  return {
    id: 1,
    owner_type: 'fansub_group',
    owner_id: 10,
    media_category: 'group_gallery',
    visibility: 'public',
    review_status: 'approved',
    review_status_label: 'freigegeben',
    file_path: '/media/group-gallery.jpg',
    original_file_path: null,
    caption: null,
    mime_type: 'image/jpeg',
    ...overrides,
  }
}

const group = {
  id: 10,
  name: 'Demo Fansub',
  slug: 'demo',
  logo_url: null,
  banner_url: null,
} as FansubGroup

describe('FansubMediaSection', () => {
  it('rendert nur fansub_group rows mit visibility="public" AND review_status="approved"', () => {
    const html = renderToStaticMarkup(
      <FansubGroupMediaBlock
        group={group}
        mediaRows={[
          mediaRow({ media_category: 'visible_group_media' }),
          mediaRow({ media_category: 'internal_group_media', visibility: 'internal' }),
          mediaRow({ media_category: 'review_group_media', review_status: 'in_review' }),
          mediaRow({ media_category: 'legacy_group_media', owner_type: 'release_version' }),
        ]}
      />,
    )

    expect(html).toContain('visible_group_media')
    expect(html).not.toContain('internal_group_media')
    expect(html).not.toContain('review_group_media')
    expect(html).not.toContain('legacy_group_media')
  })

  it('zeigt Empty State wenn nach Filterung keine sichtbaren Medien verbleiben', () => {
    const html = renderToStaticMarkup(
      <FansubGroupMediaBlock
        group={group}
        mediaRows={[mediaRow({ visibility: 'internal' }), mediaRow({ review_status: 'in_review' })]}
      />,
    )

    expect(html).toContain('Noch keine Medien hinterlegt')
  })

  it('rendert keinen Release- oder Member-Medienblock aus einem group-scoped Fetch', () => {
    const html = renderToStaticMarkup(<FansubMediaSection group={group} mediaRows={[mediaRow()]} />)

    expect(html).toContain('Gruppenmedien')
    expect(html).not.toContain('Release-Einblicke')
    expect(html).not.toContain('Team &amp; Erinnerungen')
  })
})
