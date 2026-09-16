// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import { AnimeRelations, formatRelationTypeLabel } from './AnimeRelations'

afterEach(() => cleanup())

describe('AnimeRelations', () => {
  it('shows German relation labels and never the raw database name', () => {
    render(
      <AnimeRelations
        relations={[
          {
            anime_id: 2,
            title: '11eyes',
            relation_type: 'full-story',
            cover_image: '/api/v1/media/image?item_id=68546f5d&kind=primary&provider=jellyfin',
            year: 2009,
            type: 'tv',
          },
          {
            anime_id: 3,
            title: '11eyes: Pink Phantasmagoria',
            relation_type: 'side-story',
            cover_image: null,
            year: 2010,
            type: 'ova',
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Verwandte Anime' })).not.toBeNull()
    const main = screen.getByRole('link', { name: /Hauptgeschichte/ })
    expect(within(main).getByText('Hauptgeschichte')).not.toBeNull()
    expect(screen.getByText('Nebengeschichte')).not.toBeNull()
    expect(document.body.textContent).not.toMatch(/side-story|full-story|Related/)
    expect(screen.getByAltText('11eyes').getAttribute('src')).toContain('/api/v1/media/image')
  })

  it('maps every relation type to a German label with a neutral fallback', () => {
    expect(formatRelationTypeLabel('full-story')).toBe('Hauptgeschichte')
    expect(formatRelationTypeLabel('side-story')).toBe('Nebengeschichte')
    expect(formatRelationTypeLabel('sequel')).toBe('Fortsetzung')
    expect(formatRelationTypeLabel('summary')).toBe('Zusammenfassung')
    expect(formatRelationTypeLabel('alternative-version')).toBe('Alternative Version')
    expect(formatRelationTypeLabel('something-new')).toBe('Verwandt')
  })
})
