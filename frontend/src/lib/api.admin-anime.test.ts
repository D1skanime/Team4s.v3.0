import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  assignAdminAnimeBackgroundVideoAsset,
  assignAdminAnimeLogoAsset,
  createAdminAnime,
  createAdminAnimeRelation,
  loadAdminAnimeEditAniSearchEnrichment,
  searchAdminAnimeRelationTargets,
  updateAdminAnime,
  uploadAdminAnimeMedia,
} from './api'
import { createAdminAnimeFromJellyfinDraft } from './api/admin-anime-intake'

describe('admin anime api error propagation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('preserves backend code and details for createAdminAnime failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Interner Serverfehler',
            code: 'db_schema_mismatch',
            details: 'Fehlende Spalte: anime.status',
          },
        }),
      }),
    )

    await expect(
      createAdminAnime({
        title: 'Lain',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
        cover_image: 'lain.jpg',
      }),
    ).rejects.toMatchObject<ApiError>({
      status: 500,
      message: 'Interner Serverfehler',
      code: 'db_schema_mismatch',
      details: 'Fehlende Spalte: anime.status',
    })
  })

  it('preserves backend code and details for updateAdminAnime failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Interner Serverfehler',
            code: 'cover_persist_failed',
            details: 'Poster-Verknuepfung konnte nicht gespeichert werden.',
          },
        }),
      }),
    )

    await expect(updateAdminAnime(42, { cover_image: 'lain.jpg' })).rejects.toMatchObject<ApiError>({
      status: 500,
      message: 'Interner Serverfehler',
      code: 'cover_persist_failed',
      details: 'Poster-Verknuepfung konnte nicht gespeichert werden.',
    })
  })

  it('preserves backend code and details for the intake create seam', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Interner Serverfehler',
            code: 'source_link_persist_failed',
            details: 'Jellyfin-Quelle konnte nicht gespeichert werden.',
          },
        }),
      }),
    )

    await expect(
      createAdminAnimeFromJellyfinDraft({
        title: 'Lain',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
        cover_image: 'lain.jpg',
        source: 'jellyfin:series-42',
      }),
    ).rejects.toMatchObject<ApiError>({
      status: 500,
      message: 'Interner Serverfehler',
      code: 'source_link_persist_failed',
      details: 'Jellyfin-Quelle konnte nicht gespeichert werden.',
    })
  })

  it('preserves backend code and details for admin relation target search failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'anime nicht gefunden',
            code: 'relation_owner_missing',
            details: 'Der aktuelle Anime existiert nicht mehr.',
          },
        }),
      }),
    )

    await expect(searchAdminAnimeRelationTargets(42, 'Naruto')).rejects.toMatchObject<ApiError>({
      status: 404,
      message: 'anime nicht gefunden',
      code: 'relation_owner_missing',
      details: 'Der aktuelle Anime existiert nicht mehr.',
    })
  })

  it('preserves backend code and details for admin relation create failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'relation existiert bereits oder ist ungueltig',
            code: 'relation_conflict',
            details: 'Die Relation ist doppelt oder verletzt die Richtungsregeln.',
          },
        }),
      }),
    )

    await expect(
      createAdminAnimeRelation(42, {
        target_anime_id: 84,
        relation_label: 'Fortsetzung',
      }),
    ).rejects.toMatchObject<ApiError>({
      status: 409,
      message: 'relation existiert bereits oder ist ungueltig',
      code: 'relation_conflict',
      details: 'Die Relation ist doppelt oder verletzt die Richtungsregeln.',
    })
  })

  it('accepts the full phase 7 asset vocabulary for admin anime uploads', async () => {
    const send = vi.fn(function (this: MockXHR) {
      this.status = 201
      this.responseText = JSON.stringify({
        id: 'media-42',
        status: 'completed',
        url: '/media/anime/42/logo/media-42/original.png',
        files: [],
      })
      this.onload?.({} as ProgressEvent<EventTarget>)
    })

    class MockXHR {
      status = 0
      responseText = ''
      upload = { onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null }
      onload: ((event: ProgressEvent<EventTarget>) => void) | null = null
      onerror: ((event: ProgressEvent<EventTarget>) => void) | null = null
      open = vi.fn()
      setRequestHeader = vi.fn()
      send = send
    }

    vi.stubGlobal('window', {} as Window & typeof globalThis)
    vi.stubGlobal('XMLHttpRequest', MockXHR as unknown as typeof XMLHttpRequest)

    const assetTypes = ['poster', 'banner', 'logo', 'background', 'background_video'] as const
    for (const assetType of assetTypes) {
      await expect(
        uploadAdminAnimeMedia({
          animeID: 42,
          assetType,
          file: new File([assetType], `${assetType}.bin`, { type: assetType === 'background_video' ? 'video/mp4' : 'image/png' }),
        }),
      ).resolves.toMatchObject({ id: 'media-42' })
    }

    expect(send).toHaveBeenCalledTimes(assetTypes.length)
  })

  it('preserves backend code and details for logo asset link failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'logo konnte nicht gesetzt werden',
            code: 'logo_persist_failed',
            details: 'Das Logo-Media-Asset passt nicht zum erwarteten Slot.',
          },
        }),
      }),
    )

    await expect(assignAdminAnimeLogoAsset(42, 'media-logo')).rejects.toMatchObject<ApiError>({
      status: 409,
      message: 'logo konnte nicht gesetzt werden',
      code: 'logo_persist_failed',
      details: 'Das Logo-Media-Asset passt nicht zum erwarteten Slot.',
    })
  })

  it('preserves backend code and details for background video asset link failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'background_video konnte nicht gesetzt werden',
            code: 'background_video_persist_failed',
            details: 'Das Video konnte nicht mit dem Anime verknuepft werden.',
          },
        }),
      }),
    )

    await expect(assignAdminAnimeBackgroundVideoAsset(42, 'media-video')).rejects.toMatchObject<ApiError>({
      status: 422,
      message: 'background_video konnte nicht gesetzt werden',
      code: 'background_video_persist_failed',
      details: 'Das Video konnte nicht mit dem Anime verknuepft werden.',
    })
  })

  it('posts the edit AniSearch contract with protected_fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          mode: 'draft',
          anisearch_id: '12345',
          source: 'anisearch:12345',
          draft: { title: 'AniSearch Title', source: 'anisearch:12345' },
          updated_fields: ['title'],
          relations_applied: 0,
          relations_skipped_existing: 0,
          skipped_protected_fields: ['title'],
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await loadAdminAnimeEditAniSearchEnrichment(
      42,
      {
        anisearch_id: '12345',
        draft: { title: 'Lookup Title', source: 'anisearch:12345' },
        protected_fields: ['title'],
      },
      'token',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/anime/42/enrichment/anisearch'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          anisearch_id: '12345',
          draft: { title: 'Lookup Title', source: 'anisearch:12345' },
          protected_fields: ['title'],
        }),
      }),
    )
  })

  it('returns the existing edit AniSearch draft payload unchanged on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          data: {
            mode: 'draft',
            anisearch_id: '12345',
            source: 'anisearch:12345',
            draft: {
              title: 'AniSearch Title',
              source: 'anisearch:12345',
              folder_name: 'serial-experiments-lain',
            },
            updated_fields: ['title'],
            relations_applied: 1,
            relations_skipped_existing: 2,
            skipped_protected_fields: ['description'],
          },
        }),
      }),
    )

    await expect(
      loadAdminAnimeEditAniSearchEnrichment(
        42,
        {
          anisearch_id: '12345',
          draft: { title: 'Lookup Title', source: 'anisearch:12345' },
        },
        'token',
      ),
    ).resolves.toEqual({
      data: {
        mode: 'draft',
        anisearch_id: '12345',
        source: 'anisearch:12345',
        draft: {
          title: 'AniSearch Title',
          source: 'anisearch:12345',
          folder_name: 'serial-experiments-lain',
        },
        updated_fields: ['title'],
        relations_applied: 1,
        relations_skipped_existing: 2,
        skipped_protected_fields: ['description'],
      },
    })
  })

  it('preserves redirect metadata for edit AniSearch duplicate conflicts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          data: {
            mode: 'conflict',
            anisearch_id: '12345',
            existing_anime_id: 84,
            existing_title: 'Serial Experiments Lain',
            redirect_path: '/admin/anime/84/edit',
          },
          error: {
            message: 'AniSearch Quelle ist bereits verknuepft.',
            code: 'anisearch_source_conflict',
          },
        }),
      }),
    )

    await expect(
      loadAdminAnimeEditAniSearchEnrichment(
        42,
        {
          anisearch_id: '12345',
          draft: { title: 'Lookup Title' },
          protected_fields: ['title'],
        },
        'token',
      ),
    ).rejects.toMatchObject<ApiError>({
      status: 409,
      message: 'AniSearch Quelle ist bereits verknuepft.',
      code: 'anisearch_source_conflict',
      conflict: {
        mode: 'conflict',
        anisearch_id: '12345',
        existing_anime_id: 84,
        existing_title: 'Serial Experiments Lain',
        redirect_path: '/admin/anime/84/edit',
      },
    })
  })

  it('preserves create AniSearch warning metadata on successful create responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({
          data: {
            id: 42,
            title: 'Lain',
            type: 'tv',
            content_type: 'anime',
            status: 'ongoing',
          },
          anisearch: {
            source: 'anisearch:12345',
            relation_candidates: 3,
            relation_applied: 1,
            warning: '2 AniSearch-Relationen konnten nicht lokal zugeordnet werden.',
          },
        }),
      }),
    )

    const response = await createAdminAnime({
      title: 'Lain',
      type: 'tv',
      content_type: 'anime',
      status: 'ongoing',
      source: 'anisearch:12345',
      cover_image: 'lain.jpg',
    })

    expect(response.anisearch?.warning).toContain('AniSearch-Relationen')
    expect(response.anisearch?.source).toBe('anisearch:12345')
  })
})
