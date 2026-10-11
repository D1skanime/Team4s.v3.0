'use client'

import { useEffect, useState } from 'react'

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
  getCurrentUser,
  resolveApiUrl,
  uploadAdminAnimeMedia,
} from '@/lib/api'
import type { AdminAnimeJellyfinContext } from '@/types/admin'
import { MediaOwnershipContext, MediaOwnershipContextValue } from '@/components/admin/media/MediaOwnershipContext'
import { UploadDropzone } from '@/components/ui'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'
import { EDIT_UPLOAD_TARGETS, EditUploadTarget, getEditUploadStatusLabel } from './animeJellyfinAssetUpload'
import type { AssetCardDescriptor } from './AnimeJellyfinMetadataSection.helpers'
import { summarizeAssetSlotDecision } from './AnimeJellyfinMetadataSection.helpers'

interface AnimeJellyfinAssetUploadControlsProps {
  animeID: number
  animeTitle?: string
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
  animeTitle,
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
  // D-07: MediaOwnershipContext-Zustand (Surface 2, Branding-Slot)
  const [ownerCtx, setOwnerCtx] = useState<MediaOwnershipContextValue | null>(null)
  // D-13: Eigenständige Anzeige-Berechtigungsprüfung, spiegelt das bestehende
  // Backend-Enforcement (requirePlatformAdminIdentity) 1:1 auf UI-Seite, statt sich
  // ausschließlich auf den umgebenden <PlatformAdminGate>-Wrapper der Aufrufseiten zu
  // verlassen. Fail-closed: Standardwert false, bis getCurrentUser() bestätigt hat.
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolveIsPlatformAdmin() {
      try {
        const response = await getCurrentUser()
        if (!cancelled) {
          setIsPlatformAdmin(response.data.is_platform_admin === true)
        }
      } catch {
        if (!cancelled) {
          setIsPlatformAdmin(false)
        }
      }
    }

    void resolveIsPlatformAdmin()

    return () => {
      cancelled = true
    }
  }, [])

  const isBusy = disabled || isMutatingAssets || isUploadingCover
  const mutationStatusLabel = getEditUploadStatusLabel(uploadTarget, false)

  async function handleCoverUpload(file: File) {
    // D-06-Guard: kein Upload ohne aufgelösten Owner-Kontext
    if (!ownerCtx?.ownerResolved) {
      onError('Upload nicht möglich: Kein gültiger Owner-Kontext.')
      return
    }
    setIsUploadingCover(true)

    try {
      const upload = await uploadAdminAnimeMedia({
        animeID,
        assetType: 'poster',
        file,
        visibilityCode: ownerCtx.visibilityCode,
        reviewStatusCode: ownerCtx.reviewStatusCode,
      })

      await assignAdminAnimeCoverAsset(animeID, upload.id)
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
    }
  }

  async function handleRemoveCover() {
    setIsUploadingCover(true)
    try {
      await deleteAdminAnimeCoverAsset(animeID)
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
    // D-06-Guard: kein Upload ohne aufgelösten Owner-Kontext
    if (!ownerCtx?.ownerResolved) {
      onError('Upload nicht möglich: Kein gültiger Owner-Kontext.')
      return
    }
    setIsMutatingAssets(true)
    setUploadTarget(target)
    setUploadProgress(0)

    try {
      const upload = await uploadAdminAnimeMedia({
        animeID,
        assetType: EDIT_UPLOAD_TARGETS[target].assetType,
        file,
        onProgress: setUploadProgress,
        visibilityCode: ownerCtx.visibilityCode,
        reviewStatusCode: ownerCtx.reviewStatusCode,
      })

      if (target === 'banner') {
        await assignAdminAnimeBannerAsset(animeID, upload.id)
      } else if (target === 'logo') {
        await assignAdminAnimeLogoAsset(animeID, upload.id)
      } else if (target === 'background_video') {
        await assignAdminAnimeBackgroundVideoAsset(animeID, upload.id)
      } else {
        await addAdminAnimeBackgroundAsset(animeID, upload.id)
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
    }
  }

  async function handleRemoveSingularAsset(target: 'banner' | 'logo' | 'background_video') {
    setIsMutatingAssets(true)
    try {
      if (target === 'banner') {
        await deleteAdminAnimeBannerAsset(animeID)
      } else if (target === 'logo') {
        await deleteAdminAnimeLogoAsset(animeID)
      } else {
        await deleteAdminAnimeBackgroundVideoAsset(animeID)
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
      await deleteAdminAnimeBackgroundAsset(animeID, backgroundID)
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
          Noch kein Asset verfügbar.
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
                    Provider-Asset öffnen
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
                {isPlatformAdmin ? (
                  <UploadDropzone
                    accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                    multiple={false}
                    allowDrop={true}
                    density="compact"
                    disabled={isBusy}
                    onFilesSelected={(files) => {
                      const file = files[0]
                      if (file) void handleCoverUpload(file)
                    }}
                    promptLabel={isUploadingCover ? 'Upload läuft...' : 'Cover hochladen'}
                  />
                ) : null}
                <div className={workspaceStyles.assetActionRowCompact}>
                  {isPlatformAdmin ? (
                    <button
                      type="button"
                      className={`${styles.button} ${styles.buttonDanger}`}
                      disabled={!hasActiveCover || isBusy}
                      onClick={() => void handleRemoveCover()}
                    >
                      Cover entfernen
                    </button>
                  ) : null}
                </div>
                {hasActiveCover ? (
                  <div className={workspaceStyles.assetLinkRow}>
                    <a
                      className={`${styles.button} ${styles.buttonGhost}`}
                      href={resolveApiUrl(coverCurrentImage)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Aktives Cover öffnen
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
                    <div key={url} className={workspaceStyles.assetGalleryItem}>
                      <div className={workspaceStyles.assetGalleryThumb}>
                        <img src={url} alt={`Provider-Background ${index + 1}`} />
                      </div>
                      <span className={workspaceStyles.assetGalleryMeta}>Provider #{index + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={workspaceStyles.assetStateEmpty}>
                  Keine Provider-Backgrounds verfügbar.
                </div>
              )}
              <p className={workspaceStyles.helperText}>
                Provider-Bilder sind nur Vorschläge. Aktiv gespeichert werden nur die Backgrounds, die du explizit hinzufügst.
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
                          Öffnen
                        </a>
                        {isPlatformAdmin ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.buttonDanger}`}
                            disabled={isBusy}
                            onClick={() => void handleRemoveBackground(item.id)}
                          >
                            Entfernen
                          </button>
                        ) : null}
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
            {isPlatformAdmin ? (
              <UploadDropzone
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple={false}
                allowDrop={true}
                density="compact"
                disabled={isBusy}
                onFilesSelected={(files) => {
                  const file = files[0]
                  if (file) void handleManualUpload('background', file)
                }}
                promptLabel={
                  uploadTarget === 'background'
                    ? `Background lädt... ${uploadProgress}%`
                    : EDIT_UPLOAD_TARGETS.background.buttonLabel
                }
              />
            ) : null}
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
              ? `Banner lädt... ${uploadProgress}%`
              : target === 'logo'
                ? `Logo lädt... ${uploadProgress}%`
                : `Background-Video lädt... ${uploadProgress}%`}
          </p>
        ) : null}
        <div className={styles.actionsRow}>
          {isPlatformAdmin ? (
            <UploadDropzone
              accept={target === 'background_video' ? 'video/mp4,video/webm,video/ogg' : 'image/png,image/jpeg,image/webp,image/gif'}
              multiple={false}
              allowDrop={true}
              density="compact"
              disabled={isBusy}
              onFilesSelected={(files) => {
                const file = files[0]
                if (file) void handleManualUpload(target, file)
              }}
              promptLabel={
                uploadTarget === target
                  ? target === 'banner'
                    ? `Banner lädt... ${uploadProgress}%`
                    : target === 'logo'
                      ? `Logo lädt... ${uploadProgress}%`
                      : `Background-Video lädt... ${uploadProgress}%`
                  : EDIT_UPLOAD_TARGETS[target].buttonLabel
              }
            />
          ) : null}
          {isPlatformAdmin ? (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={!asset || isBusy}
              onClick={() => void handleRemoveSingularAsset(target)}
            >
              {EDIT_UPLOAD_TARGETS[target].removeLabel}
            </button>
          ) : null}
          {assetCards.find((item) => item.kind === kind)?.previewURL ? (
            <a
              className={`${styles.button} ${styles.buttonGhost}`}
              href={assetCards.find((item) => item.kind === kind)?.previewURL}
              target="_blank"
              rel="noreferrer"
            >
              Provider öffnen
            </a>
          ) : null}
          {asset?.url ? (
            <a className={`${styles.button} ${styles.buttonGhost}`} href={resolveApiUrl(asset.url)} target="_blank" rel="noreferrer">
              Aktives Asset öffnen
            </a>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <>
      {/* D-07: MediaOwnershipContext — Surface 2, Anime-Assets (Branding-Slot, D-09) */}
      <MediaOwnershipContext
        ownerType="anime"
        ownerID={animeID}
        ownerLabel={animeTitle ? `Anime «${animeTitle}»` : `Anime ${animeID}`}
        categoryMode="slot"
        categoryValue="anime-asset"
        statusPolicy="immediate"
        disabled={isBusy}
        onContextChange={setOwnerCtx}
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
