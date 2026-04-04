'use client'

import { useRef, useState } from 'react'

import {
  addAdminAnimeBackgroundAsset,
  assignAdminAnimeBackgroundVideoAsset,
  assignAdminAnimeBannerAsset,
  assignAdminAnimeLogoAsset,
  deleteAdminAnimeBackgroundAsset,
  deleteAdminAnimeBackgroundVideoAsset,
  deleteAdminAnimeBannerAsset,
  deleteAdminAnimeLogoAsset,
  resolveApiUrl,
  uploadAdminAnimeMedia,
} from '@/lib/api'
import type { AdminAnimeJellyfinContext } from '@/types/admin'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'
import { EDIT_UPLOAD_TARGETS, EditUploadTarget, getEditUploadStatusLabel } from './animeJellyfinAssetUpload'

interface AnimeJellyfinAssetUploadControlsProps {
  animeID: number
  authToken: string
  disabled?: boolean
  persistedAssets: AdminAnimeJellyfinContext['persisted_assets']
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onAfterMutation: () => Promise<void>
}

function formatOwnershipLabel(value: 'manual' | 'provider'): string {
  return value === 'manual' ? 'Manuell' : 'Provider'
}

export function AnimeJellyfinAssetUploadControls({
  animeID,
  authToken,
  disabled = false,
  persistedAssets,
  onSuccess,
  onError,
  onAfterMutation,
}: AnimeJellyfinAssetUploadControlsProps) {
  const [isMutatingAssets, setIsMutatingAssets] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<EditUploadTarget | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundVideoInputRef = useRef<HTMLInputElement | null>(null)

  const isBusy = disabled || isMutatingAssets
  const mutationStatusLabel = getEditUploadStatusLabel(uploadTarget, false)

  async function handleManualUpload(target: EditUploadTarget, file: File) {
    setIsMutatingAssets(true)
    setUploadTarget(target)
    setUploadProgress(0)

    try {
      const upload = await uploadAdminAnimeMedia({
        animeID,
        assetType: EDIT_UPLOAD_TARGETS[target].assetType,
        file,
        authToken,
        onProgress: setUploadProgress,
      })

      if (target === 'banner') {
        await assignAdminAnimeBannerAsset(animeID, upload.id, authToken)
      } else if (target === 'logo') {
        await assignAdminAnimeLogoAsset(animeID, upload.id, authToken)
      } else if (target === 'background_video') {
        await assignAdminAnimeBackgroundVideoAsset(animeID, upload.id, authToken)
      } else {
        await addAdminAnimeBackgroundAsset(animeID, upload.id, authToken)
      }

      await onAfterMutation()
      onSuccess(EDIT_UPLOAD_TARGETS[target].successMessage)
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        onError(error.message)
      } else {
        onError(EDIT_UPLOAD_TARGETS[target].errorMessage)
      }
    } finally {
      setIsMutatingAssets(false)
      setUploadTarget(null)
      setUploadProgress(0)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
      if (logoInputRef.current) logoInputRef.current.value = ''
      if (backgroundInputRef.current) backgroundInputRef.current.value = ''
      if (backgroundVideoInputRef.current) backgroundVideoInputRef.current.value = ''
    }
  }

  async function handleRemoveSingularAsset(target: 'banner' | 'logo' | 'background_video') {
    setIsMutatingAssets(true)
    try {
      if (target === 'banner') {
        await deleteAdminAnimeBannerAsset(animeID, authToken)
      } else if (target === 'logo') {
        await deleteAdminAnimeLogoAsset(animeID, authToken)
      } else {
        await deleteAdminAnimeBackgroundVideoAsset(animeID, authToken)
      }

      await onAfterMutation()
      onSuccess(`${EDIT_UPLOAD_TARGETS[target].removeLabel} abgeschlossen.`)
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        onError(error.message)
      } else {
        onError(`${EDIT_UPLOAD_TARGETS[target].removeLabel} fehlgeschlagen.`)
      }
    } finally {
      setIsMutatingAssets(false)
    }
  }

  async function handleRemoveBackground(backgroundID: number) {
    setIsMutatingAssets(true)
    try {
      await deleteAdminAnimeBackgroundAsset(animeID, backgroundID, authToken)
      await onAfterMutation()
      onSuccess('Background wurde entfernt.')
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        onError(error.message)
      } else {
        onError('Background konnte nicht entfernt werden.')
      }
    } finally {
      setIsMutatingAssets(false)
    }
  }

  function triggerUpload(target: EditUploadTarget) {
    if (target === 'banner') {
      bannerInputRef.current?.click()
      return
    }
    if (target === 'logo') {
      logoInputRef.current?.click()
      return
    }
    if (target === 'background_video') {
      backgroundVideoInputRef.current?.click()
      return
    }
    backgroundInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleManualUpload('banner', file)
          }
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleManualUpload('logo', file)
          }
        }}
      />
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleManualUpload('background', file)
          }
        }}
      />
      <input
        ref={backgroundVideoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleManualUpload('background_video', file)
          }
        }}
      />

      <div className={workspaceStyles.sectionGridTwo}>
        <div className={workspaceStyles.assetCard}>
          <div className={workspaceStyles.assetCardHeader}>
            <span>Aktiver Banner</span>
            {persistedAssets.banner ? (
              <span className={`${styles.badge} ${persistedAssets.banner.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess}`}>
                {formatOwnershipLabel(persistedAssets.banner.ownership)}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeMuted}`}>Kein persistierter Banner</span>
            )}
          </div>
          {mutationStatusLabel && uploadTarget === 'banner' ? (
            <p className={workspaceStyles.statusNote} aria-live="polite">
              {uploadTarget === 'banner' ? `Banner laedt... ${uploadProgress}%` : mutationStatusLabel}
            </p>
          ) : null}
          {persistedAssets.banner?.url ? (
            <div className={workspaceStyles.assetPreviewFrame}>
              <img className={workspaceStyles.assetPreviewImage} src={resolveApiUrl(persistedAssets.banner.url)} alt="Aktiver Banner" />
            </div>
          ) : null}
          <p className={workspaceStyles.helperText}>
            {persistedAssets.banner
              ? `${formatOwnershipLabel(persistedAssets.banner.ownership)}er Banner ist aktiv und kann manuell ersetzt werden.`
              : 'Wenn hier nichts persistiert ist, faellt die Runtime auf Jellyfin zurueck, bis du ein manuelles Banner setzt.'}
          </p>
          <div className={styles.actionsRow}>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} disabled={isBusy} onClick={() => triggerUpload('banner')}>
              {uploadTarget === 'banner' ? `Banner laedt... ${uploadProgress}%` : EDIT_UPLOAD_TARGETS.banner.buttonLabel}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={!persistedAssets.banner || isBusy}
              onClick={() => void handleRemoveSingularAsset('banner')}
            >
              {EDIT_UPLOAD_TARGETS.banner.removeLabel}
            </button>
          </div>
        </div>

        <div className={workspaceStyles.assetCard}>
          <div className={workspaceStyles.assetCardHeader}>
            <span>Aktives Logo</span>
            {persistedAssets.logo ? (
              <span className={`${styles.badge} ${persistedAssets.logo.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess}`}>
                {formatOwnershipLabel(persistedAssets.logo.ownership)}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeMuted}`}>Kein persistiertes Logo</span>
            )}
          </div>
          {persistedAssets.logo?.url ? (
            <div className={workspaceStyles.assetPreviewFrame}>
              <img className={workspaceStyles.assetPreviewImage} src={resolveApiUrl(persistedAssets.logo.url)} alt="Aktives Logo" />
            </div>
          ) : null}
          <p className={workspaceStyles.helperText}>
            {persistedAssets.logo
              ? `${formatOwnershipLabel(persistedAssets.logo.ownership)}es Logo ist aktiv und kann manuell ersetzt werden.`
              : 'Logo kann jetzt direkt als singularer manueller Slot gesetzt werden.'}
          </p>
          <div className={styles.actionsRow}>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} disabled={isBusy} onClick={() => triggerUpload('logo')}>
              {uploadTarget === 'logo' ? `Logo laedt... ${uploadProgress}%` : EDIT_UPLOAD_TARGETS.logo.buttonLabel}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={!persistedAssets.logo || isBusy}
              onClick={() => void handleRemoveSingularAsset('logo')}
            >
              {EDIT_UPLOAD_TARGETS.logo.removeLabel}
            </button>
          </div>
        </div>

        <div className={workspaceStyles.assetCard}>
          <div className={workspaceStyles.assetCardHeader}>
            <span>Persistierte Backgrounds</span>
            <span className={`${styles.badge} ${styles.badgeMuted}`}>{persistedAssets.backgrounds.length} aktiv</span>
          </div>
          <p className={workspaceStyles.helperText}>
            Backgrounds bleiben additive Assets. Jeder Upload ergaenzt die Galerie, statt einen singularen Slot zu ersetzen.
          </p>
          <div className={styles.actionsRow}>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} disabled={isBusy} onClick={() => triggerUpload('background')}>
              {uploadTarget === 'background' ? `Background laedt... ${uploadProgress}%` : EDIT_UPLOAD_TARGETS.background.buttonLabel}
            </button>
          </div>

          {persistedAssets.backgrounds.length > 0 ? (
            <div className={workspaceStyles.assetList}>
              {persistedAssets.backgrounds.map((item) => (
                <div key={item.id} className={workspaceStyles.assetListItem}>
                  <div className={workspaceStyles.assetListMedia}>
                    <img className={workspaceStyles.assetThumb} src={resolveApiUrl(item.url)} alt={`Background ${item.sort_order}`} />
                  </div>
                  <div className={workspaceStyles.assetListBody}>
                    <div className={workspaceStyles.assetCardHeader}>
                      <span>Background #{item.sort_order}</span>
                    </div>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${item.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess}`}>
                        {formatOwnershipLabel(item.ownership)}
                      </span>
                      <span className={`${styles.badge} ${styles.badgeMuted}`}>Sortierung {item.sort_order}</span>
                    </div>
                    <div className={styles.actionsRow}>
                      <a className={`${styles.button} ${styles.buttonGhost}`} href={resolveApiUrl(item.url)} target="_blank" rel="noreferrer">
                        Background oeffnen
                      </a>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonDanger}`}
                        disabled={isBusy}
                        onClick={() => void handleRemoveBackground(item.id)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={workspaceStyles.assetCard}>
          <div className={workspaceStyles.assetCardHeader}>
            <span>Aktives Background-Video</span>
            {persistedAssets.background_video ? (
              <span
                className={`${styles.badge} ${
                  persistedAssets.background_video.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess
                }`}
              >
                {formatOwnershipLabel(persistedAssets.background_video.ownership)}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeMuted}`}>Kein persistiertes Background-Video</span>
            )}
          </div>
          <p className={workspaceStyles.helperText}>
            {persistedAssets.background_video
              ? `${formatOwnershipLabel(persistedAssets.background_video.ownership)}es Background-Video ist aktiv und kann manuell ersetzt werden.`
              : 'Background-Video kann jetzt direkt als singularer manueller Slot gesetzt werden.'}
          </p>
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={isBusy}
              onClick={() => triggerUpload('background_video')}
            >
              {uploadTarget === 'background_video'
                ? `Background-Video laedt... ${uploadProgress}%`
                : EDIT_UPLOAD_TARGETS.background_video.buttonLabel}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={!persistedAssets.background_video || isBusy}
              onClick={() => void handleRemoveSingularAsset('background_video')}
            >
              {EDIT_UPLOAD_TARGETS.background_video.removeLabel}
            </button>
            {persistedAssets.background_video?.url ? (
              <a
                className={`${styles.button} ${styles.buttonGhost}`}
                href={resolveApiUrl(persistedAssets.background_video.url)}
                target="_blank"
                rel="noreferrer"
              >
                Background-Video oeffnen
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
