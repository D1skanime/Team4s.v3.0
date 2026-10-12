'use client'

import { useState } from 'react'

import { getBrowserApiBaseUrl } from '@/lib/publicApiUrl'
import type { AdminAnimeAssetKind, AdminAnimePersistedAssets } from '@/types/admin'

import type { AnimeCroppableAssetKind } from '../utils/animeAssetCropConfig'
import { deriveOriginalCropCandidates, resolveAnimeAssetCropSource } from '../utils/animeAssetCropSource'
import { formatAdminError } from '../utils/studio-helpers'
import { useAnimeAssetCropGate } from './useAnimeAssetCropGate'

interface UseAnimeEditAssetCropFlowOptions {
  persistedAssets: AdminAnimePersistedAssets
  onAssetFilesSelected: (kind: AdminAnimeAssetKind, files: File[]) => void | Promise<void>
  onError: (message: string) => void
}

async function fetchFirstAvailableImage(urls: string[]): Promise<Blob> {
  let lastError: unknown = null
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.blob()
      lastError = new Error(`(${response.status}) Bild konnte nicht zum Zuschneiden geladen werden.`)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Bild konnte nicht zum Zuschneiden geladen werden.')
}

/**
 * Edit-Ergänzung von useAnimeAssetCropGate: ein persistiertes Cover/Banner kann sowohl ein echter
 * Upload (same-origin /media/...) als auch der Jellyfin-Bild-Proxy (/api/v1/media/image?...) aus
 * "Jellyfin-Metadaten anwenden" sein -- letzterer lädt das Bild NIE auf den eigenen Server
 * herunter, bleibt aber ein backend-relativer Pfad. Beide müssen daher mit einem einfachen,
 * SAME-ORIGIN fetch() über die bestehende Next.js-Proxy-Infrastruktur geladen werden, NIEMALS
 * über apiClientFetch. Die persistierte URL kommt je nach NEXT_PUBLIC_API_URL-Konfiguration aber
 * oft bereits als ABSOLUTE Backend-Origin-URL an (resolveJellyfinIntakeAssetUrl/
 * resolvePublicApiUrl loesen sie dafuer schon frueher auf) -- ein direkter fetch() dagegen
 * scheitert am CORS (Live-UAT-Korrektur 2026-10-12: "Failed to fetch" trotz funktionierendem
 * <img src> auf dieselbe absolute URL). resolveAnimeAssetCropSource erkennt eine absolute URL mit
 * der bekannten Backend-Origin und fuehrt sie auf den relativen Pfad zurueck; nur eine wirklich
 * fremde Origin blendet den Zuschnitt-Button defensiv aus, statt einen kaputten Button zu zeigen.
 *
 * Fuer einen echten rehosteten Upload wird zuerst das unkomprimierte Original probiert
 * (deriveOriginalCropCandidates) statt der bereits herunterskalierten Display-Variante, mit der
 * Display-Variante als garantiertem Fallback.
 */
export function useAnimeEditAssetCropFlow({ persistedAssets, onAssetFilesSelected, onError }: UseAnimeEditAssetCropFlowOptions) {
  const [isFetchingCropSource, setIsFetchingCropSource] = useState(false)
  const cropGate = useAnimeAssetCropGate({ onFilesReady: onAssetFilesSelected })

  function canOpenAssetCrop(kind: AnimeCroppableAssetKind): boolean {
    return resolveAnimeAssetCropSource(persistedAssets[kind]?.url, getBrowserApiBaseUrl()).fetchable
  }

  async function openAssetCrop(kind: AnimeCroppableAssetKind) {
    const resolved = resolveAnimeAssetCropSource(persistedAssets[kind]?.url, getBrowserApiBaseUrl())
    if (!resolved.fetchable || isFetchingCropSource) return

    setIsFetchingCropSource(true)
    try {
      const candidateUrls = [...deriveOriginalCropCandidates(resolved.url), resolved.url]
      const blob = await fetchFirstAvailableImage(candidateUrls)
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
