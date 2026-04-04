import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  addAdminAnimeBackgroundAsset,
  assignAdminAnimeCoverAsset,
  assignAdminAnimeLogoAsset,
  getAnimeByID,
  updateAdminAnime,
  uploadAdminAnimeMedia,
} from '@/lib/api'

import { useAnimePatchMutations } from './useAnimePatchMutations'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    addAdminAnimeBackgroundAsset: vi.fn(),
    assignAdminAnimeCoverAsset: vi.fn(),
    assignAdminAnimeLogoAsset: vi.fn(),
    getAnimeByID: vi.fn(),
    updateAdminAnime: vi.fn(),
    uploadAdminAnimeMedia: vi.fn(),
  }
})

describe('useAnimePatchMutations', () => {
  const setIsSubmitting = vi.fn()
  const setIsUploadingCover = vi.fn()
  const setValues = vi.fn()
  const setClearFlags = vi.fn()
  const onSuccess = vi.fn()
  const onError = vi.fn()
  const onRequest = vi.fn()
  const onResponse = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(addAdminAnimeBackgroundAsset).mockResolvedValue({ data: { id: 8 } } as never)
    vi.mocked(assignAdminAnimeCoverAsset).mockResolvedValue(undefined)
    vi.mocked(assignAdminAnimeLogoAsset).mockResolvedValue(undefined)
    vi.mocked(uploadAdminAnimeMedia).mockResolvedValue({ id: '77' } as never)
  })

  function captureMutations(
    overrides: Partial<Parameters<typeof useAnimePatchMutations>[0]> = {},
  ) {
    let captured: ReturnType<typeof useAnimePatchMutations> | null = null

    function Harness() {
      captured = useAnimePatchMutations({
        authToken: 'token',
        hasAuthToken: true,
        values: {
          title: '',
          type: '',
          contentType: '',
          status: '',
          year: '',
          maxEpisodes: '',
          titleDE: '',
          titleEN: '',
          genreTokens: [],
          description: '',
          coverImage: '',
        },
        clearFlags: {
          year: false,
          maxEpisodes: false,
          titleDE: false,
          titleEN: false,
          genre: false,
          description: false,
          coverImage: false,
        },
        onSuccess,
        onError,
        options: {
          onRequest,
          onResponse,
        },
        setIsSubmitting,
        setIsUploadingCover,
        setValues,
        setClearFlags,
        ...overrides,
      })

      return null
    }

    renderToStaticMarkup(createElement(Harness))
    if (!captured) throw new Error('Hook capture failed')
    return captured
  }

  it('requires an existing anime ID before using the persisted edit-cover mutation seam', async () => {
    const mutations = captureMutations()

    await mutations.uploadAndSetCover(new File(['cover'], 'lain.jpg', { type: 'image/jpeg' }))

    expect(onError).toHaveBeenCalledWith('Anime-ID fehlt. Bitte zuerst einen Anime-Kontext laden.')
    expect(uploadAdminAnimeMedia).not.toHaveBeenCalled()
    expect(updateAdminAnime).not.toHaveBeenCalled()
  })

  it('uploads through the persisted edit path and assigns the live cover asset after upload', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { id: 42, title: 'Lain' } } as never)

    const mutations = captureMutations()

    await mutations.uploadAndSetCover(new File(['cover'], 'lain.jpg', { type: 'image/jpeg' }), 42)

    expect(uploadAdminAnimeMedia).toHaveBeenCalledWith({
      animeID: 42,
      assetType: 'poster',
      file: expect.any(File),
      authToken: 'token',
    })
    expect(assignAdminAnimeCoverAsset).toHaveBeenCalledWith(42, '77', 'token')
    expect(updateAdminAnime).not.toHaveBeenCalledWith(42, { cover_image: 'lain.jpg' }, 'token')
    expect(getAnimeByID).toHaveBeenCalledWith(42, { include_disabled: true })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('uploads and links a singular non-cover asset through the generic mutation seam', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { id: 42, title: 'Lain' } } as never)

    const mutations = captureMutations()

    await mutations.uploadAndLinkAsset(new File(['logo'], 'lain-logo.png', { type: 'image/png' }), 'logo', 42)

    expect(uploadAdminAnimeMedia).toHaveBeenCalledWith({
      animeID: 42,
      assetType: 'logo',
      file: expect.any(File),
      authToken: 'token',
    })
    expect(assignAdminAnimeLogoAsset).toHaveBeenCalledWith(42, '77', 'token')
    expect(addAdminAnimeBackgroundAsset).not.toHaveBeenCalled()
    expect(getAnimeByID).toHaveBeenCalledWith(42, { include_disabled: true })
  })

  it('keeps background uploads additive instead of replacing a singular slot', async () => {
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { id: 42, title: 'Lain' } } as never)

    const mutations = captureMutations()

    await mutations.uploadAndLinkAsset(new File(['background'], 'bg.jpg', { type: 'image/jpeg' }), 'background', 42)

    expect(uploadAdminAnimeMedia).toHaveBeenCalledWith({
      animeID: 42,
      assetType: 'background',
      file: expect.any(File),
      authToken: 'token',
    })
    expect(addAdminAnimeBackgroundAsset).toHaveBeenCalledWith(42, '77', 'token')
    expect(assignAdminAnimeCoverAsset).not.toHaveBeenCalled()
    expect(assignAdminAnimeLogoAsset).not.toHaveBeenCalled()
  })

  it('surfaces ApiError details for edit save failures', async () => {
    vi.mocked(updateAdminAnime).mockRejectedValue(
      new ApiError(500, 'Interner Serverfehler', null, 'db_schema_mismatch', 'Fehlende Spalte: anime.status'),
    )

    const mutations = captureMutations({
      values: {
        title: 'Lain',
        type: '',
        contentType: '',
        status: '',
        year: '',
        maxEpisodes: '',
        titleDE: '',
        titleEN: '',
        genreTokens: [],
        description: '',
        coverImage: '',
      },
    })

    await mutations.submit(42)

    expect(onError).toHaveBeenCalledWith('(500) Interner Serverfehler\nFehlende Spalte: anime.status')
  })

  it('surfaces ApiError details for cover assign failures after upload succeeds', async () => {
    vi.mocked(assignAdminAnimeCoverAsset).mockRejectedValue(
      new ApiError(
        500,
        'Interner Serverfehler',
        null,
        'cover_persist_failed',
        'Poster-Verknuepfung konnte nicht gespeichert werden.',
      ),
    )

    const mutations = captureMutations()

    await mutations.uploadAndSetCover(new File(['cover'], 'lain.jpg', { type: 'image/jpeg' }), 42)

    expect(onError).toHaveBeenCalledWith(
      '(500) Interner Serverfehler\nPoster-Verknuepfung konnte nicht gespeichert werden.',
    )
  })

  it('surfaces structured ApiError details for non-cover asset link failures', async () => {
    vi.mocked(assignAdminAnimeLogoAsset).mockRejectedValue(
      new ApiError(500, 'Interner Serverfehler', null, 'logo_persist_failed', 'Logo konnte nicht gespeichert werden.'),
    )

    const mutations = captureMutations()

    await mutations.uploadAndLinkAsset(new File(['logo'], 'lain-logo.png', { type: 'image/png' }), 'logo', 42)

    expect(onError).toHaveBeenCalledWith('(500) Interner Serverfehler\nLogo konnte nicht gespeichert werden.')
  })
})
