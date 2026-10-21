import { describe, expect, it } from 'vitest'

import { groupFansubMediaByCategory, resolveFansubMediaTitle } from './fansubMediaPresentation'
import type { PublicFansubMediaItem } from '@/types/fansub'

const mediaItem = (overrides: Partial<PublicFansubMediaItem> = {}): PublicFansubMediaItem => ({
  id: 1,
  media_type: 'image',
  mime_type: 'image/png',
  category: 'other',
  ...overrides,
})

describe('resolveFansubMediaTitle', () => {
  it('bevorzugt title vor caption', () => {
    expect(resolveFansubMediaTitle({ title: 'Galerie-Highlight', caption: 'Ein Foto' })).toBe('Galerie-Highlight')
  })

  it('faellt auf caption zurueck, wenn kein title gesetzt ist', () => {
    expect(resolveFansubMediaTitle({ title: null, caption: 'Ein Foto' })).toBe('Ein Foto')
  })

  it('liefert null, wenn weder title noch caption gesetzt sind', () => {
    expect(resolveFansubMediaTitle({ title: null, caption: null })).toBeNull()
  })

  it('behandelt einen nur aus Leerzeichen bestehenden title als nicht vorhanden', () => {
    expect(resolveFansubMediaTitle({ title: '  ', caption: null })).toBeNull()
  })
})

describe('groupFansubMediaByCategory', () => {
  it('liefert nur Gruppen fuer Kategorien mit mindestens einem Element, in fester Reihenfolge', () => {
    const media = [
      mediaItem({ id: 1, category: 'forum' }),
      mediaItem({ id: 2, category: 'gallery' }),
      mediaItem({ id: 3, category: 'gallery' }),
    ]
    const groups = groupFansubMediaByCategory(media)
    expect(groups.map((group) => group.category)).toEqual(['gallery', 'forum'])
    expect(groups[0].items.map((item) => item.id)).toEqual([2, 3])
    expect(groups[1].items.map((item) => item.id)).toEqual([1])
  })

  it('liefert keine Gruppen fuer ein leeres Media-Array', () => {
    expect(groupFansubMediaByCategory([])).toEqual([])
  })

  it('ordnet unbekannte Kategorie-Werte dem "other"-Bucket zu', () => {
    const media = [mediaItem({ id: 1, category: 'unknown_value' })]
    const groups = groupFansubMediaByCategory(media)
    expect(groups).toEqual([{ category: 'other', items: [media[0]] }])
  })
})
