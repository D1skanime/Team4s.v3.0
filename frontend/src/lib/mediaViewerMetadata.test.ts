import { describe, expect, it } from 'vitest'

import {
  resolveAccessibleTitle,
  resolveCaption,
  resolveCategoryLabel,
  resolveThumbnailUrl,
} from './mediaViewerMetadata'

const CATEGORY_LABELS: Record<string, string> = {
  screenshot: 'Fansub Screenshot',
  typesetting_karaoke: 'Typesetting-/Karaoke-Beispiel',
}

describe('resolveCategoryLabel', () => {
  it('liefert das zugeordnete Label, wenn die Kategorie in categoryLabels bekannt ist', () => {
    expect(resolveCategoryLabel('screenshot', 'Bild', CATEGORY_LABELS)).toBe('Fansub Screenshot')
  })

  it('liefert die Kategorie unverändert, wenn sie nicht in categoryLabels bekannt ist', () => {
    expect(resolveCategoryLabel('unbekannte_kategorie', 'Bild', CATEGORY_LABELS)).toBe('unbekannte_kategorie')
  })

  it('fällt auf mediaType zurück, wenn die Kategorie fehlt oder leer ist', () => {
    expect(resolveCategoryLabel(null, 'Bild', CATEGORY_LABELS)).toBe('Bild')
    expect(resolveCategoryLabel('', 'Bild', CATEGORY_LABELS)).toBe('Bild')
  })

  it('liefert einen leeren String, wenn weder Kategorie noch mediaType vorhanden sind', () => {
    expect(resolveCategoryLabel(undefined, '', CATEGORY_LABELS)).toBe('')
  })
})

describe('resolveCaption', () => {
  it('bevorzugt die Bildunterschrift, wenn beide Werte vorhanden sind', () => {
    expect(resolveCaption('Die Bildunterschrift', 'Die Beschreibung')).toBe('Die Bildunterschrift')
  })

  it('fällt auf description zurück, wenn nur description vorhanden ist (ReleaseGallery-D-07-Fall)', () => {
    expect(resolveCaption(null, 'Die Beschreibung')).toBe('Die Beschreibung')
  })

  it('fällt auf description zurück, wenn caption nur aus Leerzeichen besteht', () => {
    expect(resolveCaption('   ', 'Die Beschreibung')).toBe('Die Beschreibung')
  })

  it('liefert einen leeren String, wenn beide Werte fehlen oder leer sind', () => {
    expect(resolveCaption(null, null)).toBe('')
    expect(resolveCaption('', '')).toBe('')
  })
})

describe('resolveThumbnailUrl', () => {
  it('bevorzugt thumbnailUrl, wenn alle drei Werte vorhanden sind', () => {
    expect(resolveThumbnailUrl('/thumb.jpg', '/display.jpg', '/original.jpg')).toBe('/thumb.jpg')
  })

  it('fällt auf displayUrl zurück, wenn thumbnailUrl fehlt', () => {
    expect(resolveThumbnailUrl(null, '/display.jpg', '/original.jpg')).toBe('/display.jpg')
  })

  it('fällt auf originalUrl zurück, wenn nur originalUrl vorhanden ist (ReleaseGallery-D-07-Fall)', () => {
    expect(resolveThumbnailUrl(null, null, '/original.jpg')).toBe('/original.jpg')
  })

  it('liefert einen leeren String, wenn alle drei Werte fehlen oder leer sind', () => {
    expect(resolveThumbnailUrl(null, undefined, '')).toBe('')
    expect(resolveThumbnailUrl('  ', '  ', '  ')).toBe('')
  })
})

describe('resolveAccessibleTitle', () => {
  it('bevorzugt title, wenn vorhanden', () => {
    expect(resolveAccessibleTitle('Mein Titel', 'Meine Bildunterschrift')).toBe('Mein Titel')
  })

  it('fällt auf caption zurück, wenn title fehlt', () => {
    expect(resolveAccessibleTitle(null, 'Meine Bildunterschrift')).toBe('Meine Bildunterschrift')
  })

  it("liefert 'Bild', wenn beide Werte fehlen oder leer sind", () => {
    expect(resolveAccessibleTitle(null, null)).toBe('Bild')
    expect(resolveAccessibleTitle('  ', '  ')).toBe('Bild')
  })
})
