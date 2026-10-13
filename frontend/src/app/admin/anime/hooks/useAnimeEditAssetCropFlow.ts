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
  // Scoped to WHICH kind is being fetched, not a single shared boolean (code-review finding
  // 2026-10-13): folding one global busy flag into the whole asset section's isBusy prop disabled
  // every kind's search/crop/remove buttons and upload slots while only Cover OR Banner's source
  // was actually being fetched.
  const [fetchingCropSourceKind, setFetchingCropSourceKind] = useState<AnimeCroppableAssetKind | null>(null)
  const cropGate = useAnimeAssetCropGate({ onFilesReady: onAssetFilesSelected })

  function canOpenAssetCrop(kind: AnimeCroppableAssetKind): boolean {
    return resolveAnimeAssetCropSource(persistedAssets[kind]?.url, getBrowserApiBaseUrl()).fetchable
  }

  function isFetchingCropSourceFor(kind: AnimeCroppableAssetKind): boolean {
    return fetchingCropSourceKind === kind
  }

  async function openAssetCrop(kind: AnimeCroppableAssetKind) {
    const resolved = resolveAnimeAssetCropSource(persistedAssets[kind]?.url, getBrowserApiBaseUrl())
    if (!resolved.fetchable || fetchingCropSourceKind !== null) return

    setFetchingCropSourceKind(kind)
    try {
      const candidateUrls = [...deriveOriginalCropCandidates(resolved.url), resolved.url]
      const blob = await fetchFirstAvailableImage(candidateUrls)
      const file = new File([blob], `${kind}-source.jpg`, { type: blob.type || 'image/jpeg' })
      cropGate.openCropForExistingFile(kind, file)
    } catch (error) {
      onError(formatAdminError(error, 'Bild konnte nicht zum Zuschneiden geladen werden.'))
    } finally {
      setFetchingCropSourceKind(null)
    }
  }

  return {
    handleAssetFilesSelected: cropGate.handleFilesSelected,
    canOpenAssetCrop,
    openAssetCrop,
    cropDialog: cropGate.cropDialog,
    isFetchingCropSourceFor,
  }
}
