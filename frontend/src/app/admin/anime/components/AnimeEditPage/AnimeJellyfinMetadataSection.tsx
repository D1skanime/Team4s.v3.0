'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  applyAdminAnimeMetadataFromJellyfin,
  getAdminAnimeJellyfinContext,
  previewAdminAnimeMetadataFromJellyfin,
} from '@/lib/api'
import type { AdminAnimeJellyfinContext, AdminAnimeJellyfinMetadataPreviewResult } from '@/types/admin'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'
import { AnimeJellyfinAssetUploadControls } from './AnimeJellyfinAssetUploadControls'
import {
  buildAssetCards,
  formatCoverSource,
  formatSourceKindLabel,
  summarizeAssetSlotDecision,
  summarizeAssetSlots,
} from './AnimeJellyfinMetadataSection.helpers'

export { formatCoverSource, summarizeAssetSlotDecision, summarizeAssetSlots } from './AnimeJellyfinMetadataSection.helpers'

interface AnimeJellyfinMetadataSectionProps {
  animeID: number
  authToken: string
  onError: (message: string) => void
  onSuccess: (message: string) => void
  onAfterApply: () => Promise<void>
  onContextLoaded?: (context: AdminAnimeJellyfinContext | null) => void
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
  const [applyCover, setApplyCover] = useState(false)
  const [applyBanner, setApplyBanner] = useState(false)
  const [applyBackgrounds, setApplyBackgrounds] = useState(false)

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
  const isBusy = isPreviewing || isApplying

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

  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
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
                Keine Feld-Aenderungen vorgesehen. Nutze die Asset-Aktionen unten, wenn du Banner, Logo, Backgrounds oder Background-Videos separat verwalten willst.
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

      {assetCards.length > 0 && context ? (
        <div className={workspaceStyles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Asset-Provenance</h3>
              <p className={styles.sectionMeta}>
                Cover, Banner, Logo, Backgrounds und Background-Video koennen explizit aus Jellyfin uebernommen und manuell ersetzt oder ergaenzt werden.
              </p>
            </div>
          </div>

          <div className={workspaceStyles.sectionGridTwo}>
            {assetCards.map((asset) => {
              const decision = summarizeAssetSlotDecision(asset.kind, {
                hasIncoming: asset.hasIncoming,
                currentSource: context.cover.current_source,
              })
              const isCover = asset.kind === 'cover'
              const isActionable = isCover ? preview?.cover.can_apply : true

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
                      {isActionable ? 'Manuell oder explizit steuerbar' : 'Preview zuerst laden'}
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

          <AnimeJellyfinAssetUploadControls
            animeID={animeID}
            authToken={authToken}
            disabled={isBusy}
            persistedAssets={context.persisted_assets}
            onSuccess={onSuccess}
            onError={onError}
            onAfterMutation={async () => {
              await onAfterApply()
              await refreshContext()
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
