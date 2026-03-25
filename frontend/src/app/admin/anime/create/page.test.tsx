import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminAnimeCreatePage, {
  appendJellyfinLinkageToCreatePayload,
  buildManualCreateDraftSnapshot,
  buildManualCreateRedirectPath,
  createManualAnimeAndRedirect,
  resolveSourceActionState,
  uploadManualCreateCover,
} from './page'
import {
  hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset,
} from '../hooks/useManualAnimeDraft'

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

  it('renders title-adjacent Jellyfin and AniSearch actions with disabled-until-meaningful-title guidance', () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />)

    expect(markup).toContain('Jellyfin Sync')
    expect(markup).toContain('AniSearch Sync')
    expect(markup).toContain('Gib zuerst einen aussagekraeftigen Anime-Titel ein. AniSearch Sync kommt in Phase 4.')
    expect(resolveSourceActionState('').canSync).toBe(false)
    expect(resolveSourceActionState('Naruto').canSync).toBe(true)
  })

  it('keeps AniSearch in placeholder mode for phase 3', () => {
    expect(resolveSourceActionState('Naruto').helperText).toContain('AniSearch Sync kommt in Phase 4.')
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

  it('hydrates the same shared draft from a Jellyfin preview without persisting first', () => {
    const snapshot = buildManualCreateDraftSnapshot({
      title: 'Naruto',
      type: 'tv',
      contentType: 'anime',
      status: 'ongoing',
      year: '',
      maxEpisodes: '',
      titleDE: '',
      titleEN: '',
      genreTokens: [],
      description: '',
      coverImage: '',
    })

    const hydrated = hydrateManualDraftFromJellyfinPreview(snapshot, {
      jellyfin_series_id: 'series-1',
      jellyfin_series_name: 'Naruto',
      jellyfin_series_path: 'D:/Anime/TV/Naruto',
      description: 'Shinobi story',
      year: 2002,
      genre: 'Action, Adventure',
      tags: ['Shounen'],
      type_hint: {
        confidence: 'medium',
        suggested_type: 'tv',
        reasons: ['TV-Ordner erkannt.'],
      },
      asset_slots: {
        cover: { present: true, kind: 'cover', source: 'jellyfin', url: 'https://img/cover.jpg' },
        logo: { present: true, kind: 'logo', source: 'jellyfin', url: 'https://img/logo.png' },
        banner: { present: false, kind: 'banner', source: 'jellyfin' },
        background: { present: true, kind: 'background', source: 'jellyfin', url: 'https://img/bg.jpg' },
        background_video: { present: false, kind: 'background_video', source: 'jellyfin' },
      },
    })

    expect(hydrated.draft.title).toBe('Naruto')
    expect(hydrated.draft.coverImage).toBe('https://img/cover.jpg')
    expect(hydrated.draft.description).toBe('Shinobi story')
    expect(hydrated.draft.genreTokens).toEqual(['Action', 'Adventure'])
    expect(hydrated.assetSlots.logo.present).toBe(true)
  })

  it('removes imported draft assets after hydration and keeps cancellation free of create calls', () => {
    const createSpy = vi.fn()
    const draft = buildManualCreateDraftSnapshot({
      title: 'Naruto',
      type: 'tv',
      contentType: 'anime',
      status: 'ongoing',
      year: '',
      maxEpisodes: '',
      titleDE: '',
      titleEN: '',
      genreTokens: [],
      description: '',
      coverImage: 'https://img/cover.jpg',
    })

    const removal = removeJellyfinDraftAsset(
      draft,
      {
        cover: { present: true, kind: 'cover', source: 'jellyfin', url: 'https://img/cover.jpg' },
        logo: { present: false, kind: 'logo', source: 'jellyfin' },
        banner: { present: false, kind: 'banner', source: 'jellyfin' },
        background: { present: false, kind: 'background', source: 'jellyfin' },
        background_video: { present: false, kind: 'background_video', source: 'jellyfin' },
      },
      'cover',
    )

    expect(removal.draft.coverImage).toBe('')
    expect(removal.assetSlots.cover.present).toBe(false)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('adds Jellyfin linkage only to the explicit create payload after preview selection', () => {
    const payload = appendJellyfinLinkageToCreatePayload(
      {
        title: 'Naruto',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
        cover_image: 'naruto.jpg',
      },
      {
        jellyfin_series_id: 'series-42',
        jellyfin_series_name: 'Naruto',
        jellyfin_series_path: 'D:/Anime/TV/Naruto',
        tags: [],
        type_hint: {
          confidence: 'high',
          suggested_type: 'tv',
          reasons: ['Serienordner erkannt.'],
        },
        asset_slots: {
          cover: { present: true, kind: 'cover', source: 'jellyfin', url: 'https://img/cover.jpg' },
          logo: { present: false, kind: 'logo', source: 'jellyfin' },
          banner: { present: false, kind: 'banner', source: 'jellyfin' },
          background: { present: false, kind: 'background', source: 'jellyfin' },
          background_video: { present: false, kind: 'background_video', source: 'jellyfin' },
        },
      },
    )

    expect(payload.source).toBe('jellyfin:series-42')
    expect(payload.folder_name).toBe('D:/Anime/TV/Naruto')
  })

  it('keeps manual-only create payload unchanged when no Jellyfin preview exists', () => {
    const payload = appendJellyfinLinkageToCreatePayload(
      {
        title: 'Naruto',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
        cover_image: 'naruto.jpg',
      },
      null,
    )

    expect(payload.source).toBeUndefined()
    expect(payload.folder_name).toBeUndefined()
  })
})
