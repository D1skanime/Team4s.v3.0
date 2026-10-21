import { describe, expect, it } from 'vitest'

import {
  groupFansubMediaByCategory,
  previewFansubMediaCategoryGroup,
  resolveFansubMediaTitle,
} from './fansubMediaPresentation'
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

describe('previewFansubMediaCategoryGroup', () => {
  it('zeigt alle Elemente ohne "Mehr anzeigen", wenn die Kategorie das Limit nicht ueberschreitet', () => {
    const items = Array.from({ length: 6 }, (_, index) => mediaItem({ id: index + 1 }))
    const group = { category: 'gallery', items }

    const preview = previewFansubMediaCategoryGroup(group, false)

    expect(preview.visibleItems).toHaveLength(6)
    expect(preview.hasMore).toBe(false)
    expect(preview.remainingCount).toBe(0)
  })

  it('begrenzt auf das Limit und meldet die Restanzahl, wenn nicht aufgeklappt', () => {
    const items = Array.from({ length: 8 }, (_, index) => mediaItem({ id: index + 1 }))
    const group = { category: 'gallery', items }

    const preview = previewFansubMediaCategoryGroup(group, false)

    expect(preview.visibleItems.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(preview.hasMore).toBe(true)
    expect(preview.remainingCount).toBe(2)
  })

  it('zeigt alle Elemente, wenn aufgeklappt, auch wenn das Limit ueberschritten ist', () => {
    const items = Array.from({ length: 8 }, (_, index) => mediaItem({ id: index + 1 }))
    const group = { category: 'gallery', items }

    const preview = previewFansubMediaCategoryGroup(group, true)

    expect(preview.visibleItems).toHaveLength(8)
    expect(preview.hasMore).toBe(true)
    expect(preview.remainingCount).toBe(2)
  })

  it('behandelt jede Kategorie unabhaengig von einem benutzerdefinierten Limit', () => {
    const items = Array.from({ length: 4 }, (_, index) => mediaItem({ id: index + 1 }))
    const group = { category: 'forum', items }

    const preview = previewFansubMediaCategoryGroup(group, false, 3)

    expect(preview.visibleItems.map((item) => item.id)).toEqual([1, 2, 3])
    expect(preview.hasMore).toBe(true)
    expect(preview.remainingCount).toBe(1)
  })
})
