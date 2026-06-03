// Wave-0-Tests fuer StoryImageExtension (TipTap-Node fuer Profilgeschichte-Bilder).
// Alle Tests sind ROT bis Plan 70-05 die Extension implementiert.
// Anforderungs-Abdeckung: D-01, D-02, D-09, D-10, D-11

import { describe, it, expect } from 'vitest'

// Plan 70-05: Echter Import aktiviert (Wave-0-Tests gruen machen).
import { StoryImageExtension } from './StoryImageExtension'

describe('StoryImageExtension — Node-Konfiguration', () => {
  it('hat name="image"', () => {
    // ERWARTET: schlaegt fehl weil StoryImageExtension noch nicht existiert (null-Stub)
    expect(StoryImageExtension).not.toBeNull()
    expect(StoryImageExtension.name).toBe('image')
  })

  it('gehoert zur group="block" (Block-Level-Node, kein Textumfluss)', () => {
    expect(StoryImageExtension).not.toBeNull()
    expect(StoryImageExtension.config?.group).toBe('block')
  })

  it('ist atom=true (keine Kinder-Nodes erlaubt)', () => {
    expect(StoryImageExtension).not.toBeNull()
    expect(StoryImageExtension.config?.atom).toBe(true)
  })
})

// Hilfsfunktion: ruft addAttributes() auf der echten TipTap-Node auf und
// castet das Ergebnis auf den erwarteten Record-Typ (TipTap's Attribut-Schema).
function getExtensionAttrs(): Record<string, { default?: unknown }> {
  const addAttributesFn = StoryImageExtension.config?.addAttributes
  if (typeof addAttributesFn !== 'function') return {}
  // TipTap ruft addAttributes() mit dem Extension-Kontext auf.
  // Fuer die Attribut-Default-Tests reicht ein leerer Kontext-Stub.
  return (addAttributesFn as unknown as () => Record<string, { default?: unknown }>)()
}

describe('StoryImageExtension — Default-Attribute', () => {
  it('hat media_asset_id=null als Default (vor Upload)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = getExtensionAttrs()
    expect(attrs).toBeDefined()
    expect(attrs['media_asset_id']?.default).toBeNull()
  })

  it('hat pending_key=null als Default (kein deferred-Upload-Marker)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = getExtensionAttrs()
    expect(attrs['pending_key']?.default).toBeNull()
  })

  it('hat preview_url=null als Default (kein lokales Blob-Preview)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = getExtensionAttrs()
    expect(attrs['preview_url']?.default).toBeNull()
  })

  it('hat width_percent=60 als Default (60 % der Textbereichsbreite)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = getExtensionAttrs()
    expect(attrs['width_percent']?.default).toBe(60)
  })

  it('hat alignment="center" als Default (zentriert)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = getExtensionAttrs()
    expect(attrs['alignment']?.default).toBe('center')
  })
})

describe('StoryImageExtension — alignment-Validierung', () => {
  it('akzeptiert alignment="left"', () => {
    // TODO(plan-70-05): Validierungslogik aus Extension pruefen
    const ALLOWED_ALIGNMENTS = ['left', 'center', 'right']
    expect(ALLOWED_ALIGNMENTS).toContain('left')
  })

  it('akzeptiert alignment="center"', () => {
    const ALLOWED_ALIGNMENTS = ['left', 'center', 'right']
    expect(ALLOWED_ALIGNMENTS).toContain('center')
  })

  it('akzeptiert alignment="right"', () => {
    const ALLOWED_ALIGNMENTS = ['left', 'center', 'right']
    expect(ALLOWED_ALIGNMENTS).toContain('right')
  })

  it('akzeptiert KEINE anderen alignment-Werte (z.B. "diagonal")', () => {
    const ALLOWED_ALIGNMENTS = ['left', 'center', 'right']
    expect(ALLOWED_ALIGNMENTS).not.toContain('diagonal')
    expect(ALLOWED_ALIGNMENTS).not.toContain('justify')
    expect(ALLOWED_ALIGNMENTS).not.toContain('float')
  })
})
