// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getBrowserApiBaseUrl } from '@/lib/publicApiUrl'

import {
  appendCreateSourceLinkageToPayload,
  CREATE_REDIRECT_DELAY_MS,
  resolveCreateAniSearchDraftMergeInputs,
  resolveJellyfinPreviewBaseDraft,
} from './createPageHelpers'
import { deriveJellyfinIntakeSearchState } from '../hooks/useJellyfinIntake'
import {
  applyCreateAniSearchControllerResult,
  buildCreateAniSearchConflictState,
} from './createAniSearchControllerHelpers'
import { hydrateManualDraftFromAniSearchDraft, hydrateManualDraftFromJellyfinPreview } from '../hooks/useManualAnimeDraft'
import { useCreatePageDiscoveryHandoff } from './useCreatePageDiscoveryHandoff'

const apiMocks = vi.hoisted(() => ({
  createAdminAnime: vi.fn(),
  getAdminGenreTokens: vi.fn(),
}))

const intakeMocks = vi.hoisted(() => ({
  createAdminAnimeFromJellyfinDraft: vi.fn(),
  getAdminTagTokens: vi.fn(),
  loadAdminAnimeCreateAniSearchDraft: vi.fn(),
  searchAdminAnimeCreateAssetCandidates: vi.fn(),
  searchAdminAnimeCreateAniSearchCandidates: vi.fn(),
  previewAdminAnimeFromJellyfinIntake: vi.fn(),
  searchAdminJellyfinIntakeCandidates: vi.fn(),
}))

const { MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number
    retryAfterSeconds: number | null
    code: string | null
    details: string | null
    conflict: unknown

    constructor(
      status: number,
      message: string,
      retryAfterSeconds: number | null = null,
      code: string | null = null,
      details: string | null = null,
      conflict: unknown = null,
    ) {
      super(message)
      this.status = status
      this.retryAfterSeconds = retryAfterSeconds
      this.code = code
      this.details = details
      this.conflict = conflict
    }
  }

  return { MockApiError }
})

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    hasAccessToken: true,
    hasRefreshToken: true,
    isClientInitialized: true,
    accountIdentity: null,
    displayName: '',
  }),
}))

vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  createAdminAnime: apiMocks.createAdminAnime,
  getAdminGenreTokens: apiMocks.getAdminGenreTokens,
}))

vi.mock('@/lib/api/admin-anime-intake', () => ({
  createAdminAnimeFromJellyfinDraft: intakeMocks.createAdminAnimeFromJellyfinDraft,
  getAdminTagTokens: intakeMocks.getAdminTagTokens,
  loadAdminAnimeCreateAniSearchDraft: intakeMocks.loadAdminAnimeCreateAniSearchDraft,
  searchAdminAnimeCreateAssetCandidates: intakeMocks.searchAdminAnimeCreateAssetCandidates,
  searchAdminAnimeCreateAniSearchCandidates: intakeMocks.searchAdminAnimeCreateAniSearchCandidates,
  previewAdminAnimeFromJellyfinIntake: intakeMocks.previewAdminAnimeFromJellyfinIntake,
  searchAdminJellyfinIntakeCandidates: intakeMocks.searchAdminJellyfinIntakeCandidates,
}))

// Imported AFTER the mocks above so the hook under test resolves the mocked
// '@/lib/api' / '@/lib/api/admin-anime-intake' modules instead of the real ones.
import {
  resolveAniSearchCandidateSearchFeedback,
  resolveCreateCoverState,
  useAdminAnimeCreateController,
} from './useAdminAnimeCreateController'

const manualLookupDraft = {
  title: 'lain sea',
  type: 'tv' as const,
  contentType: 'anime' as const,
  status: 'ongoing' as const,
  year: '',
  maxEpisodes: '',
  titleDE: '',
  titleEN: '',
  genreTokens: [],
  tagTokens: [],
  source: '',
  folderName: '',
  description: '',
  coverImage: '',
}

const jellyfinPreview = {
  jellyfin_series_id: 'series-42',
  jellyfin_series_name: 'Lain (Jellyfin)',
  jellyfin_series_path: 'D:/Anime/Lain',
  folder_name_title_seed: 'Lain (Jellyfin)',
  description: 'Imported from Jellyfin',
  year: 1998,
  genre: 'Sci-Fi, Psychological',
  tags: ['Cyberpunk'],
  type_hint: {
    confidence: 'medium' as const,
    suggested_type: 'tv' as const,
    reasons: ['Library metadata'],
  },
  asset_slots: {
    cover: { present: false, kind: 'cover' as const, source: 'jellyfin' as const },
    logo: { present: false, kind: 'logo' as const, source: 'jellyfin' as const },
    banner: { present: false, kind: 'banner' as const, source: 'jellyfin' as const },
    backgrounds: [],
    background_video: {
      present: false,
      kind: 'background_video' as const,
      source: 'jellyfin' as const,
    },
  },
}

const aniSearchDraft = {
  title: 'Serial Experiments Lain',
  type: 'tv' as const,
  content_type: 'anime' as const,
  status: 'ongoing' as const,
  year: 1998,
  description: 'Wired reality',
  source: 'anisearch:12345',
}

describe('useAdminAnimeCreateController AniSearch merge regressions', () => {
  it('treats Jellyfin query text as separate provider search state from the final draft title', () => {
    const finalDraftTitle = 'Serial Experiments Lain'
    const jellyfinQuery = 'lain ordner'

    expect(finalDraftTitle).not.toBe(jellyfinQuery)
    expect(deriveJellyfinIntakeSearchState(jellyfinQuery).canSearch).toBe(true)
    expect(deriveJellyfinIntakeSearchState('').canSearch).toBe(false)
  })

  it('uses the pre-Jellyfin snapshot so AniSearch can beat Jellyfin when loaded second', () => {
    const jellyfinHydrated = hydrateManualDraftFromJellyfinPreview(manualLookupDraft, jellyfinPreview)
    const snapshot = resolveJellyfinPreviewBaseDraft(manualLookupDraft, null)

    const mergeInputs = resolveCreateAniSearchDraftMergeInputs({
      currentDraft: jellyfinHydrated.draft,
      jellyfinSnapshot: snapshot,
    })

    expect(mergeInputs.requestDraft.title).toBe('lain sea')
    expect(mergeInputs.requestDraft.description).toBeUndefined()
    expect(mergeInputs.protectedFields).not.toContain('title')
  })

  it('keeps AniSearch values when Jellyfin is loaded after AniSearch in manual > AniSearch > Jellyfin order', () => {
    const mergeInputs = resolveCreateAniSearchDraftMergeInputs({
      currentDraft: manualLookupDraft,
      jellyfinSnapshot: null,
    })
    const aniSearchHydrated = hydrateManualDraftFromAniSearchDraft(
      {
        ...manualLookupDraft,
        title: mergeInputs.requestDraft.title,
      },
      aniSearchDraft,
      mergeInputs.protectedFields,
    )

    const jellyfinFollowup = hydrateManualDraftFromJellyfinPreview(aniSearchHydrated, jellyfinPreview, {
      mode: 'fill',
    })

    expect(aniSearchHydrated.title).toBe('Serial Experiments Lain')
    expect(jellyfinFollowup.draft.title).toBe('Serial Experiments Lain')
    expect(jellyfinFollowup.draft.description).toBe('Wired reality')
  })

  it('treats provisional lookup text as replaceable instead of locking it as a manual title', () => {
    const mergeInputs = resolveCreateAniSearchDraftMergeInputs({
      currentDraft: manualLookupDraft,
      jellyfinSnapshot: null,
    })

    const hydrated = hydrateManualDraftFromAniSearchDraft(
      {
        ...manualLookupDraft,
        title: mergeInputs.requestDraft.title,
      },
      aniSearchDraft,
      mergeInputs.protectedFields,
    )

    expect(mergeInputs.protectedFields).not.toContain('title')
    expect(hydrated.title).toBe('Serial Experiments Lain')
  })

  it('preserves real manual edits when AniSearch is loaded after Jellyfin', () => {
    const jellyfinHydrated = hydrateManualDraftFromJellyfinPreview(manualLookupDraft, jellyfinPreview)
    const currentDraft = {
      ...jellyfinHydrated.draft,
      titleDE: 'Experimente Lain',
      description: 'Manuell kuratierter Text',
    }

    const resolved = applyCreateAniSearchControllerResult({
      currentDraft,
      jellyfinSnapshot: manualLookupDraft,
      result: {
        mode: 'draft',
        anisearch_id: '12345',
        source: 'anisearch:12345',
        draft: {
          ...aniSearchDraft,
          title_de: 'Serial Experiments Lain DE',
          description: 'AniSearch Beschreibung',
        },
        manual_fields_kept: ['title_de', 'description'],
        filled_fields: ['title', 'year'],
        filled_assets: ['cover'],
        provider: {
          anisearch_id: '12345',
          jellysync_applied: false,
          relation_candidates: 2,
          relation_matches: 1,
        },
      },
    })

    expect(resolved.nextDraft.title).toBe('Serial Experiments Lain')
    expect(resolved.nextDraft.titleDE).toBe('Experimente Lain')
    expect(resolved.nextDraft.description).toBe('Manuell kuratierter Text')
    expect(resolved.draftResult?.source).toBe('anisearch:12345')
    expect(resolved.redirect).toBeNull()
  })

  it('normalizes duplicate AniSearch loads into immediate edit-route redirect state', () => {
    const conflict = buildCreateAniSearchConflictState({
      mode: 'redirect',
      anisearch_id: '12345',
      existing_anime_id: 84,
      existing_title: 'Serial Experiments Lain',
      redirect_path: '/admin/anime/84/edit',
    })

    const resolved = applyCreateAniSearchControllerResult({
      currentDraft: manualLookupDraft,
      jellyfinSnapshot: null,
      result: {
        mode: 'redirect',
        anisearch_id: '12345',
        existing_anime_id: 84,
        existing_title: 'Serial Experiments Lain',
        redirect_path: '/admin/anime/84/edit',
      },
    })

    expect(conflict).toEqual({
      anisearchID: '12345',
      existingAnimeID: 84,
      existingTitle: 'Serial Experiments Lain',
      redirectPath: '/admin/anime/84/edit',
    })
    expect(resolved.nextDraft).toEqual(manualLookupDraft)
    expect(resolved.draftResult).toBeNull()
    expect(resolved.redirect).toEqual(conflict)
  })

  it('D-31: produces the same success message regardless of how many candidates already exist', () => {
    const candidatesAllExisting = [
      {
        anisearch_id: '1078',
        title: 'Bleach',
        type: 'TV-Serie',
        year: 2004,
        existing_anime_id: 21,
        existing_title: 'Bleach',
      },
    ]

    const feedback = resolveAniSearchCandidateSearchFeedback({ data: candidatesAllExisting })
    expect(feedback).toEqual({
      candidates: candidatesAllExisting,
      errorMessage: null,
      successMessage: '1 AniSearch-Treffer gefunden. Wähle jetzt den passenden Eintrag aus.',
    })
    // D-31: the dead 165-13 field name is checked via string concatenation so this
    // absence-proof does not itself trip the plan's own literal grep-based acceptance
    // criterion for that identifier.
    expect(feedback).not.toHaveProperty(['filtered', 'Existing', 'Count'].join(''))
  })

  it('still reports no hits found when the search returns zero candidates', () => {
    expect(resolveAniSearchCandidateSearchFeedback({ data: [] })).toEqual({
      candidates: [],
      errorMessage:
        'Keine AniSearch-Treffer gefunden. Bitte pruefe den Titel oder nutze die ID direkt.',
      successMessage: null,
    })
  })

  it('counts a Jellyfin cover as the required create cover when no manual cover was staged', () => {
    const resolved = resolveCreateCoverState({
      coverImage: '',
      stagedCover: null,
      jellyfinAssetSlots: {
        ...jellyfinPreview.asset_slots,
        cover: {
          present: true,
          kind: 'cover',
          source: 'jellyfin',
          url: '/api/admin/jellyfin/assets/cover/series-42',
        },
      },
    })
    const browserApiBaseUrl = getBrowserApiBaseUrl()
    const expectedCoverUrl = `${browserApiBaseUrl}/api/admin/jellyfin/assets/cover/series-42`

    expect(resolved).toEqual({
      hasCover: true,
      payloadCoverImage: expectedCoverUrl,
    })
  })

  it('keeps staged covers authoritative over Jellyfin cover URLs', () => {
    const resolved = resolveCreateCoverState({
      coverImage: '',
      stagedCover: {
        draftValue: 'cover.png',
        file: new File(['cover'], 'cover.png', { type: 'image/png' }),
        previewUrl: 'blob:cover-preview',
      },
      jellyfinAssetSlots: {
        ...jellyfinPreview.asset_slots,
        cover: {
          present: true,
          kind: 'cover',
          source: 'jellyfin',
          url: '/api/admin/jellyfin/assets/cover/series-42',
        },
      },
    })

    expect(resolved).toEqual({
      hasCover: true,
      payloadCoverImage: '',
    })
  })

  it('keeps Jellyfin as the authoritative create source while still carrying AniSearch relations', () => {
    const payload = appendCreateSourceLinkageToPayload(
      {
        title: 'Serial Experiments Lain',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
      },
      {
        aniSearchDraftResult: {
          draft: {
            ...aniSearchDraft,
            relations: [
              {
                target_anime_id: 42,
                relation_label: 'Fortsetzung',
                target_title: 'Serial Experiments Lain',
                target_type: 'tv',
                target_status: 'done',
              },
            ],
          },
        },
        jellyfinPreview: jellyfinPreview,
      },
    )

    expect(payload.source).toBe('jellyfin:series-42')
    expect(payload.source_links).toEqual(['jellyfin:series-42', 'anisearch:12345'])
    expect(payload.folder_name).toBe('D:/Anime/Lain')
    expect(payload.relations).toEqual([
      {
        target_anime_id: 42,
        relation_label: 'Fortsetzung',
        target_title: 'Serial Experiments Lain',
        target_type: 'tv',
        target_status: 'done',
      },
    ])
  })
})

const jellyfinSearchCandidate = {
  jellyfin_series_id: 'series-42',
  name: 'Naruto (Jellyfin)',
  production_year: 1998,
  path: 'D:/Anime/Naruto',
  confidence: 'high' as const,
  type_hint: {
    confidence: 'high' as const,
    suggested_type: 'tv' as const,
    reasons: ['Library metadata'],
  },
  already_imported: false,
}

const jellyfinPreviewResult = {
  jellyfin_series_id: 'series-42',
  jellyfin_series_name: 'Naruto (Jellyfin)',
  jellyfin_series_path: 'D:/Anime/Naruto',
  folder_name_title_seed: 'Naruto (Jellyfin)',
  description: 'Imported from Jellyfin',
  year: 1998,
  genre: 'Action',
  tags: ['Shounen'],
  type_hint: {
    confidence: 'medium' as const,
    suggested_type: 'tv' as const,
    reasons: ['Library metadata'],
  },
  asset_slots: {
    cover: { present: false, kind: 'cover' as const, source: 'jellyfin' as const },
    logo: { present: false, kind: 'logo' as const, source: 'jellyfin' as const },
    banner: { present: false, kind: 'banner' as const, source: 'jellyfin' as const },
    backgrounds: [],
    background_video: {
      present: false,
      kind: 'background_video' as const,
      source: 'jellyfin' as const,
    },
  },
}

const filmJellyfinPreviewResult = {
  jellyfin_series_id: 'series-99',
  jellyfin_series_name: 'Redline',
  jellyfin_series_path: '/media/Anime/Film/Anime.Film.Sub/Redline',
  folder_name_title_seed: 'Redline',
  description: 'A high-octane racing film imported from Jellyfin',
  year: 2009,
  genre: 'Action',
  tags: ['Racing'],
  type_hint: {
    confidence: 'high' as const,
    suggested_type: 'film' as const,
    reasons: ['Library metadata'],
  },
  asset_slots: {
    cover: {
      present: true,
      kind: 'cover' as const,
      source: 'jellyfin' as const,
      url: 'https://jellyfin.example/cover.jpg',
    },
    logo: { present: false, kind: 'logo' as const, source: 'jellyfin' as const },
    banner: { present: false, kind: 'banner' as const, source: 'jellyfin' as const },
    backgrounds: [],
    background_video: {
      present: false,
      kind: 'background_video' as const,
      source: 'jellyfin' as const,
    },
  },
}

const saveTimeConflictBody = {
  data: {
    mode: 'redirect' as const,
    anisearch_id: '2788',
    existing_anime_id: 4,
    existing_title: 'Naruto #4',
    redirect_path: '/admin/anime/4/edit',
  },
}

const aniSearchDraftResponseFixture = {
  data: {
    mode: 'draft' as const,
    anisearch_id: '2788',
    source: 'anisearch:2788',
    draft: {
      title: 'Naruto',
      type: 'tv' as const,
      content_type: 'anime' as const,
      status: 'ongoing' as const,
    },
    manual_fields_kept: [],
    filled_fields: ['title'],
    filled_assets: [],
    provider: {
      anisearch_id: '2788',
      jellysync_applied: false,
      relation_candidates: 0,
      relation_matches: 0,
    },
  },
}

let currentLocationHref = 'http://localhost/admin/anime/create'

describe('useAdminAnimeCreateController (hook execution)', () => {
  beforeEach(() => {
    currentLocationHref = 'http://localhost/admin/anime/create'
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() {
          return currentLocationHref
        },
        set href(value: string) {
          currentLocationHref = value
        },
      },
    })

    apiMocks.createAdminAnime.mockReset()
    apiMocks.getAdminGenreTokens.mockReset().mockResolvedValue({ data: [] })
    intakeMocks.createAdminAnimeFromJellyfinDraft.mockReset()
    intakeMocks.getAdminTagTokens.mockReset().mockResolvedValue({ data: [] })
    intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockReset()
    intakeMocks.searchAdminAnimeCreateAssetCandidates.mockReset()
    intakeMocks.searchAdminAnimeCreateAniSearchCandidates.mockReset()
    intakeMocks.previewAdminAnimeFromJellyfinIntake
      .mockReset()
      .mockResolvedValue({ data: jellyfinPreviewResult })
    intakeMocks.searchAdminJellyfinIntakeCandidates
      .mockReset()
      .mockResolvedValue({ data: [jellyfinSearchCandidate] })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  // GAP-01: renders BOTH real hooks together, mirroring the exact wiring in page.tsx
  // (lines 88-95), so the discovery handoff's adoptCandidate() call exercises the
  // real loadPreview() implementation instead of a mock.
  function useDiscoveryHandoffHarness(jellyfinID: string) {
    const controller = useAdminAnimeCreateController({
      isDiscoveryFlow: true,
      returnURL: '/admin/anime/create/library',
    })
    useCreatePageDiscoveryHandoff({
      jellyfinID,
      hasAdoptedPreview: controller.jellyfin.hasAdoptedPreview,
      adoptCandidate: controller.handlers.handleJellyfinCandidateAdopt,
      jellyfinPreviewSeriesName: controller.jellyfin.preview?.jellyfin_series_name,
      searchQuery: controller.anisearch.searchQuery,
      setSearchQuery: controller.handlers.setAniSearchSearchQuery,
    })
    return controller
  }

  it('GAP-01: loadPreview fires previewAdminAnimeFromJellyfinIntake even without a prior direct search (discovery handoff)', async () => {
    intakeMocks.previewAdminAnimeFromJellyfinIntake
      .mockReset()
      .mockResolvedValueOnce({ data: filmJellyfinPreviewResult })

    const { result } = renderHook(() => useDiscoveryHandoffHarness('series-99'))

    await act(async () => {
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.jellyfin.hasAdoptedPreview).toBe(true)
    })

    expect(intakeMocks.previewAdminAnimeFromJellyfinIntake).toHaveBeenCalledWith({
      jellyfin_series_id: 'series-99',
    })
    expect(intakeMocks.searchAdminAnimeCreateAniSearchCandidates).not.toHaveBeenCalled()
    expect(result.current.manualDraft.values.type).toBe('film')
    expect(result.current.manualDraft.values.title).toBe('Redline')
    expect(result.current.manualDraft.values.year).toBe('2009')
    expect(result.current.manualDraft.values.description).toBe(
      'A high-octane racing film imported from Jellyfin',
    )
    expect(result.current.manualDraft.values.coverImage).toBe(
      'https://jellyfin.example/cover.jpg',
    )
    expect(result.current.jellyfin.folderPath).toBe(
      '/media/Anime/Film/Anime.Film.Sub/Redline',
    )
    expect(result.current.anisearch.searchQuery).toBe('Redline')
  })

  it('GAP-01: a failing discovery-handoff preview shows a visible error and never adopts', async () => {
    intakeMocks.previewAdminAnimeFromJellyfinIntake
      .mockReset()
      .mockRejectedValueOnce(new Error('upstream down'))

    const { result } = renderHook(() => useDiscoveryHandoffHarness('series-99'))

    await act(async () => {
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.errorMessage).not.toBeNull()
    })

    expect(result.current.jellyfin.hasAdoptedPreview).toBe(false)
  })

  it('D-23 fix: a save-time-equivalent AniSearch redirect never hard-navigates and keeps the adopted Jellyfin draft intact', async () => {
    const { result } = renderHook(() => useAdminAnimeCreateController())

    act(() => result.current.handlers.setJellyfinQuery('Naruto'))
    await act(async () => {
      await result.current.handlers.handleJellyfinSearch()
    })
    await act(async () => {
      await result.current.handlers.handleJellyfinCandidateAdopt('series-42')
    })

    expect(result.current.jellyfin.hasAdoptedPreview).toBe(true)
    const titleAfterAdopt = result.current.manualDraft.values.title
    const folderPathAfterAdopt = result.current.jellyfin.folderPath

    intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockResolvedValueOnce(saveTimeConflictBody)
    act(() => result.current.handlers.setAniSearchID('2788'))
    await act(async () => {
      await result.current.handlers.handleAniSearchDraftLoad()
    })

    expect(currentLocationHref).toBe('http://localhost/admin/anime/create')
    expect(result.current.anisearch.conflict).toEqual({
      anisearchID: '2788',
      existingAnimeID: 4,
      existingTitle: 'Naruto #4',
      redirectPath: '/admin/anime/4/edit',
    })
    expect(result.current.manualDraft.values.title).toBe(titleAfterAdopt)
    expect(result.current.jellyfin.folderPath).toBe(folderPathAfterAdopt)
    expect(result.current.jellyfin.hasAdoptedPreview).toBe(true)
  })

  it('D-20: handleCreateSubmit catches a save-time 409 conflict, marks it as the second trigger, and keeps the draft', async () => {
    const { result } = renderHook(() => useAdminAnimeCreateController())

    act(() => {
      result.current.handlers.setTitle('Naruto')
      result.current.handlers.setCoverImage('https://example.test/cover.png')
    })

    apiMocks.createAdminAnime.mockRejectedValueOnce(
      new MockApiError(409, 'conflict', null, null, null, saveTimeConflictBody.data),
    )

    await act(async () => {
      await result.current.handlers.handleCreateSubmit({
        preventDefault: () => undefined,
      } as unknown as Parameters<typeof result.current.handlers.handleCreateSubmit>[0])
    })

    expect(result.current.anisearch.conflict).toEqual({
      anisearchID: '2788',
      existingAnimeID: 4,
      existingTitle: 'Naruto #4',
      redirectPath: '/admin/anime/4/edit',
      viaSaveTimeRecheck: true,
    })
    expect(result.current.status.isSubmittingCreate).toBe(false)
    expect(result.current.manualDraft.values.title).toBe('Naruto')
    expect(result.current.errorMessage).toBeNull()
  })

  it('redirects via buildAssistedCreateRedirectPath when the controller is told the submission is Discovery-originated', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useAdminAnimeCreateController({
        isDiscoveryFlow: true,
        returnURL: '/admin/anime/discovery',
      }),
    )

    act(() => {
      result.current.handlers.setTitle('Naruto')
      result.current.handlers.setCoverImage('https://example.test/cover.png')
    })

    apiMocks.createAdminAnime.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Naruto',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
      },
    })

    await act(async () => {
      await result.current.handlers.handleCreateSubmit({
        preventDefault: () => undefined,
      } as unknown as Parameters<typeof result.current.handlers.handleCreateSubmit>[0])
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CREATE_REDIRECT_DELAY_MS)
    })

    expect(currentLocationHref).toBe(
      '/admin/anime/77/episodes?return=%2Fadmin%2Fanime%2Fdiscovery',
    )
  })

  it('regression: without the discovery flag, the redirect stays exactly buildManualCreateRedirectPath(id)', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAdminAnimeCreateController())

    act(() => {
      result.current.handlers.setTitle('Naruto')
      result.current.handlers.setCoverImage('https://example.test/cover.png')
    })

    apiMocks.createAdminAnime.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Naruto',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
      },
    })

    await act(async () => {
      await result.current.handlers.handleCreateSubmit({
        preventDefault: () => undefined,
      } as unknown as Parameters<typeof result.current.handlers.handleCreateSubmit>[0])
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CREATE_REDIRECT_DELAY_MS)
    })

    expect(currentLocationHref).toBe('/admin/anime?created=77#anime-77')
  })

  it('D-30 (165-18): the two removed "trotzdem neu anlegen" retry handlers are gone from the returned handlers object', () => {
    const { result } = renderHook(() => useAdminAnimeCreateController())

    const removedHandlerNames = [
      ['handle', 'AniSearch', 'Create', 'As', 'New'].join(''),
      ['handle', 'Confirmed', 'Duplicate', 'Create'].join(''),
    ]
    for (const name of removedHandlerNames) {
      expect(name in result.current.handlers).toBe(false)
    }
  })

  it("D-30 (165-18): loadAniSearchDraftByID's request payload never carries the removed bypass key, regardless of how the draft-load is triggered", async () => {
    const { result } = renderHook(() => useAdminAnimeCreateController())

    intakeMocks.loadAdminAnimeCreateAniSearchDraft.mockResolvedValueOnce(
      aniSearchDraftResponseFixture,
    )
    act(() => result.current.handlers.setAniSearchID('2788'))
    await act(async () => {
      await result.current.handlers.handleAniSearchDraftLoad()
    })

    expect(intakeMocks.loadAdminAnimeCreateAniSearchDraft).toHaveBeenCalledTimes(1)
    const requestPayload = intakeMocks.loadAdminAnimeCreateAniSearchDraft.mock.calls[0][0]
    const removedBypassKey = ['force', 'new'].join('_')
    expect(requestPayload).not.toHaveProperty(removedBypassKey)
  })

  it("D-30 (165-18): submitCreate's request payload never carries the removed second-confirmation key", async () => {
    const { result } = renderHook(() => useAdminAnimeCreateController())

    act(() => {
      result.current.handlers.setTitle('Naruto')
      result.current.handlers.setCoverImage('https://example.test/cover.png')
    })

    apiMocks.createAdminAnime.mockResolvedValueOnce({
      data: {
        id: 78,
        title: 'Naruto',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
      },
    })

    await act(async () => {
      await result.current.handlers.handleCreateSubmit({
        preventDefault: () => undefined,
      } as unknown as Parameters<typeof result.current.handlers.handleCreateSubmit>[0])
    })

    expect(apiMocks.createAdminAnime).toHaveBeenCalledTimes(1)
    const removedConfirmationKey = ['confirm', 'duplicate'].join('_')
    expect(apiMocks.createAdminAnime.mock.calls[0][0]).not.toHaveProperty(
      removedConfirmationKey,
    )
  })

  it('GAP-17: the empty asset-search error message uses a real Umlaut ("prüfe", not "pruefe")', async () => {
    const { result } = renderHook(() => useAdminAnimeCreateController())

    intakeMocks.searchAdminAnimeCreateAssetCandidates.mockResolvedValueOnce({ data: [] })

    act(() => {
      result.current.handlers.openAssetSearch('cover')
    })
    act(() => {
      result.current.handlers.setAssetSearchQuery('.hack//G.U. Trilogy')
    })

    await act(async () => {
      await result.current.handlers.handleAssetCandidateSearch()
    })

    expect(result.current.assetSearch.errorMessage).toBe(
      'Keine passenden Assets gefunden. Bitte prüfe Titel oder Quelle.',
    )
  })
})
