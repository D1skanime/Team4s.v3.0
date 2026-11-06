// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  it('rendert die Ueberschrift als echtes <h2> ueber den Heading-Grundbaustein statt als rohes Element mit eigener Farbe', () => {
    render(
      <AnimeRelations
        relations={[{ anime_id: 2, title: '11eyes', relation_type: 'full-story', cover_image: null, year: 2009, type: 'tv' }]}
        variant="compact"
      />,
    )

    const heading = screen.getByRole('heading', { name: 'Verwandte Anime' })
    expect(heading.tagName).toBe('H2')
    // Heading.module.css liefert ueber .heading die eigene Zweck-Farbe (--heading-color-Hook) --
    // diese Klasse muss auf dem Element landen, sonst ginge die Ueberschrift weiterhin ueber ein
    // rohes <h2> ohne den Hook (siehe Heading.tsx/.module.css).
    expect(heading.className).toMatch(/heading/i)
  })

  it('setzt in AnimeRelations.module.css keine hartcodierte weisse Textfarbe mehr fuer .title -- die Farbe kommt ausschliesslich ueber Headings --heading-color-Hook', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/anime/AnimeRelations.module.css'), 'utf8')
    expect(source).not.toMatch(/\.title\s*{[^}]*color:\s*#fff/)
    expect(source).not.toMatch(/\.compact\s+\.title\s*{[^}]*color/)
  })
})
