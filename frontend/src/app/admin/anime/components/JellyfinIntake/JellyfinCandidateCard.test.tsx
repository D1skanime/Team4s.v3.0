import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { JellyfinCandidateCard } from './JellyfinCandidateCard'

describe('JellyfinCandidateCard', () => {
  it('renders all required evidence and preview tiles', () => {
    const markup = renderToStaticMarkup(
      <JellyfinCandidateCard
        candidate={{
          jellyfin_series_id: 'series-1',
          name: 'Naruto OVA',
          path: 'D:/Anime/Bonus/Naruto OVA',
          parent_context: 'Bonus',
          library_context: 'Anime',
          confidence: 'high',
          poster_url: '/api/v1/media/image?item_id=series-1&kind=primary&provider=jellyfin',
          banner_url: '/api/v1/media/image?item_id=series-1&kind=banner&provider=jellyfin',
          logo_url: '/api/v1/media/image?item_id=series-1&kind=logo&provider=jellyfin',
          background_url: '/api/v1/media/image?item_id=series-1&kind=backdrop&provider=jellyfin',
          type_hint: {
            confidence: 'high',
            suggested_type: 'ova',
            reasons: ['Token "OVA" im Ordnernamen erkannt.'],
          },
        }}
        onReview={() => {}}
      />,
    )

    expect(markup).toContain('Naruto OVA')
    expect(markup).toContain('series-1')
    expect(markup).toContain('D:/Anime/Bonus/Naruto OVA')
    expect(markup).toContain('Bonus')
    expect(markup).toContain('Anime')
    expect(markup).toContain('Typ-Vorschlag: ova')
    expect(markup).toContain('Token &quot;OVA&quot; im Ordnernamen erkannt.')
    expect(markup).toContain('poster')
    expect(markup).toContain('banner')
    expect(markup).toContain('logo')
    expect(markup).toContain('background')
  })

  it('shows confidence treatment and no asset deselection controls', () => {
    const markup = renderToStaticMarkup(
      <JellyfinCandidateCard
        candidate={{
          jellyfin_series_id: 'series-2',
          name: 'Naruto',
          path: 'D:/Anime/TV/Naruto',
          parent_context: 'TV',
          library_context: 'Anime',
          confidence: 'high',
          type_hint: {
            confidence: 'medium',
            suggested_type: 'tv',
            reasons: ['Standard-Vorschlag fuer Serienordner.'],
          },
        }}
        isSelected
        onReview={() => {}}
      />,
    )

    expect(markup).toContain('Hohe Uebereinstimmung')
    expect(markup).toContain('Ausgewaehlt')
    expect(markup).not.toContain('Entfernen')
    expect(markup).not.toContain('Abwaehlen')
  })
})
