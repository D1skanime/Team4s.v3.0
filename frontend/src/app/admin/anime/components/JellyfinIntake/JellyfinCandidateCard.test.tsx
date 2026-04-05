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
          already_imported: false,
        }}
        onSelect={() => {}}
        onLoadPreview={() => {}}
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
    expect(markup).toContain('Diesen Treffer ansehen')
    expect(markup).toContain('Jellyfin Vorschau laden')
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
          already_imported: false,
        }}
        isSelected
        onSelect={() => {}}
        onLoadPreview={() => {}}
      />,
    )

    expect(markup).toContain('Hohe Uebereinstimmung')
    expect(markup).toContain('Ausgewaehlt')
    expect(markup).toContain('Noch nichts ins Formular uebernommen')
    expect(markup).not.toContain('Entfernen')
    expect(markup).not.toContain('Abwaehlen')
  })

  it('blocks preview loading for already imported jellyfin matches', () => {
    const markup = renderToStaticMarkup(
      <JellyfinCandidateCard
        candidate={{
          jellyfin_series_id: 'series-3',
          name: 'Macross',
          path: '/media/Anime/OVA/Anime.OVA.Sub/Macross Flash Back 2012',
          parent_context: 'Anime.OVA.Sub',
          library_context: 'media',
          confidence: 'medium',
          type_hint: {
            confidence: 'high',
            suggested_type: 'ova',
            reasons: ['Token "OVA" im Pfad oder Namen erkannt.'],
          },
          already_imported: true,
          existing_anime_id: 77,
          existing_title: 'Macross Flash Back 2012',
        }}
        isSelected
        onSelect={() => {}}
        onLoadPreview={() => {}}
      />,
    )

    expect(markup).toContain('Bereits als Anime angelegt')
    expect(markup).toContain('Macross Flash Back 2012')
    expect(markup).toContain('Bestehenden Anime oeffnen')
    expect(markup).toContain('Bereits importiert')
    expect(markup).not.toContain('Jellyfin Vorschau laden')
  })
})
