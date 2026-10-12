'use client'

import { useState } from 'react'

import { Team4sCropper } from '@/components/media/crop/Team4sCropper'
import type { AdminAnimeAssetKind } from '@/types/admin'

import {
  isAnimeCroppableAssetKind,
  resolveAnimeAssetCropConfig,
  type AnimeCroppableAssetKind,
} from '../utils/animeAssetCropConfig'

interface AnimeAssetCropState {
  kind: AnimeCroppableAssetKind
  file: File
}

interface UseAnimeAssetCropGateOptions {
  /** The EXISTING upload/staging callback (create: dispatch to handleCoverUpload/
   * handleSingleAssetFileSelected/...; edit: planAnimeAssetFileSelection + uploadAndLinkAsset).
   * Called unchanged for kinds without a crop step; called with exactly the cropped file for
   * cover/banner once the user confirms "Ausschnitt übernehmen". */
  onFilesReady: (kind: AdminAnimeAssetKind, files: File[]) => void | Promise<void>
}

const ANIME_ASSET_CROP_LABELS: Record<AnimeCroppableAssetKind, { title: string; cropAriaLabel: string }> = {
  cover: { title: 'Cover zuschneiden', cropAriaLabel: 'Cover-Ausschnitt wählen' },
  banner: { title: 'Banner zuschneiden', cropAriaLabel: 'Banner-Ausschnitt wählen' },
}

function cropOutputFilename(kind: AnimeCroppableAssetKind, sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, '').trim() || kind
  return `${baseName}-${kind}.jpg`
}

/**
 * Shared Zuschnitt-Gate zwischen der Anime-Asset-Auswahl (Cover/Banner/Logo/Background/
 * Background-Video) und dem bestehenden Upload/Staging-Pfad, wiederverwendet von Anlegen und
 * Bearbeiten. Fängt nur Cover/Banner ab und öffnet Team4sCropper; alle anderen Asset-Arten
 * laufen unverändert direkt durch (D-Entscheidung 2026-10-12: Logo/Background/Background-Video
 * bekommen keinen Zuschnitt-Schritt).
 */
export function useAnimeAssetCropGate({ onFilesReady }: UseAnimeAssetCropGateOptions) {
  const [cropState, setCropState] = useState<AnimeAssetCropState | null>(null)

  function handleFilesSelected(kind: AdminAnimeAssetKind, files: File[]) {
    if (files.length === 0) return
    if (!isAnimeCroppableAssetKind(kind)) {
      void onFilesReady(kind, files)
      return
    }
    setCropState({ kind, file: files[0] })
  }

  function openCropForExistingFile(kind: AnimeCroppableAssetKind, file: File) {
    setCropState({ kind, file })
  }

  function closeCropDialog() {
    setCropState(null)
  }

  const activeConfig = cropState ? resolveAnimeAssetCropConfig(cropState.kind) : null

  const cropDialog = cropState && activeConfig ? (
    <Team4sCropper
      file={cropState.file}
      title={ANIME_ASSET_CROP_LABELS[cropState.kind].title}
      cropAriaLabel={ANIME_ASSET_CROP_LABELS[cropState.kind].cropAriaLabel}
      shape="rectangle"
      aspectRatio={activeConfig.aspectRatio}
      output={{
        width: activeConfig.outputWidth,
        height: activeConfig.outputHeight,
        mimeType: 'image/jpeg',
        filename: cropOutputFilename(cropState.kind, cropState.file.name),
      }}
      hint="Bild ziehen oder zoomen. Escape schließt den Dialog."
      onCancel={closeCropDialog}
      onApply={async (croppedFile) => {
        const kind = cropState.kind
        setCropState(null)
        await onFilesReady(kind, [croppedFile])
      }}
    />
  ) : null

  return { handleFilesSelected, openCropForExistingFile, cropDialog, isCropOpen: cropState !== null }
}
