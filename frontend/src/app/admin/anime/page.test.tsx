import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import AdminAnimePage from './page'

vi.mock('@/lib/api', () => ({
  getAnimeList: vi.fn().mockResolvedValue({
    data: [
      {
        id: 42,
        title: 'Serial Experiments Lain',
        type: 'tv',
        status: 'ongoing',
        year: 1998,
        cover_image: 'lain.jpg',
        max_episodes: 13,
      },
    ],
    meta: { total: 1, page: 1, per_page: 24, total_pages: 1 },
  }),
  getRuntimeAuthToken: vi.fn(() => null),
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe('AdminAnimePage', () => {
  it('renders the anime overview shell with the live create CTA text', async () => {
    const markup = renderToStaticMarkup(await AdminAnimePage())

    expect(markup).toContain('Anime erstellen')
    expect(markup).toContain('href="/admin/anime/create"')
    expect(markup).toContain('Neue Eintraege anlegen und bestehende Anime verwalten.')
  })

  it('renders the anime overview list with edit and public actions', async () => {
    const markup = renderToStaticMarkup(await AdminAnimePage())

    expect(markup).toContain('Vorhandene Anime')
    expect(markup).toContain('Serial Experiments Lain')
    expect(markup).toContain('href="/admin/anime/42/edit"')
    expect(markup).toContain('href="/anime/42"')
  })

  it('keeps Jellyfin intake controls out of the anime overview route', async () => {
    const markup = renderToStaticMarkup(await AdminAnimePage())

    expect(markup).not.toContain('Titel suchen...')
    expect(markup).not.toContain('Treffer suchen, dann Vorschau laden')
  })

  it('renders an explicit success confirmation when returning from create', async () => {
    const markup = renderToStaticMarkup(
      await AdminAnimePage({
        searchParams: Promise.resolve({
          created: '42',
        }),
      }),
    )

    expect(markup).toContain('Anime #042 Serial Experiments Lain wurde erstellt und ist jetzt in der Übersicht verankert.')
  })
})
