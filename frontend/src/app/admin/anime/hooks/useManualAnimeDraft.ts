import { useMemo } from 'react'

import type {
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlot,
  AdminJellyfinIntakeAssetSlots,
  AnimeType,
} from '@/types/admin'
import type { AnimeStatus, ContentType } from '@/types/anime'

import { splitGenreTokens } from '../utils/anime-helpers'
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
  const hydratedDraft: ManualAnimeDraftValues = {
    ...draft,
  }

  if (!hasMeaningfulValue(hydratedDraft.title) && hasMeaningfulValue(preview.jellyfin_series_name)) {
    hydratedDraft.title = preview.jellyfin_series_name.trim()
  }

  if (!hasMeaningfulValue(hydratedDraft.year) && Number.isFinite(preview.year)) {
    hydratedDraft.year = String(preview.year)
  }

  if (!hasMeaningfulValue(hydratedDraft.description) && hasMeaningfulValue(preview.description)) {
    hydratedDraft.description = preview.description!.trim()
  }

  if (hydratedDraft.genreTokens.length === 0) {
    const sourceGenre = preview.genre?.trim() || preview.tags.join(', ')
    hydratedDraft.genreTokens = splitGenreTokens(sourceGenre)
  }

  if (
    hydratedDraft.type === 'tv' &&
    preview.type_hint.suggested_type &&
    preview.type_hint.suggested_type !== 'tv'
  ) {
    hydratedDraft.type = preview.type_hint.suggested_type
  }

  if (
    !hasMeaningfulValue(hydratedDraft.coverImage) &&
    preview.asset_slots.cover.present &&
    hasMeaningfulValue(preview.asset_slots.cover.url)
  ) {
    hydratedDraft.coverImage = resolveJellyfinIntakeAssetUrl(preview.asset_slots.cover.url)
  }

  return {
    draft: hydratedDraft,
    assetSlots: cloneJellyfinAssetSlots(preview.asset_slots),
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
