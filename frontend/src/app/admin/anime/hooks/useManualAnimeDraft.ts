import { useMemo } from 'react'

import type {
  AdminAnimeCreateDraftAssetSuggestions,
  AdminAnimeCreateDraftPayload,
  AdminAnimeEditorDraftValues,
  AdminAnimeEditorHydratedState,
  AdminAnimeEditorHydrationInput,
  AdminAnimeJellyfinIntakePreviewResult,
  AdminAnimePersistedAssets,
  AdminJellyfinIntakeAssetSlot,
  AdminJellyfinIntakeAssetSlots,
  AnimeType,
} from '@/types/admin'
import type { AnimeStatus, ContentType } from '@/types/anime'

import { splitGenreTokens, splitTagTokens } from '../utils/anime-helpers'
import { resolveJellyfinIntakeAssetUrl } from '../utils/jellyfin-intake-assets'

export type ManualAnimeDraftStateKey = 'empty' | 'incomplete' | 'ready'

export interface ManualAnimeDraftInput {
  title?: string | null
  cover_image?: string | null
  [key: string]: unknown
}

export interface ManualAnimeDraftState {
  key: ManualAnimeDraftStateKey
  canSubmit: boolean
}

export interface ManualAnimeDraftValues extends AdminAnimeEditorDraftValues {}

export interface HydratedJellyfinDraft {
  draft: ManualAnimeDraftValues
  assetSlots: AdminJellyfinIntakeAssetSlots
}

export interface JellyfinDraftAssetTarget {
  kind: 'cover' | 'logo' | 'banner' | 'background' | 'background_video'
  index?: number
}

export function buildManualCreateDraftSnapshot(
  values: ManualAnimeDraftValues,
): ManualAnimeDraftValues {
  return {
    ...values,
    genreTokens: [...(values.genreTokens || [])],
    tagTokens: [...(values.tagTokens || [])],
  }
}

function cloneAssetSlot(slot: AdminJellyfinIntakeAssetSlot): AdminJellyfinIntakeAssetSlot {
  return {
    ...slot,
  }
}

export function cloneJellyfinAssetSlots(assetSlots: AdminJellyfinIntakeAssetSlots): AdminJellyfinIntakeAssetSlots {
  return {
    cover: cloneAssetSlot(assetSlots.cover),
    logo: cloneAssetSlot(assetSlots.logo),
    banner: cloneAssetSlot(assetSlots.banner),
    backgrounds: assetSlots.backgrounds.map((slot) => cloneAssetSlot(slot)),
    background_video: cloneAssetSlot(assetSlots.background_video),
  }
}

export function hydrateManualDraftFromJellyfinPreview(
  draft: ManualAnimeDraftValues,
  preview: AdminAnimeJellyfinIntakePreviewResult,
  options: { mode?: 'replace' | 'fill' } = {},
): HydratedJellyfinDraft {
  const fillOnly = options.mode === 'fill'
  const resolvedTitle = hasMeaningfulValue(preview.folder_name_title_seed)
    ? preview.folder_name_title_seed!.trim()
    : hasMeaningfulValue(preview.jellyfin_series_name)
      ? preview.jellyfin_series_name.trim()
      : ''
  const resolvedYear = Number.isFinite(preview.year) ? String(preview.year) : ''
  const resolvedDescription = preview.description?.trim() || ''
  const resolvedGenreTokens = splitGenreTokens(preview.genre?.trim() || preview.tags.join(', '))
  const resolvedTagTokens = splitTagTokens(preview.tags.join(', '))
  const resolvedType =
    preview.type_hint.suggested_type && preview.type_hint.suggested_type.trim().length > 0
      ? preview.type_hint.suggested_type
      : draft.type
  const resolvedCoverImage =
    preview.asset_slots.cover.present && hasMeaningfulValue(preview.asset_slots.cover.url)
      ? resolveJellyfinIntakeAssetUrl(preview.asset_slots.cover.url)
      : ''

  const hydratedDraft: ManualAnimeDraftValues = {
    ...draft,
    title: fillOnly ? draft.title || resolvedTitle : resolvedTitle || draft.title,
    year: fillOnly ? draft.year || resolvedYear : resolvedYear || draft.year,
    description: fillOnly ? draft.description || resolvedDescription : resolvedDescription || draft.description,
    genreTokens:
      fillOnly
        ? draft.genreTokens.length > 0
          ? draft.genreTokens
          : resolvedGenreTokens
        : resolvedGenreTokens.length > 0
          ? resolvedGenreTokens
          : draft.genreTokens,
    tagTokens:
      fillOnly
        ? draft.tagTokens.length > 0
          ? draft.tagTokens
          : resolvedTagTokens
        : resolvedTagTokens.length > 0
          ? resolvedTagTokens
          : draft.tagTokens,
    type: fillOnly && draft.type !== 'tv' ? draft.type : resolvedType,
    coverImage: fillOnly ? draft.coverImage || resolvedCoverImage : resolvedCoverImage || draft.coverImage,
    source:
      fillOnly && draft.source.trim()
        ? draft.source
        : `jellyfin:${preview.jellyfin_series_id.trim()}`,
    folderName:
      fillOnly && draft.folderName.trim()
        ? draft.folderName
        : preview.jellyfin_series_path?.trim() || draft.folderName,
  }

  return {
    draft: hydratedDraft,
    assetSlots: cloneJellyfinAssetSlots(preview.asset_slots),
  }
}

export function hydrateManualDraftFromAniSearchDraft(
  draft: ManualAnimeDraftValues,
  incoming: AdminAnimeCreateDraftPayload,
  protectedFields: string[] = [],
): ManualAnimeDraftValues {
  const resolvedGenreTokens = splitGenreTokens(incoming.genre?.trim() || incoming.tags?.join(', ') || '')
  const resolvedTagTokens = splitTagTokens(incoming.tags?.join(', ') || '')
  const protectedFieldSet = new Set(protectedFields)

  return {
    ...draft,
    title: protectedFieldSet.has('title') ? draft.title : incoming.title?.trim() || draft.title,
    type: incoming.type?.trim() ? incoming.type : draft.type,
    contentType: incoming.content_type?.trim() ? incoming.content_type : draft.contentType,
    status: incoming.status?.trim() ? incoming.status : draft.status,
    year: protectedFieldSet.has('year') ? draft.year : Number.isFinite(incoming.year) ? String(incoming.year) : draft.year,
    maxEpisodes: protectedFieldSet.has('max_episodes')
      ? draft.maxEpisodes
      : Number.isFinite(incoming.max_episodes)
        ? String(incoming.max_episodes)
        : draft.maxEpisodes,
    titleDE: protectedFieldSet.has('title_de') ? draft.titleDE : incoming.title_de?.trim() || draft.titleDE,
    titleEN: protectedFieldSet.has('title_en') ? draft.titleEN : incoming.title_en?.trim() || draft.titleEN,
    genreTokens: protectedFieldSet.has('genre')
      ? draft.genreTokens
      : resolvedGenreTokens.length > 0
        ? resolvedGenreTokens
        : draft.genreTokens,
    tagTokens: resolvedTagTokens.length > 0 ? resolvedTagTokens : draft.tagTokens,
    description: protectedFieldSet.has('description') ? draft.description : incoming.description?.trim() || draft.description,
    coverImage: incoming.cover_image?.trim() || draft.coverImage,
    source: incoming.source?.trim() || draft.source,
    folderName: incoming.folder_name?.trim() || draft.folderName,
  }
}

export function hydrateManualDraftFromExistingAnime(
  input: AdminAnimeEditorHydrationInput,
): AdminAnimeEditorHydratedState {
  const persistedAssets: AdminAnimePersistedAssets = {
    cover: input.persisted_assets?.cover ?? resolvePersistedAssetState(input.cover_image),
    banner: input.persisted_assets?.banner,
    logo: input.persisted_assets?.logo,
    backgrounds: input.persisted_assets?.backgrounds
      ? [...input.persisted_assets.backgrounds]
      : [],
    background_video: input.persisted_assets?.background_video,
  }
  const genreSource =
    Array.isArray(input.genres) && input.genres.length > 0
      ? input.genres.join(', ')
      : input.genre ?? ''

  return {
    values: {
      title: input.title?.trim() || '',
      type: (input.type as AnimeType | undefined) ?? 'tv',
      contentType: input.content_type ?? 'anime',
      status: input.status ?? 'ongoing',
      year: Number.isFinite(input.year) ? String(input.year) : '',
      maxEpisodes: Number.isFinite(input.max_episodes) ? String(input.max_episodes) : '',
      titleDE: input.title_de?.trim() || '',
      titleEN: input.title_en?.trim() || '',
      genreTokens: splitGenreTokens(genreSource),
      tagTokens: Array.isArray(input.tags) ? [...input.tags] : [],
      description: input.description?.trim() || '',
      coverImage: input.cover_image?.trim() || '',
      source: input.source?.trim() || '',
      folderName: input.folder_name?.trim() || '',
    },
    persistedAssets,
  }
}

export function buildDraftAssetSlotsFromSuggestions(
  suggestions?: AdminAnimeCreateDraftAssetSuggestions | null,
): AdminJellyfinIntakeAssetSlots | null {
  if (!suggestions) {
    return null
  }

  const backgrounds: AdminJellyfinIntakeAssetSlot[] = []
  for (const [index, rawUrl] of (suggestions.backgrounds || []).entries()) {
    const resolvedUrl = resolveJellyfinIntakeAssetUrl(rawUrl)
    if (!resolvedUrl) continue
    backgrounds.push({
      present: true,
      kind: 'background',
      source: 'jellyfin',
      index,
      url: resolvedUrl,
    })
  }

  const coverUrl = resolveJellyfinIntakeAssetUrl(suggestions.cover)
  const logoUrl = resolveJellyfinIntakeAssetUrl(suggestions.logo)
  const bannerUrl = resolveJellyfinIntakeAssetUrl(suggestions.banner)
  const backgroundVideoUrl = resolveJellyfinIntakeAssetUrl(suggestions.background_video)

  const hasAnySuggestion =
    Boolean(coverUrl) ||
    Boolean(logoUrl) ||
    Boolean(bannerUrl) ||
    Boolean(backgroundVideoUrl) ||
    backgrounds.length > 0

  if (!hasAnySuggestion) {
    return null
  }

  return {
    cover: {
      present: Boolean(coverUrl),
      kind: 'cover',
      source: 'jellyfin',
      url: coverUrl || undefined,
    },
    logo: {
      present: Boolean(logoUrl),
      kind: 'logo',
      source: 'jellyfin',
      url: logoUrl || undefined,
    },
    banner: {
      present: Boolean(bannerUrl),
      kind: 'banner',
      source: 'jellyfin',
      url: bannerUrl || undefined,
    },
    backgrounds,
    background_video: {
      present: Boolean(backgroundVideoUrl),
      kind: 'background_video',
      source: 'jellyfin',
      url: backgroundVideoUrl || undefined,
    },
  }
}

export function removeJellyfinDraftAsset(
  draft: ManualAnimeDraftValues,
  assetSlots: AdminJellyfinIntakeAssetSlots,
  target: JellyfinDraftAssetTarget,
): HydratedJellyfinDraft {
  const nextDraft: ManualAnimeDraftValues = {
    ...draft,
  }
  const nextAssetSlots = cloneJellyfinAssetSlots(assetSlots)
  let removedSlot: AdminJellyfinIntakeAssetSlot | null = null

  if (target.kind === 'background') {
    const index = Number.isInteger(target.index) ? target.index! : -1
    if (index >= 0 && index < nextAssetSlots.backgrounds.length) {
      removedSlot = nextAssetSlots.backgrounds[index]
      nextAssetSlots.backgrounds = nextAssetSlots.backgrounds.filter((_, candidateIndex) => candidateIndex !== index)
    }
  } else {
    removedSlot = nextAssetSlots[target.kind]
    nextAssetSlots[target.kind] = {
      ...removedSlot,
      present: false,
      url: undefined,
    }
  }

  if (
    target.kind === 'cover' &&
    removedSlot?.url?.trim() &&
    nextDraft.coverImage.trim() === removedSlot.url.trim()
  ) {
    nextDraft.coverImage = ''
  }

  return {
    draft: nextDraft,
    assetSlots: nextAssetSlots,
  }
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => hasMeaningfulValue(entry))
  }

  return false
}

function resolvePersistedAssetState(url?: string | null) {
  const trimmed = url?.trim()
  if (!trimmed) {
    return undefined
  }

  return {
    url: trimmed,
    ownership: 'manual' as const,
  }
}

export function resolveManualCreateState(input: ManualAnimeDraftInput): ManualAnimeDraftState {
  const hasMeaningfulInput = Object.values(input).some((value) => hasMeaningfulValue(value))
  const hasRequiredTitle = hasMeaningfulValue(input.title)
  const hasRequiredCover = hasMeaningfulValue(input.cover_image)

  if (!hasMeaningfulInput) {
    return {
      key: 'empty',
      canSubmit: false,
    }
  }

  if (!hasRequiredTitle || !hasRequiredCover) {
    return {
      key: 'incomplete',
      canSubmit: false,
    }
  }

  return {
    key: 'ready',
    canSubmit: true,
  }
}

export function useManualAnimeDraft(input: ManualAnimeDraftInput): ManualAnimeDraftState {
  return useMemo(() => resolveManualCreateState(input), [input])
}
