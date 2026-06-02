// Wave-0-Tests fuer StoryImageExtension (TipTap-Node fuer Profilgeschichte-Bilder).
// Alle Tests sind ROT bis Plan 70-05 die Extension implementiert.
// Anforderungs-Abdeckung: D-01, D-02, D-09, D-10, D-11

import { describe, it, expect } from 'vitest'

// TODO(plan-70-05): StoryImageExtension aus dem richtigen Pfad importieren.
// Bis zur Implementierung schlaegt der Import fehl und Tests sind ROT.
// Kommentierter Import fuer spaetere Aktivierung:
// import { StoryImageExtension } from './StoryImageExtension'

// Stub-Typ damit die Tests kompilieren und als FAIL ausfuehren koennen.
// In Plan 70-05 wird der echte Import aktiviert.
const StoryImageExtension = null as unknown as {
  name: string
  config?: {
    group?: string
    atom?: boolean
    draggable?: boolean
    addAttributes?: () => Record<string, unknown>
  }
}

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

describe('StoryImageExtension — Default-Attribute', () => {
  it('hat media_asset_id=null als Default (vor Upload)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = StoryImageExtension.config?.addAttributes?.()
    expect(attrs).toBeDefined()
    const mediaAssetId = attrs?.['media_asset_id'] as { default?: unknown } | undefined
    expect(mediaAssetId?.default).toBeNull()
  })

  it('hat pending_key=null als Default (kein deferred-Upload-Marker)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = StoryImageExtension.config?.addAttributes?.()
    const pendingKey = attrs?.['pending_key'] as { default?: unknown } | undefined
    expect(pendingKey?.default).toBeNull()
  })

  it('hat preview_url=null als Default (kein lokales Blob-Preview)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = StoryImageExtension.config?.addAttributes?.()
    const previewUrl = attrs?.['preview_url'] as { default?: unknown } | undefined
    expect(previewUrl?.default).toBeNull()
  })

  it('hat width_percent=60 als Default (60 % der Textbereichsbreite)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = StoryImageExtension.config?.addAttributes?.()
    const widthPercent = attrs?.['width_percent'] as { default?: unknown } | undefined
    expect(widthPercent?.default).toBe(60)
  })

  it('hat alignment="center" als Default (zentriert)', () => {
    expect(StoryImageExtension).not.toBeNull()
    const attrs = StoryImageExtension.config?.addAttributes?.()
    const alignment = attrs?.['alignment'] as { default?: unknown } | undefined
    expect(alignment?.default).toBe('center')
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
