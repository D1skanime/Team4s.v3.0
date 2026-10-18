'use client'

import {
  deleteAdminAnimeBackgroundAsset,
  deleteAdminAnimeBackgroundVideoAsset,
  deleteAdminAnimeBannerAsset,
  deleteAdminAnimeCoverAsset,
  deleteAdminAnimeLogoAsset,
} from '@/lib/api'

import { formatAdminError } from '../utils/studio-helpers'

// Schmale Teilmenge von useAnimePatch's Rückgabewert -- nur die beiden Methoden, die das Entfernen
// des Cover-Assets tatsächlich braucht (analog useAnimeEditAssetSearch's AnimeEditAssetSearchPatch).
interface AnimeEditAssetRemovalPatch {
  setClearFlag: (field: 'coverImage', value: boolean) => void
  setField: (field: 'coverImage', value: string) => void
}

interface UseAnimeEditAssetRemovalOptions {
  patch: AnimeEditAssetRemovalPatch
  animeID: number
  onError: (message: string) => void
  refreshAssetContext: () => Promise<void>
}

/**
 * Task 2 (quick-261018-l5r), reiner Umbau ohne Verhaltensänderung: extrahiert die beiden
 * "Asset entfernen"-Handler aus AnimeEditWorkspace.tsx (CLAUDE.md 450-Zeilen-Regel).
 */
export function useAnimeEditAssetRemoval({ patch, animeID, onError, refreshAssetContext }: UseAnimeEditAssetRemovalOptions) {
  async function handleRemoveSingularAsset(kind: 'cover' | 'banner' | 'logo' | 'background_video') {
    try {
      switch (kind) {
        case 'cover':
          await deleteAdminAnimeCoverAsset(animeID)
          patch.setClearFlag('coverImage', true)
          patch.setField('coverImage', '')
          break
        case 'banner':
          await deleteAdminAnimeBannerAsset(animeID)
          break
        case 'logo':
          await deleteAdminAnimeLogoAsset(animeID)
          break
        case 'background_video':
          await deleteAdminAnimeBackgroundVideoAsset(animeID)
          break
      }
      await refreshAssetContext()
    } catch (error) {
      onError(formatAdminError(error, 'Asset konnte nicht entfernt werden.'))
    }
  }

  async function handleRemoveBackground(backgroundID: number) {
    try {
      await deleteAdminAnimeBackgroundAsset(animeID, backgroundID)
      await refreshAssetContext()
    } catch (error) {
      onError(formatAdminError(error, 'Background konnte nicht entfernt werden.'))
    }
  }

  return { handleRemoveSingularAsset, handleRemoveBackground }
}
