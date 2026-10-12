'use client'

import { useState } from 'react'

import { apiClientFetch } from '@/lib/api'
import type { AdminAnimeAssetKind, AdminAnimePersistedAssets } from '@/types/admin'

import type { AnimeCroppableAssetKind } from '../utils/animeAssetCropConfig'
import { resolveJellyfinIntakeAssetUrl } from '../utils/jellyfin-intake-assets'
import { formatAdminError } from '../utils/studio-helpers'
import { useAnimeAssetCropGate } from './useAnimeAssetCropGate'

interface UseAnimeEditAssetCropFlowOptions {
  persistedAssets: AdminAnimePersistedAssets
  onAssetFilesSelected: (kind: AdminAnimeAssetKind, files: File[]) => void | Promise<void>
  onError: (message: string) => void
}

/**
 * Edit-Ergänzung von useAnimeAssetCropGate: ein persistiertes Cover/Banner ist nach dem Upload
 * immer same-origin -- uploadAdminAnimeMedia lädt jede Quelle (auch adoptierte Provider-Treffer)
 * real auf den eigenen Server hoch, `ownership` ist nur eine Herkunfts-Markierung, keine
 * Speicherort-Aussage. Ein normaler apiClientFetch genügt daher für den erneuten Zuschnitt. Ein
 * noch nicht adoptierter Jellyfin-Vorschlag (nur ein Entwurfs-Link, kein echtes Asset) bekommt
 * bewusst KEINEN Zuschnitt-Button -- erst nach "Online suchen" + Übernehmen entsteht ein echtes,
 * zuschneidbares Asset (Live-UAT-Nachtrag 2026-10-12: kein kaputter Button statt defensivem
 * Ausblenden).
 */
export function useAnimeEditAssetCropFlow({ persistedAssets, onAssetFilesSelected, onError }: UseAnimeEditAssetCropFlowOptions) {
  const [isFetchingCropSource, setIsFetchingCropSource] = useState(false)
  const cropGate = useAnimeAssetCropGate({ onFilesReady: onAssetFilesSelected })

  function canOpenAssetCrop(kind: AnimeCroppableAssetKind): boolean {
    return Boolean(persistedAssets[kind]?.url)
  }

  async function openAssetCrop(kind: AnimeCroppableAssetKind) {
    const url = resolveJellyfinIntakeAssetUrl(persistedAssets[kind]?.url)
    if (!url || isFetchingCropSource) return

    setIsFetchingCropSource(true)
    try {
      const response = await apiClientFetch(url)
      if (!response.ok) {
        throw new Error(`(${response.status}) Bild konnte nicht zum Zuschneiden geladen werden.`)
      }
      const blob = await response.blob()
      const file = new File([blob], `${kind}-source.jpg`, { type: blob.type || 'image/jpeg' })
      cropGate.openCropForExistingFile(kind, file)
    } catch (error) {
      onError(formatAdminError(error, 'Bild konnte nicht zum Zuschneiden geladen werden.'))
    } finally {
      setIsFetchingCropSource(false)
    }
  }

  return {
    handleAssetFilesSelected: cropGate.handleFilesSelected,
    canOpenAssetCrop,
    openAssetCrop,
    cropDialog: cropGate.cropDialog,
    isFetchingCropSource,
  }
}
