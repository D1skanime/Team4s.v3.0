import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAnimeByID, updateAdminAnime } from '@/lib/api'

import { useAnimePatchMutations } from './useAnimePatchMutations'

vi.mock('@/lib/api', () => ({
  getAnimeByID: vi.fn(),
  updateAdminAnime: vi.fn(),
}))

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
  })

  function captureMutations() {
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
      })

      return null
    }

    renderToStaticMarkup(createElement(Harness))
    if (!captured) throw new Error('Hook capture failed')
    return captured
  }

  it('requires an existing anime ID before using the persisted edit-cover mutation seam', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const mutations = captureMutations()

    await mutations.uploadAndSetCover(new File(['cover'], 'lain.jpg', { type: 'image/jpeg' }))

    expect(onError).toHaveBeenCalledWith('Anime-ID fehlt. Bitte zuerst einen Anime-Kontext laden.')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updateAdminAnime).not.toHaveBeenCalled()
  })

  it('uploads through the persisted edit path and patches the live record after upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { file_name: 'lain.jpg' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(updateAdminAnime).mockResolvedValue({ data: { id: 42 } } as never)
    vi.mocked(getAnimeByID).mockResolvedValue({ data: { id: 42, title: 'Lain' } } as never)

    const mutations = captureMutations()

    await mutations.uploadAndSetCover(new File(['cover'], 'lain.jpg', { type: 'image/jpeg' }), 42)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/upload-cover',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(updateAdminAnime).toHaveBeenCalledWith(42, { cover_image: 'lain.jpg' }, 'token')
    expect(getAnimeByID).toHaveBeenCalledWith(42, { include_disabled: true })
    expect(onSuccess).toHaveBeenCalled()
  })
})
