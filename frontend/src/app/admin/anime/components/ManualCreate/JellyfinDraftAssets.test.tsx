import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { JellyfinDraftAssets } from './JellyfinDraftAssets'

describe('JellyfinDraftAssets', () => {
  it('renders explicit missing-slot placeholders and removal copy', () => {
    const markup = renderToStaticMarkup(
      <JellyfinDraftAssets
        animeTitle="Naruto"
        assetSlots={{
          cover: { present: true, kind: 'cover', source: 'jellyfin', url: 'https://img/cover.jpg' },
          logo: { present: false, kind: 'logo', source: 'jellyfin' },
          banner: { present: false, kind: 'banner', source: 'jellyfin' },
          backgrounds: [
            { present: true, kind: 'background', source: 'jellyfin', index: 0, url: 'https://img/background.jpg' },
            { present: true, kind: 'background', source: 'jellyfin', index: 1, url: 'https://img/background-2.jpg' },
          ],
          background_video: { present: false, kind: 'background_video', source: 'jellyfin' },
        }}
        onRemoveAsset={() => {}}
      />,
    )

    expect(markup).toContain('Kein Jellyfin-Banner gefunden')
    expect(markup).toContain('Kein Jellyfin-Logo gefunden')
    expect(markup).toContain('Kein Jellyfin-Background-Video gefunden')
    expect(markup).toContain('Background 1')
    expect(markup).toContain('Background 2')
    expect(markup).toContain('Bild aus Entwurf entfernen')
    expect(markup).toContain('Aus Entwurf entfernen')
    expect(markup).toContain('Erst die zentrale Save-Bar legt wirklich einen Anime an.')
  })
})
