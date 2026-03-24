import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AdminAnimePage from './page'

describe('AdminAnimePage', () => {
  it('renders the manual intake copy with the exact primary CTA text', () => {
    const markup = renderToStaticMarkup(<AdminAnimePage />)

    expect(markup).toContain('Neu manuell')
    expect(markup).toContain('href="/admin/anime/create"')
    expect(markup).toContain('Titel und Cover reichen fuer den ersten Anime-Eintrag.')
  })

  it('renders a reserved Jellyfin branch without phase 3 search or preview UI', () => {
    const markup = renderToStaticMarkup(<AdminAnimePage />)

    expect(markup).toContain('Jellyfin')
    expect(markup).not.toContain('Titel suchen...')
    expect(markup).not.toContain('Anime-Liste')
    expect(markup).not.toContain('Suche und Filter')
  })
})
