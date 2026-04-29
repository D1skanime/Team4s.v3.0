import { describe, expect, it } from 'vitest'

import {
  appendCreateSourceLinkageToPayload,
  resolveCreateAniSearchDraftMergeInputs,
  resolveJellyfinPreviewBaseDraft,
} from './createPageHelpers'
import { deriveJellyfinIntakeSearchState } from '../hooks/useJellyfinIntake'
import {
  applyCreateAniSearchControllerResult,
  buildCreateAniSearchConflictState,
} from './createAniSearchControllerHelpers'
import {
  resolveAniSearchCandidateSearchFeedback,
  resolveCreateCoverState,
} from './useAdminAnimeCreateController'
import { hydrateManualDraftFromAniSearchDraft, hydrateManualDraftFromJellyfinPreview } from '../hooks/useManualAnimeDraft'

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

  it('explains when AniSearch hits were hidden because they already exist locally', () => {
    expect(
      resolveAniSearchCandidateSearchFeedback({
        data: [],
        filtered_existing_count: 2,
      }),
    ).toEqual({
      candidates: [],
      errorMessage:
        'Alle 2 gefundenen AniSearch-Treffer sind bereits als Anime erfasst und wurden ausgeblendet.',
      filteredExistingCount: 2,
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

    expect(resolved).toEqual({
      hasCover: true,
      payloadCoverImage: 'http://localhost:8092/api/admin/jellyfin/assets/cover/series-42',
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
