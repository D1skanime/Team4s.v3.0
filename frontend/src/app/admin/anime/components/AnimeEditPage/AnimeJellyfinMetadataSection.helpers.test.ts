import { describe, expect, it } from 'vitest'

import { formatCoverSource, summarizeAssetSlotDecision, summarizeAssetSlots } from './AnimeJellyfinMetadataSection'

describe('AnimeJellyfinMetadataSection helpers', () => {
  it('reports missing provider asset data clearly', () => {
    expect(summarizeAssetSlots()).toBe('Keine Provider-Assets geladen.')
  })

  it('summarizes available provider assets compactly', () => {
    expect(
      summarizeAssetSlots({
        cover: { present: true, kind: 'cover', source: 'jellyfin' },
        logo: { present: false, kind: 'logo', source: 'jellyfin' },
        banner: { present: true, kind: 'banner', source: 'jellyfin' },
        backgrounds: [{ present: true, kind: 'background', source: 'jellyfin', index: 0 }],
        background_video: { present: false, kind: 'background_video', source: 'jellyfin' },
      }),
    ).toBe('Verfuegbar: Poster, Banner, 1 Backgrounds')
  })

  it('reports an empty provider asset set explicitly', () => {
    expect(
      summarizeAssetSlots({
        cover: { present: false, kind: 'cover', source: 'jellyfin' },
        logo: { present: false, kind: 'logo', source: 'jellyfin' },
        banner: { present: false, kind: 'banner', source: 'jellyfin' },
        backgrounds: [],
        background_video: { present: false, kind: 'background_video', source: 'jellyfin' },
      }),
    ).toBe('Keine Provider-Assets gefunden.')
  })

  it('formats manual cover provenance in German copy', () => {
    expect(formatCoverSource('manual')).toBe('Manuelles Cover aktiv')
  })

  it('describes protected manual cover replacements explicitly', () => {
    expect(
      summarizeAssetSlotDecision('cover', {
        hasIncoming: true,
        currentSource: 'manual',
      }),
    ).toBe('Manuelles Cover bleibt geschuetzt, bis es explizit ersetzt wird')
  })

  it('describes provider-owned covers as already active', () => {
    expect(
      summarizeAssetSlotDecision('cover', {
        hasIncoming: true,
        currentSource: 'provider',
      }),
    ).toBe('Provider-Cover ist bereits aktiv')
  })

  it('describes missing provider banners as unavailable', () => {
    expect(
      summarizeAssetSlotDecision('banner', {
        hasIncoming: false,
      }),
    ).toBe('Kein Provider-Banner verfuegbar')
  })

  it('marks banner slots as explicitly controllable when provider data exists', () => {
    expect(
      summarizeAssetSlotDecision('banner', {
        hasIncoming: true,
      }),
    ).toBe('Banner kann explizit aus Jellyfin uebernommen oder manuell ersetzt werden')
  })
})
