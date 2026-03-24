import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminAnimeCreatePage, {
  buildManualCreateRedirectPath,
  createManualAnimeAndRedirect,
  uploadManualCreateCover,
} from './page'

describe('AdminAnimeCreatePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders an unsaved preview with placeholder title and cover before persistence', () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />)

    expect(markup).toContain('Unbenannter Anime-Entwurf')
    expect(markup).toContain('Noch kein Cover ausgewaehlt')
    expect(markup).toContain('Anime erstellen')
    expect(markup).toContain('Noch kein manueller Entwurf')
  })

  it('keeps the default primary CTA copy until submit is in progress', () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />)

    expect(markup).toContain('Anime erstellen')
    expect(markup).not.toContain('Anime wird erstellt...')
  })

  it('builds the create redirect path for the live editor route', () => {
    expect(buildManualCreateRedirectPath(42)).toBe('/admin/anime/42/edit')
  })

  it('uses createAdminAnime and redirects to the persisted edit route after success', async () => {
    const createAdminAnimeMock = vi.fn().mockResolvedValue({
      data: {
        id: 42,
      },
    })
    const setLocationHref = vi.fn()

    const response = await createManualAnimeAndRedirect(
      {
        title: 'Serial Experiments Lain',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
        cover_image: 'lain.jpg',
      },
      {
        createAdminAnime: createAdminAnimeMock,
        setLocationHref,
      },
    )

    expect(createAdminAnimeMock).toHaveBeenCalledWith({
      title: 'Serial Experiments Lain',
      type: 'tv',
      content_type: 'anime',
      status: 'ongoing',
      cover_image: 'lain.jpg',
    })
    expect(setLocationHref).toHaveBeenCalledWith('/admin/anime/42/edit')
    expect(response.data.id).toBe(42)
  })

  it('uploads the draft cover through the pre-save upload route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          file_name: 'lain.jpg',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadManualCreateCover(new File(['cover'], 'lain.jpg', { type: 'image/jpeg' }))).resolves.toBe(
      'lain.jpg',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/upload-cover',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })
})
