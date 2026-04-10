import { describe, expect, it } from 'vitest'

import {
  resolveCreateAniSearchDraftMergeInputs,
  resolveJellyfinPreviewBaseDraft,
} from './createPageHelpers'
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
})
