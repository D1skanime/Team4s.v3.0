'use client'

import { useState } from 'react'

import type { AdminAnimeAssetKind, AdminAnimePersistedAssets } from '@/types/admin'

import type { AnimeCroppableAssetKind } from '../utils/animeAssetCropConfig'
import { resolveAnimeAssetCropSource } from '../utils/animeAssetCropSource'
import { formatAdminError } from '../utils/studio-helpers'
import { useAnimeAssetCropGate } from './useAnimeAssetCropGate'

interface UseAnimeEditAssetCropFlowOptions {
  persistedAssets: AdminAnimePersistedAssets
  onAssetFilesSelected: (kind: AdminAnimeAssetKind, files: File[]) => void | Promise<void>
  onError: (message: string) => void
}

/**
 * Edit-Ergänzung von useAnimeAssetCropGate: ein persistiertes Cover/Banner kann sowohl ein echter
 * Upload (same-origin /media/...) als auch der Jellyfin-Bild-Proxy (/api/v1/media/image?...) aus
 * "Jellyfin-Metadaten anwenden" sein -- letzterer lädt das Bild NIE auf den eigenen Server
 * herunter, bleibt aber ein backend-relativer Pfad. Beide müssen daher mit einem einfachen,
 * SAME-ORIGIN fetch() über die bestehende Next.js-Proxy-Infrastruktur geladen werden, NIEMALS
 * über apiClientFetch (das die URL im Browser zur absoluten Backend-Origin aufloest -- das scheitert
 * dort am CORS, siehe Live-UAT-Korrektur 2026-10-12: "Failed to fetch" trotz funktionierendem
 * <img src> auf dieselbe URL). resolveAnimeAssetCropSource entscheidet das als reine Funktion;
 * eine absolute/externe URL blendet den Zuschnitt-Button defensiv aus statt einen kaputten
 * Button zu zeigen.
 */
export function useAnimeEditAssetCropFlow({ persistedAssets, onAssetFilesSelected, onError }: UseAnimeEditAssetCropFlowOptions) {
  const [isFetchingCropSource, setIsFetchingCropSource] = useState(false)
  const cropGate = useAnimeAssetCropGate({ onFilesReady: onAssetFilesSelected })

  function canOpenAssetCrop(kind: AnimeCroppableAssetKind): boolean {
    return resolveAnimeAssetCropSource(persistedAssets[kind]?.url).fetchable
  }

  async function openAssetCrop(kind: AnimeCroppableAssetKind) {
    const resolved = resolveAnimeAssetCropSource(persistedAssets[kind]?.url)
    if (!resolved.fetchable || isFetchingCropSource) return

    setIsFetchingCropSource(true)
    try {
      const response = await fetch(resolved.url)
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
