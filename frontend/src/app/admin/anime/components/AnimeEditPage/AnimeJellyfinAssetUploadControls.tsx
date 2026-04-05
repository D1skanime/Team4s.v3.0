'use client'

import { useRef, useState } from 'react'

import {
  addAdminAnimeBackgroundAsset,
  assignAdminAnimeCoverAsset,
  assignAdminAnimeBackgroundVideoAsset,
  assignAdminAnimeBannerAsset,
  assignAdminAnimeLogoAsset,
  deleteAdminAnimeCoverAsset,
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
import type { AssetCardDescriptor } from './AnimeJellyfinMetadataSection.helpers'
import { summarizeAssetSlotDecision } from './AnimeJellyfinMetadataSection.helpers'

interface AnimeJellyfinAssetUploadControlsProps {
  animeID: number
  authToken: string
  disabled?: boolean
  assetCards: AssetCardDescriptor[]
  coverCurrentImage?: string
  coverCurrentSource: AdminAnimeJellyfinContext['cover']['current_source']
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
  assetCards,
  coverCurrentImage,
  coverCurrentSource,
  persistedAssets,
  onSuccess,
  onError,
  onAfterMutation,
}: AnimeJellyfinAssetUploadControlsProps) {
  const [isMutatingAssets, setIsMutatingAssets] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<EditUploadTarget | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundVideoInputRef = useRef<HTMLInputElement | null>(null)

  const isBusy = disabled || isMutatingAssets || isUploadingCover
  const mutationStatusLabel = getEditUploadStatusLabel(uploadTarget, false)

  async function handleCoverUpload(file: File) {
    setIsUploadingCover(true)

    try {
      const upload = await uploadAdminAnimeMedia({
        animeID,
        assetType: 'poster',
        file,
        authToken,
      })

      await assignAdminAnimeCoverAsset(animeID, upload.id, authToken)
      await onAfterMutation()
      onSuccess('Cover wurde hochgeladen und als aktives Asset gesetzt.')
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        onError(error.message)
      } else {
        onError('Cover Upload fehlgeschlagen.')
      }
    } finally {
      setIsUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  async function handleRemoveCover() {
    setIsUploadingCover(true)
    try {
      await deleteAdminAnimeCoverAsset(animeID, authToken)
      await onAfterMutation()
      onSuccess('Cover wurde entfernt.')
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        onError(error.message)
      } else {
        onError('Cover konnte nicht entfernt werden.')
      }
    } finally {
      setIsUploadingCover(false)
    }
  }

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

  function triggerCoverUpload() {
    coverInputRef.current?.click()
  }

  function renderPersistedStatus(kind: AssetCardDescriptor['kind']) {
    if (kind === 'cover') {
      return null
    }
    if (kind === 'backgrounds') {
      return (
        <span className={`${styles.badge} ${styles.badgeMuted}`}>
          {persistedAssets.backgrounds.length} aktiv
        </span>
      )
    }

    const asset =
      kind === 'banner'
        ? persistedAssets.banner
        : kind === 'logo'
          ? persistedAssets.logo
          : persistedAssets.background_video

    if (!asset) {
      return (
        <span className={`${styles.badge} ${styles.badgeMuted}`}>
          Noch nicht persistiert
        </span>
      )
    }

    return (
      <span className={`${styles.badge} ${asset.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess}`}>
        Aktiv: {formatOwnershipLabel(asset.ownership)}
      </span>
    )
  }

  function renderStateFrame(
    imageUrl: string | undefined,
    alt: string,
    options?: { isVideo?: boolean; poster?: boolean },
  ) {
    const isVideo = options?.isVideo ?? false
    const poster = options?.poster ?? false

    if (!imageUrl) {
      return (
        <div className={`${workspaceStyles.assetStateEmpty} ${poster ? workspaceStyles.assetStateEmptyPoster : ''}`}>
          Noch kein Asset verfuegbar.
        </div>
      )
    }

    if (isVideo) {
      return (
        <div className={workspaceStyles.assetStateEmpty}>
          Background-Video ist gesetzt.
        </div>
      )
    }

    return (
      <div
        className={`${workspaceStyles.assetPreviewFrame} ${
          poster ? workspaceStyles.assetPreviewFramePoster : workspaceStyles.assetPreviewFrameWide
        }`}
      >
        <img className={workspaceStyles.assetPreviewImage} src={imageUrl} alt={alt} />
      </div>
    )
  }

  function renderPersistedBody(kind: AssetCardDescriptor['kind']) {
    if (kind === 'cover') {
      const hasActiveCover = Boolean(coverCurrentImage?.trim())

      return (
        <>
          <div className={workspaceStyles.assetComparisonGrid}>
            <div className={workspaceStyles.assetStatePanel}>
              <span className={workspaceStyles.assetStateLabel}>Provider-Vorschau</span>
              {renderStateFrame(
                assetCards.find((item) => item.kind === 'cover')?.previewURL,
                'Provider-Cover',
                { poster: true },
              )}
              <div className={workspaceStyles.assetLinkRow}>
                {assetCards.find((item) => item.kind === 'cover')?.previewURL ? (
                  <a
                    className={`${styles.button} ${styles.buttonGhost}`}
                    href={assetCards.find((item) => item.kind === 'cover')?.previewURL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Provider-Asset oeffnen
                  </a>
                ) : null}
              </div>
            </div>
            <div className={workspaceStyles.assetStatePanel}>
              <span className={workspaceStyles.assetStateLabel}>Aktiv gespeichert</span>
              {renderStateFrame(coverCurrentImage ? resolveApiUrl(coverCurrentImage) : undefined, 'Aktives Cover', {
                poster: true,
              })}
              <p className={workspaceStyles.helperText}>
                {coverCurrentSource === 'provider'
                  ? 'Aktiv: Provider-Cover'
                  : coverCurrentSource === 'manual'
                    ? 'Aktiv: manuelles Cover'
                    : 'Aktiv: kein Cover'}
              </p>
              {isUploadingCover ? (
                <p className={workspaceStyles.statusNote} aria-live="polite">
                  Cover wird verarbeitet...
                </p>
              ) : null}
              <div className={workspaceStyles.assetActionStack}>
                <div className={workspaceStyles.assetActionRowCompact}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={isBusy}
                    onClick={triggerCoverUpload}
                  >
                    {isUploadingCover ? 'Upload laeuft...' : 'Cover hochladen'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonDanger}`}
                    disabled={!hasActiveCover || isBusy}
                    onClick={() => void handleRemoveCover()}
                  >
                    Cover entfernen
                  </button>
                </div>
                {hasActiveCover ? (
                  <div className={workspaceStyles.assetLinkRow}>
                    <a
                      className={`${styles.button} ${styles.buttonGhost}`}
                      href={resolveApiUrl(coverCurrentImage)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Aktives Cover oeffnen
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )
    }
    if (kind === 'backgrounds') {
      const backgroundCard = assetCards.find((item) => item.kind === 'backgrounds')
      const providerBackgrounds = backgroundCard?.previewURLs || []

      return (
        <>
          <div className={workspaceStyles.assetComparisonGrid}>
            <div className={workspaceStyles.assetStatePanel}>
              <span className={workspaceStyles.assetStateLabel}>Provider-Vorschau</span>
              {providerBackgrounds.length > 0 ? (
                <div className={workspaceStyles.assetGallery}>
                  {providerBackgrounds.map((url, index) => (
                    <div key={`${url}-${index}`} className={workspaceStyles.assetGalleryItem}>
                      <div className={workspaceStyles.assetGalleryThumb}>
                        <img src={url} alt={`Provider-Background ${index + 1}`} />
                      </div>
                      <span className={workspaceStyles.assetGalleryMeta}>Provider #{index + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={workspaceStyles.assetStateEmpty}>
                  Keine Provider-Backgrounds verfuegbar.
                </div>
              )}
              <p className={workspaceStyles.helperText}>
                Provider-Bilder sind nur Vorschlaege. Aktiv gespeichert werden nur die Backgrounds, die du explizit hinzufuegst.
              </p>
            </div>
            <div className={workspaceStyles.assetStatePanel}>
              <span className={workspaceStyles.assetStateLabel}>Aktiv gespeichert</span>
              {persistedAssets.backgrounds.length > 0 ? (
                <div className={workspaceStyles.assetGallery}>
                  {persistedAssets.backgrounds.map((item) => (
                    <div key={item.id} className={workspaceStyles.assetGalleryItem}>
                      <div className={workspaceStyles.assetGalleryThumb}>
                        <img src={resolveApiUrl(item.url)} alt={`Aktiver Background ${item.sort_order}`} />
                      </div>
                      <span className={workspaceStyles.assetGalleryMeta}>
                        #{item.sort_order} · {formatOwnershipLabel(item.ownership)}
                      </span>
                      <div className={styles.actionsRow}>
                        <a className={`${styles.button} ${styles.buttonGhost}`} href={resolveApiUrl(item.url)} target="_blank" rel="noreferrer">
                          Oeffnen
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
                  ))}
                </div>
              ) : (
                <div className={workspaceStyles.assetStateEmpty}>
                  Noch kein manueller Background gespeichert.
                </div>
              )}
            </div>
          </div>
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={isBusy}
              onClick={() => triggerUpload('background')}
            >
              {uploadTarget === 'background' ? `Background laedt... ${uploadProgress}%` : EDIT_UPLOAD_TARGETS.background.buttonLabel}
            </button>
          </div>
          {uploadTarget === 'background' ? (
            <p className={workspaceStyles.statusNote} aria-live="polite">
              {mutationStatusLabel}
            </p>
          ) : null}
        </>
      )
    }

    const target = kind as Exclude<EditUploadTarget, 'background'>
    const asset =
      kind === 'banner'
        ? persistedAssets.banner
        : kind === 'logo'
          ? persistedAssets.logo
          : persistedAssets.background_video

    return (
      <>
        <div className={workspaceStyles.assetComparisonGrid}>
          <div className={workspaceStyles.assetStatePanel}>
            <span className={workspaceStyles.assetStateLabel}>Provider-Vorschau</span>
            {renderStateFrame(
              assetCards.find((item) => item.kind === kind)?.previewURL,
              `Provider-${kind}`,
              { isVideo: kind === 'background_video' },
            )}
            <p className={workspaceStyles.helperText}>
              Provider-Vorschau, nicht automatisch aktiv.
            </p>
          </div>
          <div className={workspaceStyles.assetStatePanel}>
            <span className={workspaceStyles.assetStateLabel}>Aktiv gespeichert</span>
            {renderStateFrame(
              asset?.url ? resolveApiUrl(asset.url) : undefined,
              `Aktives ${kind}`,
              { isVideo: kind === 'background_video' },
            )}
            <p className={workspaceStyles.helperText}>
              {asset
                ? `Aktiv: ${formatOwnershipLabel(asset.ownership)}`
                : 'Aktiv: noch nicht gespeichert'}
            </p>
          </div>
        </div>
        {uploadTarget === target ? (
          <p className={workspaceStyles.statusNote} aria-live="polite">
            {target === 'banner'
              ? `Banner laedt... ${uploadProgress}%`
              : target === 'logo'
                ? `Logo laedt... ${uploadProgress}%`
                : `Background-Video laedt... ${uploadProgress}%`}
          </p>
        ) : null}
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            disabled={isBusy}
            onClick={() => triggerUpload(target)}
          >
            {uploadTarget === target
              ? target === 'banner'
                ? `Banner laedt... ${uploadProgress}%`
                : target === 'logo'
                  ? `Logo laedt... ${uploadProgress}%`
                  : `Background-Video laedt... ${uploadProgress}%`
              : EDIT_UPLOAD_TARGETS[target].buttonLabel}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            disabled={!asset || isBusy}
            onClick={() => void handleRemoveSingularAsset(target)}
          >
            {EDIT_UPLOAD_TARGETS[target].removeLabel}
          </button>
          {assetCards.find((item) => item.kind === kind)?.previewURL ? (
            <a
              className={`${styles.button} ${styles.buttonGhost}`}
              href={assetCards.find((item) => item.kind === kind)?.previewURL}
              target="_blank"
              rel="noreferrer"
            >
              Provider oeffnen
            </a>
          ) : null}
          {asset?.url ? (
            <a className={`${styles.button} ${styles.buttonGhost}`} href={resolveApiUrl(asset.url)} target="_blank" rel="noreferrer">
              Aktives Asset oeffnen
            </a>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <>
    <input
        ref={coverInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleCoverUpload(file)
          }
        }}
      />
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
        {assetCards.map((asset) => {
          const decision = summarizeAssetSlotDecision(asset.kind, {
            hasIncoming: asset.hasIncoming,
            currentSource: coverCurrentSource,
          })
          const isCover = asset.kind === 'cover'
          const isBackgroundVideo = asset.kind === 'background_video'

          return (
            <div key={asset.key} className={workspaceStyles.assetCard}>
              <div className={workspaceStyles.assetCardHeader}>
                <span>{asset.title}</span>
                {renderPersistedStatus(asset.kind)}
              </div>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${asset.hasIncoming ? styles.badgeSuccess : styles.badgeMuted}`}>
                  {asset.hasIncoming ? 'Provider-Slot vorhanden' : 'Kein Provider-Slot'}
                </span>
                {!isCover ? (
                  <span className={`${styles.badge} ${styles.badgeWarning}`}>
                    Manuell oder explizit steuerbar
                  </span>
                ) : null}
                {asset.countLabel ? <span className={`${styles.badge} ${styles.badgeMuted}`}>{asset.countLabel}</span> : null}
              </div>
              <p className={workspaceStyles.helperText}>{decision}</p>
              {!isCover ? renderPersistedBody(asset.kind) : null}
              {isCover ? renderPersistedBody(asset.kind) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
