import type { AdminAnimeAssetKind, AdminAnimeUploadAssetType } from '@/types/admin'

export type EditUploadTarget = Exclude<AdminAnimeAssetKind, 'cover'>

interface EditUploadTargetConfig {
  assetType: AdminAnimeUploadAssetType
  buttonLabel: string
  removeLabel: string
  helperText: string
  successMessage: string
  errorMessage: string
}

export const EDIT_UPLOAD_TARGETS: Record<EditUploadTarget, EditUploadTargetConfig> = {
  banner: {
    assetType: 'banner',
    buttonLabel: 'Banner hochladen',
    removeLabel: 'Banner entfernen',
    helperText: 'Banner bleibt ein singularer Slot und wird nach dem Upload sofort ersetzt.',
    successMessage: 'Banner wurde hochgeladen und als manuelles Asset gesetzt.',
    errorMessage: 'Banner Upload fehlgeschlagen.',
  },
  logo: {
    assetType: 'logo',
    buttonLabel: 'Logo hochladen',
    removeLabel: 'Logo entfernen',
    helperText: 'Logo bleibt ein singularer Slot und wird nach dem Upload sofort ersetzt.',
    successMessage: 'Logo wurde hochgeladen und als manuelles Asset gesetzt.',
    errorMessage: 'Logo Upload fehlgeschlagen.',
  },
  background: {
    assetType: 'background',
    buttonLabel: 'Background hochladen',
    removeLabel: 'Background entfernen',
    helperText: 'Backgrounds bleiben additive Assets und werden nach dem Upload an die Galerie angehaengt.',
    successMessage: 'Background wurde hochgeladen und als manuelles Asset hinzugefuegt.',
    errorMessage: 'Background Upload fehlgeschlagen.',
  },
  background_video: {
    assetType: 'background_video',
    buttonLabel: 'Background-Video hochladen',
    removeLabel: 'Background-Video entfernen',
    helperText: 'Background-Video bleibt ein singularer Slot und wird nach dem Upload sofort ersetzt.',
    successMessage: 'Background-Video wurde hochgeladen und als manuelles Asset gesetzt.',
    errorMessage: 'Background-Video Upload fehlgeschlagen.',
  },
}

export function getEditUploadStatusLabel(uploadTarget: EditUploadTarget | null, isApplying: boolean): string | null {
  if (isApplying) {
    return 'Provider-Metadaten werden auf persistierte Anime-Assets angewendet.'
  }

  if (!uploadTarget) {
    return null
  }

  return EDIT_UPLOAD_TARGETS[uploadTarget].helperText
}
