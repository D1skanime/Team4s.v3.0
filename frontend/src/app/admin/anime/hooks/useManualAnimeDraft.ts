import { useMemo } from 'react'

import type {
  AdminAnimeCreateDraftAssetSuggestions,
  AdminAnimeCreateDraftPayload,
  AdminAnimeJellyfinIntakePreviewResult,
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

export interface ManualAnimeDraftValues {
  title: string
  type: AnimeType
  contentType: ContentType
  status: AnimeStatus
  year: string
  maxEpisodes: string
  titleDE: string
  titleEN: string
  genreTokens: string[]
  tagTokens: string[]
  description: string
  coverImage: string
}

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
): HydratedJellyfinDraft {
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
    title: resolvedTitle || draft.title,
    year: resolvedYear || draft.year,
    description: resolvedDescription || draft.description,
    genreTokens: resolvedGenreTokens.length > 0 ? resolvedGenreTokens : draft.genreTokens,
    tagTokens: resolvedTagTokens.length > 0 ? resolvedTagTokens : draft.tagTokens,
    type: resolvedType,
    coverImage: resolvedCoverImage || draft.coverImage,
  }

  return {
    draft: hydratedDraft,
    assetSlots: cloneJellyfinAssetSlots(preview.asset_slots),
  }
}

export function hydrateManualDraftFromAniSearchDraft(
  draft: ManualAnimeDraftValues,
  incoming: AdminAnimeCreateDraftPayload,
): ManualAnimeDraftValues {
  const resolvedGenreTokens = splitGenreTokens(incoming.genre?.trim() || incoming.tags?.join(', ') || '')
  const resolvedTagTokens = splitTagTokens(incoming.tags?.join(', ') || '')

  return {
    ...draft,
    title: incoming.title?.trim() || draft.title,
    type: incoming.type?.trim() ? incoming.type : draft.type,
    contentType: incoming.content_type?.trim() ? incoming.content_type : draft.contentType,
    status: incoming.status?.trim() ? incoming.status : draft.status,
    year: Number.isFinite(incoming.year) ? String(incoming.year) : draft.year,
    maxEpisodes: Number.isFinite(incoming.max_episodes) ? String(incoming.max_episodes) : draft.maxEpisodes,
    titleDE: incoming.title_de?.trim() || draft.titleDE,
    titleEN: incoming.title_en?.trim() || draft.titleEN,
    genreTokens: resolvedGenreTokens.length > 0 ? resolvedGenreTokens : draft.genreTokens,
    tagTokens: resolvedTagTokens.length > 0 ? resolvedTagTokens : draft.tagTokens,
    description: incoming.description?.trim() || draft.description,
    coverImage: incoming.cover_image?.trim() || draft.coverImage,
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
