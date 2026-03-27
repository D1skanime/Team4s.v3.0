'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addAdminAnimeBackgroundAsset,
  applyAdminAnimeMetadataFromJellyfin,
  assignAdminAnimeCoverAsset,
  assignAdminAnimeBannerAsset,
  deleteAdminAnimeCoverAsset,
  deleteAdminAnimeBackgroundAsset,
  deleteAdminAnimeBannerAsset,
  getAdminAnimeJellyfinContext,
  previewAdminAnimeMetadataFromJellyfin,
  resolveApiUrl,
  uploadAdminAnimeMedia,
} from '@/lib/api'
import type {
  AdminAnimeJellyfinContext,
  AdminAnimeJellyfinMetadataPreviewResult,
  AdminJellyfinIntakeAssetSlots,
} from '@/types/admin'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

interface AnimeJellyfinMetadataSectionProps {
  animeID: number
  authToken: string
  onError: (message: string) => void
  onSuccess: (message: string) => void
  onAfterApply: () => Promise<void>
  onContextLoaded?: (context: AdminAnimeJellyfinContext | null) => void
}

type AssetDecisionKind = 'cover' | 'logo' | 'banner' | 'backgrounds' | 'background_video'
type UploadTarget = 'cover' | 'banner' | 'background'

interface AssetCardDescriptor {
  key: string
  title: string
  kind: AssetDecisionKind
  countLabel?: string
  previewURL?: string
  hasIncoming: boolean
}

export function formatCoverSource(source: AdminAnimeJellyfinContext['cover']['current_source']): string {
  switch (source) {
    case 'provider':
      return 'Provider-Cover aktiv'
    case 'manual':
      return 'Manuelles Cover aktiv'
    case 'none':
      return 'Noch kein Cover gesetzt'
  }
}

export function summarizeAssetSlots(slots?: AdminJellyfinIntakeAssetSlots): string {
  if (!slots) return 'Keine Provider-Assets geladen.'

  const parts: string[] = []
  if (slots.cover.present) parts.push('Poster')
  if (slots.logo.present) parts.push('Logo')
  if (slots.banner.present) parts.push('Banner')
  if (slots.backgrounds.length > 0) parts.push(`${slots.backgrounds.length} Backgrounds`)
  if (slots.background_video.present) parts.push('Background-Video')

  if (parts.length === 0) {
    return 'Keine Provider-Assets gefunden.'
  }

  return `Verfuegbar: ${parts.join(', ')}`
}

export function summarizeAssetSlotDecision(
  kind: AssetDecisionKind,
  options: {
    hasIncoming: boolean
    currentSource?: AdminAnimeJellyfinContext['cover']['current_source']
  },
): string {
  switch (kind) {
    case 'cover':
      if (!options.hasIncoming) return 'Kein Provider-Cover verfuegbar'
      if (options.currentSource === 'provider') return 'Provider-Cover ist bereits aktiv'
      if (options.currentSource === 'manual') return 'Manuelles Cover bleibt geschuetzt, bis es explizit ersetzt wird'
      return 'Provider-Cover kann explizit uebernommen werden'
    case 'banner':
      return options.hasIncoming
        ? 'Banner kann explizit aus Jellyfin uebernommen oder manuell ersetzt werden'
        : 'Kein Provider-Banner verfuegbar'
    case 'logo':
      return options.hasIncoming
        ? 'Logo ist als Provider-Slot sichtbar, bleibt in diesem Schnitt aber provider-only'
        : 'Kein Provider-Logo verfuegbar'
    case 'backgrounds':
      return options.hasIncoming
        ? 'Backgrounds koennen explizit aus Jellyfin uebernommen oder manuell ergaenzt werden'
        : 'Keine Provider-Backgrounds verfuegbar'
    case 'background_video':
      return options.hasIncoming
        ? 'Background-Video bleibt provider-only'
        : 'Kein Provider-Background-Video verfuegbar'
  }
}

function buildAssetCards(
  context: AdminAnimeJellyfinContext | null,
  preview: AdminAnimeJellyfinMetadataPreviewResult | null,
): AssetCardDescriptor[] {
  const sourceSlots = preview?.asset_slots || context?.asset_slots
  if (!sourceSlots) {
    return []
  }

  const firstBackground = sourceSlots.backgrounds.find((slot) => slot.present && slot.url?.trim())

  return [
    {
      key: 'cover',
      title: 'Cover',
      kind: 'cover',
      previewURL: resolveApiUrl(preview?.cover.incoming_image || sourceSlots.cover.url),
      hasIncoming: Boolean(preview?.cover.incoming_available || sourceSlots.cover.present),
    },
    {
      key: 'banner',
      title: 'Banner',
      kind: 'banner',
      previewURL: resolveApiUrl(sourceSlots.banner.url),
      hasIncoming: sourceSlots.banner.present,
    },
    {
      key: 'logo',
      title: 'Logo',
      kind: 'logo',
      previewURL: resolveApiUrl(sourceSlots.logo.url),
      hasIncoming: sourceSlots.logo.present,
    },
    {
      key: 'backgrounds',
      title: 'Backgrounds',
      kind: 'backgrounds',
      countLabel: sourceSlots.backgrounds.length > 0 ? `${sourceSlots.backgrounds.length} Slots` : undefined,
      previewURL: resolveApiUrl(firstBackground?.url),
      hasIncoming: sourceSlots.backgrounds.length > 0,
    },
    {
      key: 'background_video',
      title: 'Background-Video',
      kind: 'background_video',
      previewURL: resolveApiUrl(sourceSlots.background_video.url),
      hasIncoming: sourceSlots.background_video.present,
    },
  ]
}

function formatOwnershipLabel(value: 'manual' | 'provider'): string {
  return value === 'manual' ? 'Manuell' : 'Provider'
}

function formatSourceKindLabel(value: AdminAnimeJellyfinContext['source_kind']): string {
  return value === 'manual' ? 'Manuell' : 'Jellyfin'
}

function getMutationStatusLabel(uploadTarget: UploadTarget | null, isApplying: boolean): string | null {
  if (isApplying) {
    return 'Provider-Metadaten werden auf persistierte Anime-Assets angewendet.'
  }
  if (uploadTarget === 'banner') {
    return 'Banner-Upload laeuft. Nach Abschluss wird das Asset sofort als manuell aktiv gesetzt.'
  }
  if (uploadTarget === 'cover') {
    return 'Cover-Upload laeuft. Nach Abschluss wird das Asset sofort als manuelles Cover aktiv gesetzt.'
  }
  if (uploadTarget === 'background') {
    return 'Background-Upload laeuft. Nach Abschluss wird das Asset der persistierten Galerie hinzugefuegt.'
  }
  return null
}

export function AnimeJellyfinMetadataSection({
  animeID,
  authToken,
  onError,
  onSuccess,
  onAfterApply,
  onContextLoaded,
}: AnimeJellyfinMetadataSectionProps) {
  const [context, setContext] = useState<AdminAnimeJellyfinContext | null>(null)
  const [preview, setPreview] = useState<AdminAnimeJellyfinMetadataPreviewResult | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isMutatingAssets, setIsMutatingAssets] = useState(false)
  const [applyCover, setApplyCover] = useState(false)
  const [applyBanner, setApplyBanner] = useState(false)
  const [applyBackgrounds, setApplyBackgrounds] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundInputRef = useRef<HTMLInputElement | null>(null)
  const onErrorRef = useRef(onError)
  const onContextLoadedRef = useRef(onContextLoaded)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    onContextLoadedRef.current = onContextLoaded
  }, [onContextLoaded])

  async function refreshContext(options?: { resetPreview?: boolean }) {
    const resetPreview = options?.resetPreview ?? false
    const response = await getAdminAnimeJellyfinContext(animeID, authToken)
    setContext(response.data)
    onContextLoadedRef.current?.(response.data)
    if (resetPreview) {
      setPreview(null)
      setApplyCover(false)
      setApplyBanner(false)
      setApplyBackgrounds(false)
    }
    return response.data
  }

  useEffect(() => {
    let cancelled = false

    async function loadContext() {
      setIsLoadingContext(true)
      setPreview(null)
      setApplyCover(false)
      setApplyBanner(false)
      setApplyBackgrounds(false)

      try {
        const response = await getAdminAnimeJellyfinContext(animeID, authToken)
        if (cancelled) return
        setContext(response.data)
        onContextLoadedRef.current?.(response.data)
      } catch (error) {
        if (cancelled) return
        setContext(null)
        onContextLoadedRef.current?.(null)
        onErrorRef.current(error instanceof Error ? error.message : 'Jellyfin-Kontext konnte nicht geladen werden.')
      } finally {
        if (!cancelled) {
          setIsLoadingContext(false)
        }
      }
    }

    void loadContext()

    return () => {
      cancelled = true
    }
  }, [animeID, authToken])

  const hasApplicableDiff = useMemo(() => preview?.diff.some((item) => item.apply) ?? false, [preview])
  const canApply = Boolean(preview) && (hasApplicableDiff || applyCover || applyBanner || applyBackgrounds)
  const assetCards = useMemo(() => buildAssetCards(context, preview), [context, preview])
  const persistedCover = context?.persisted_assets.cover
  const persistedBackgrounds = context?.persisted_assets.backgrounds || []
  const persistedBanner = context?.persisted_assets.banner
  const mutationStatusLabel = getMutationStatusLabel(uploadTarget, isApplying)
  const isBusy = isPreviewing || isApplying || isMutatingAssets

  async function handlePreview() {
    setIsPreviewing(true)
    setApplyCover(false)
    setApplyBanner(false)
    setApplyBackgrounds(false)

    try {
      const response = await previewAdminAnimeMetadataFromJellyfin(animeID, {}, authToken)
      setPreview(response.data)
      onSuccess('Jellyfin-Metadatenvorschau geladen.')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Jellyfin-Metadatenvorschau fehlgeschlagen.')
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleApply() {
    if (!preview) return

    setIsApplying(true)
    try {
      await applyAdminAnimeMetadataFromJellyfin(
        animeID,
        {
          jellyfin_series_id: preview.jellyfin_series_id,
          apply_cover: applyCover,
          apply_banner: applyBanner,
          apply_backgrounds: applyBackgrounds,
        },
        authToken,
      )
      await onAfterApply()
      await refreshContext({ resetPreview: true })
      onSuccess('Jellyfin-Metadaten wurden uebernommen.')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Jellyfin-Metadaten konnten nicht uebernommen werden.')
    } finally {
      setIsApplying(false)
    }
  }

  async function handleManualUpload(target: UploadTarget, file: File) {
    setIsMutatingAssets(true)
    setUploadTarget(target)
    setUploadProgress(0)

    try {
      const upload = await uploadAdminAnimeMedia({
        animeID,
        assetType: target === 'cover' ? 'poster' : target === 'banner' ? 'banner' : 'gallery',
        file,
        authToken,
        onProgress: setUploadProgress,
      })

      if (target === 'cover') {
        await assignAdminAnimeCoverAsset(animeID, upload.id, authToken)
        onSuccess('Cover wurde hochgeladen und als manuelles Asset gesetzt.')
      } else if (target === 'banner') {
        await assignAdminAnimeBannerAsset(animeID, upload.id, authToken)
        onSuccess('Banner wurde hochgeladen und als manuelles Asset gesetzt.')
      } else {
        await addAdminAnimeBackgroundAsset(animeID, upload.id, authToken)
        onSuccess('Background wurde hochgeladen und als manuelles Asset hinzugefuegt.')
      }

      await onAfterApply()
      await refreshContext()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.')
    } finally {
      setIsMutatingAssets(false)
      setUploadTarget(null)
      setUploadProgress(0)
      if (coverInputRef.current) coverInputRef.current.value = ''
      if (bannerInputRef.current) bannerInputRef.current.value = ''
      if (backgroundInputRef.current) backgroundInputRef.current.value = ''
    }
  }

  async function handleRemoveCover() {
    setIsMutatingAssets(true)
    try {
      await deleteAdminAnimeCoverAsset(animeID, authToken)
      await onAfterApply()
      await refreshContext()
      onSuccess('Cover wurde entfernt.')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Cover konnte nicht entfernt werden.')
    } finally {
      setIsMutatingAssets(false)
    }
  }

  async function handleRemoveBanner() {
    setIsMutatingAssets(true)
    try {
      await deleteAdminAnimeBannerAsset(animeID, authToken)
      await onAfterApply()
      await refreshContext()
      onSuccess('Banner wurde entfernt.')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Banner konnte nicht entfernt werden.')
    } finally {
      setIsMutatingAssets(false)
    }
  }

  async function handleRemoveBackground(backgroundID: number) {
    setIsMutatingAssets(true)
    try {
      await deleteAdminAnimeBackgroundAsset(animeID, backgroundID, authToken)
      await onAfterApply()
      await refreshContext()
      onSuccess('Background wurde entfernt.')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Background konnte nicht entfernt werden.')
    } finally {
      setIsMutatingAssets(false)
    }
  }

  function triggerUpload(target: UploadTarget) {
    if (target === 'cover') {
      coverInputRef.current?.click()
      return
    }
    if (target === 'banner') {
      bannerInputRef.current?.click()
      return
    }
    backgroundInputRef.current?.click()
  }

  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleManualUpload('cover', file)
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

      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Jellyfin Provenance</h2>
          <p className={styles.sectionMeta}>Linkage, sichere Metadaten-Preview und explizite Uebernahme fuer bestehende Anime.</p>
        </div>
      </div>

      {isLoadingContext ? <p className={workspaceStyles.helperText}>Jellyfin-Kontext wird geladen...</p> : null}

      {context ? (
        <>
          <div className={workspaceStyles.sectionGridTwo}>
            <div className={workspaceStyles.field}>
              <span>Quelle</span>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${context.linked ? styles.badgePrimary : styles.badgeMuted}`}>
                  {context.linked ? 'Mit Jellyfin verknuepft' : 'Manuell gepflegt'}
                </span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{formatSourceKindLabel(context.source_kind)}</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{formatCoverSource(context.cover.current_source)}</span>
              </div>
            </div>
            <div className={workspaceStyles.field}>
              <span>Kontext</span>
              <p className={workspaceStyles.helperText}>
                {context.source ? `Quelle: ${context.source}` : 'Keine direkte Quelle gesetzt.'}
              </p>
            </div>
            <div className={workspaceStyles.field}>
              <span>Jellyfin-Serie</span>
              <input className={styles.input} value={context.jellyfin_series_name || context.jellyfin_series_id || ''} readOnly disabled />
            </div>
            <div className={workspaceStyles.field}>
              <span>Ordner / Pfad</span>
              <input className={styles.input} value={context.folder_name || context.jellyfin_series_path || ''} readOnly disabled />
            </div>
            <div className={workspaceStyles.field}>
              <span>Provider-Assets</span>
              <p className={workspaceStyles.helperText}>{summarizeAssetSlots(context.asset_slots)}</p>
            </div>
          </div>

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={!context.linked || isBusy}
              onClick={() => void handlePreview()}
            >
              {isPreviewing ? 'Preview laeuft...' : 'Metadaten preview laden'}
            </button>
          </div>

          {!context.linked ? (
            <p className={workspaceStyles.helperText}>
              Dieser Anime hat aktuell keinen persistierten Jellyfin-Link. Phase 4 zeigt hier bewusst keine verdeckte Auto-Verknuepfung.
            </p>
          ) : null}
        </>
      ) : null}

      {preview ? (
        <div className={workspaceStyles.sectionCard}>
          <div className={workspaceStyles.panelHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Preview-Entscheidung</h3>
              <p className={styles.sectionMeta}>Nur explizit angehakte Provider-Assets duerfen bestehende persistierte Daten ergaenzen oder ersetzen.</p>
            </div>
            <span className={`${styles.badge} ${hasApplicableDiff ? styles.badgeSuccess : styles.badgeMuted}`}>
              {hasApplicableDiff ? 'Aenderungen verfuegbar' : 'Keine Feld-Diffs'}
            </span>
          </div>
          <div className={workspaceStyles.sectionGridTwo}>
            {preview.diff.length === 0 ? (
              <p className={workspaceStyles.helperText}>
                Keine Feld-Aenderungen vorgesehen. Nutze die Asset-Aktionen unten, wenn du Banner oder Backgrounds separat verwalten willst.
              </p>
            ) : null}
            {preview.diff.map((item) => (
              <div key={item.field} className={workspaceStyles.infoPanel}>
                <span>{item.label}</span>
                <div className={styles.badgeRow}>
                  <span className={`${styles.badge} ${item.apply ? styles.badgeSuccess : styles.badgeMuted}`}>
                    {item.apply ? 'Wird gefuellt' : item.action === 'protect' ? 'Geschuetzt' : 'Keine Aenderung'}
                  </span>
                  {item.reason ? <span className={`${styles.badge} ${styles.badgeMuted}`}>{item.reason}</span> : null}
                </div>
                <input className={styles.input} value={item.current_value || ''} readOnly disabled />
                <input className={styles.input} value={item.incoming_value || ''} readOnly disabled />
              </div>
            ))}
          </div>

          <div className={workspaceStyles.toggleStack}>
            <label className={workspaceStyles.choiceCard}>
              <div className={workspaceStyles.choiceHeader}>
                <input
                  type="checkbox"
                  checked={applyCover}
                  disabled={!preview.cover.can_apply || isApplying}
                  onChange={(event) => setApplyCover(event.target.checked)}
                />
                <div>
                  <strong>Jellyfin-Cover uebernehmen</strong>
                  <p className={workspaceStyles.helperText}>
                    {preview.cover.can_apply
                      ? `Aktuell: ${formatCoverSource(preview.cover.current_source)}. Provider-Cover wird nur mit explizitem Haken angewendet.`
                      : preview.cover.reason || 'Kein Jellyfin-Cover verfuegbar.'}
                  </p>
                </div>
              </div>
            </label>

            <label className={workspaceStyles.choiceCard}>
              <div className={workspaceStyles.choiceHeader}>
                <input
                  type="checkbox"
                  checked={applyBanner}
                  disabled={!preview.asset_slots.banner.present || isApplying}
                  onChange={(event) => setApplyBanner(event.target.checked)}
                />
                <div>
                  <strong>Jellyfin-Banner uebernehmen</strong>
                  <p className={workspaceStyles.helperText}>
                    {preview.asset_slots.banner.present
                      ? 'Provider-Banner wird nur mit explizitem Haken uebernommen. Manuelle Banner bleiben bis zum Entfernen geschuetzt.'
                      : 'Kein Jellyfin-Banner verfuegbar.'}
                  </p>
                </div>
              </div>
            </label>

            <label className={workspaceStyles.choiceCard}>
              <div className={workspaceStyles.choiceHeader}>
                <input
                  type="checkbox"
                  checked={applyBackgrounds}
                  disabled={preview.asset_slots.backgrounds.length === 0 || isApplying}
                  onChange={(event) => setApplyBackgrounds(event.target.checked)}
                />
                <div>
                  <strong>Jellyfin-Backgrounds uebernehmen</strong>
                  <p className={workspaceStyles.helperText}>
                    {preview.asset_slots.backgrounds.length > 0
                      ? 'Provider-Backgrounds werden nur mit explizitem Haken aktualisiert oder ergaenzt. Manuelle Backgrounds bleiben geschuetzt.'
                      : 'Keine Jellyfin-Backgrounds verfuegbar.'}
                  </p>
                </div>
              </div>
            </label>
          </div>

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={!canApply || isApplying}
              onClick={() => void handleApply()}
            >
              {isApplying ? 'Metadaten werden uebernommen...' : 'Preview anwenden'}
            </button>
          </div>
        </div>
      ) : null}

      {assetCards.length > 0 ? (
        <div className={workspaceStyles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Asset-Provenance</h3>
              <p className={styles.sectionMeta}>
                Cover, Banner und Backgrounds koennen jetzt explizit aus Jellyfin uebernommen, manuell ersetzt oder entfernt werden.
              </p>
            </div>
          </div>

          <div className={workspaceStyles.sectionGridTwo}>
            {assetCards.map((asset) => {
              const decision = summarizeAssetSlotDecision(asset.kind, {
                hasIncoming: asset.hasIncoming,
                currentSource: context?.cover.current_source,
              })
              const isCover = asset.kind === 'cover'
              const isBanner = asset.kind === 'banner'
              const isBackgrounds = asset.kind === 'backgrounds'
              const isActionable = isCover ? preview?.cover.can_apply : isBanner || isBackgrounds

              return (
                <div key={asset.key} className={workspaceStyles.assetCard}>
                  <div className={workspaceStyles.assetCardHeader}>
                    <span>{asset.title}</span>
                    {asset.countLabel ? <span className={`${styles.badge} ${styles.badgeMuted}`}>{asset.countLabel}</span> : null}
                  </div>
                  <div className={styles.badgeRow}>
                    <span className={`${styles.badge} ${asset.hasIncoming ? styles.badgeSuccess : styles.badgeMuted}`}>
                      {asset.hasIncoming ? 'Provider-Slot vorhanden' : 'Kein Provider-Slot'}
                    </span>
                    <span className={`${styles.badge} ${isActionable ? styles.badgeWarning : styles.badgeMuted}`}>
                      {isActionable ? 'Explizit steuerbar' : isCover ? 'Preview zuerst laden' : 'Provider-only'}
                    </span>
                  </div>
                  {asset.previewURL ? (
                    <div className={workspaceStyles.assetPreviewFrame}>
                      <img className={workspaceStyles.assetPreviewImage} src={asset.previewURL} alt={`${asset.title} Provider-Vorschau`} />
                    </div>
                  ) : null}
                  <p className={workspaceStyles.helperText}>{decision}</p>
                  {asset.previewURL ? (
                    <div className={styles.actionsRow}>
                      <a className={`${styles.button} ${styles.buttonGhost}`} href={asset.previewURL} target="_blank" rel="noreferrer">
                        Provider-Asset oeffnen
                      </a>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className={workspaceStyles.sectionGridTwo}>
            <div className={workspaceStyles.assetCard}>
              <div className={workspaceStyles.assetCardHeader}>
                <span>Aktives Cover</span>
                {persistedCover ? (
                  <span className={`${styles.badge} ${persistedCover.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess}`}>
                    {formatOwnershipLabel(persistedCover.ownership)}
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeMuted}`}>Kein persistiertes Cover</span>
                )}
              </div>
              {mutationStatusLabel && uploadTarget === 'cover' ? (
                <p className={workspaceStyles.statusNote} aria-live="polite">
                  {mutationStatusLabel}
                </p>
              ) : null}
              {persistedCover?.url ? (
                <div className={workspaceStyles.assetPreviewFrame}>
                  <img className={workspaceStyles.assetPreviewImage} src={resolveApiUrl(persistedCover.url)} alt="Aktives Cover" />
                </div>
              ) : null}
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>
                  {persistedCover ? 'Persistierter Slot aktiv' : 'Kein persistierter Cover-Slot'}
                </span>
              </div>
              <p className={workspaceStyles.helperText}>
                {persistedCover
                  ? `${formatOwnershipLabel(persistedCover.ownership)}es Cover ist aktiv. Manuelle Covers bleiben bei Resync geschuetzt.`
                  : 'Wenn noch kein persistierter Cover-Slot existiert, kann Jellyfin das Cover nur explizit per Preview setzen.'}
              </p>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled={isBusy}
                  onClick={() => triggerUpload('cover')}
                >
                  {uploadTarget === 'cover' ? `Cover laedt... ${uploadProgress}%` : 'Cover hochladen'}
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonDanger}`}
                  disabled={!persistedCover || isBusy}
                  onClick={() => void handleRemoveCover()}
                >
                  Cover entfernen
                </button>
                {persistedCover ? (
                  <a
                    className={`${styles.button} ${styles.buttonGhost}`}
                    href={resolveApiUrl(persistedCover.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Aktives Cover oeffnen
                  </a>
                ) : null}
              </div>
            </div>

            <div className={workspaceStyles.assetCard}>
              <div className={workspaceStyles.assetCardHeader}>
                <span>Aktiver Banner</span>
                {persistedBanner ? (
                  <span className={`${styles.badge} ${persistedBanner.ownership === 'manual' ? styles.badgeWarning : styles.badgeSuccess}`}>
                    {formatOwnershipLabel(persistedBanner.ownership)}
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeMuted}`}>Kein persistierter Banner</span>
                )}
              </div>
              {mutationStatusLabel && uploadTarget === 'banner' ? (
                <p className={workspaceStyles.statusNote} aria-live="polite">
                  {mutationStatusLabel}
                </p>
              ) : null}
              {persistedBanner?.url ? (
                <div className={workspaceStyles.assetPreviewFrame}>
                  <img className={workspaceStyles.assetPreviewImage} src={resolveApiUrl(persistedBanner.url)} alt="Aktiver Banner" />
                </div>
              ) : null}
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>
                  {persistedBanner ? 'Runtime-Vorrang aktiv' : 'Fallback auf Provider moeglich'}
                </span>
              </div>
              <p className={workspaceStyles.helperText}>
                {persistedBanner
                  ? `${formatOwnershipLabel(persistedBanner.ownership)}er Banner ist aktiv und hat Runtime-Vorrang.`
                  : 'Wenn hier nichts persistiert ist, faellt die Runtime auf Jellyfin zurueck.'}
              </p>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled={isBusy}
                  onClick={() => triggerUpload('banner')}
                >
                  {uploadTarget === 'banner' ? `Banner laedt... ${uploadProgress}%` : 'Banner hochladen'}
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonDanger}`}
                  disabled={!persistedBanner || isBusy}
                  onClick={() => void handleRemoveBanner()}
                >
                  Banner entfernen
                </button>
                {persistedBanner ? (
                  <a
                    className={`${styles.button} ${styles.buttonGhost}`}
                    href={resolveApiUrl(persistedBanner.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Aktiven Banner oeffnen
                  </a>
                ) : null}
              </div>
            </div>

            <div className={workspaceStyles.assetCard}>
              <div className={workspaceStyles.assetCardHeader}>
                <span>Persistierte Backgrounds</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{persistedBackgrounds.length} aktiv</span>
              </div>
              {mutationStatusLabel && uploadTarget === 'background' ? (
                <p className={workspaceStyles.statusNote} aria-live="polite">
                  {mutationStatusLabel}
                </p>
              ) : null}
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>Manuelle Assets bleiben geschuetzt</span>
              </div>
              <p className={workspaceStyles.helperText}>
                Manuelle Backgrounds bleiben geschuetzt. Provider-Backgrounds koennen per Preview explizit ergaenzt oder erneuert werden.
              </p>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled={isBusy}
                  onClick={() => triggerUpload('background')}
                >
                  {uploadTarget === 'background' ? `Background laedt... ${uploadProgress}%` : 'Background hochladen'}
                </button>
              </div>

              {persistedBackgrounds.length > 0 ? (
                <div className={workspaceStyles.assetList}>
                  {persistedBackgrounds.map((item) => (
                    <div key={item.id} className={workspaceStyles.assetListItem}>
                      <div className={workspaceStyles.assetListMedia}>
                        <img
                          className={workspaceStyles.assetThumb}
                          src={resolveApiUrl(item.url)}
                          alt={`Background ${item.sort_order}`}
                        />
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
                          <a
                            className={`${styles.button} ${styles.buttonGhost}`}
                            href={resolveApiUrl(item.url)}
                            target="_blank"
                            rel="noreferrer"
                          >
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
          </div>
        </div>
      ) : null}
    </section>
  )
}
