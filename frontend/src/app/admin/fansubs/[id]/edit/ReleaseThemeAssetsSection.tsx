'use client'

import { useEffect, useState } from 'react'

import { FormField, Select } from '@/components/ui'
import {
  deleteAdminReleaseThemeAsset,
  getAdminCanonicalFansubRelease,
  getAdminReleaseThemeAssets,
  uploadAdminReleaseThemeAsset,
} from '@/lib/api'
import { MediaOwnershipContext } from '@/components/admin/media/MediaOwnershipContext'
import type { MediaOwnershipContextValue } from '@/components/admin/media/MediaOwnershipContext'
import { AdminAnimeTheme, AdminReleaseThemeAsset } from '@/types/admin'

import sharedStyles from '../../../admin.module.css'
import opEdStyles from './FansubOpEdSection.module.css'

const styles = { ...sharedStyles, ...opEdStyles }

interface ReleaseThemeAssetsSectionProps {
  fansubID: number
  animeID: number
  hasAccessToken?: boolean
  themes: AdminAnimeTheme[]
  [legacyProp: string]: unknown
}

export function ReleaseThemeAssetsSection({
  fansubID,
  animeID,
  hasAccessToken = false,
  themes,
}: ReleaseThemeAssetsSectionProps) {
  const [themeID, setThemeID] = useState<number>(themes[0]?.id ?? 0)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [releaseID, setReleaseID] = useState<number | null>(null)
  const [assets, setAssets] = useState<AdminReleaseThemeAsset[]>([])
  const [ownerCtx, setOwnerCtx] = useState<MediaOwnershipContextValue | null>(null)

  useEffect(() => {
    setThemeID(themes[0]?.id ?? 0)
  }, [themes])

  // Load release context explicitly from the dedicated canonical release endpoint.
  // This replaces the old pattern of inferring release_id from theme-asset responses.
  useEffect(() => {
    if (!hasAccessToken) return
    let active = true
    getAdminCanonicalFansubRelease(fansubID, animeID)
      .then((releaseCtx) => {
        if (!active) return
        setReleaseID(releaseCtx.release?.release_id ?? null)
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Release-Kontext konnte nicht geladen werden.')
        }
      })

    return () => {
      active = false
    }
  }, [animeID, hasAccessToken, fansubID])

  // Load theme assets separately — theme-asset endpoint is now purely about theme assets,
  // not the source of release identity.
  useEffect(() => {
    if (!hasAccessToken || releaseID === null) return
    let active = true
    getAdminReleaseThemeAssets(releaseID)
      .then((response) => {
        if (!active) return
        setAssets(response.data)
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Theme-Videos konnten nicht geladen werden.')
        }
      })

    return () => {
      active = false
    }
  }, [hasAccessToken, releaseID])

  async function reloadAssets() {
    if (releaseID === null) return
    const response = await getAdminReleaseThemeAssets(releaseID)
    setAssets(response.data)
  }

  async function handleUpload() {
    if (!file || !themeID || !hasAccessToken) return

    // D-06: Upload blockieren wenn fansubID/animeID fehlt oder Owner nicht auflösbar
    if (!fansubID || !animeID) {
      setError('Upload nicht möglich: Kein gültiger Owner-Kontext.')
      return
    }
    if (!ownerCtx?.ownerResolved) {
      setError('Upload nicht möglich: Kein gültiger Owner-Kontext.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await uploadAdminReleaseThemeAsset({
        fansubID,
        animeID,
        themeID,
        file,
        onProgress: setProgress,
        visibilityCode: ownerCtx.visibilityCode,
        reviewStatusCode: ownerCtx.reviewStatusCode,
      })
      await reloadAssets()
      setFile(null)
      setProgress(100)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  // Aktuell gewähltes Theme-Label für categoryValue (slot-Anzeige)
  const selectedTheme = themes.find((t) => t.id === themeID)
  const categoryValue = selectedTheme
    ? `${selectedTheme.theme_type_name}${selectedTheme.title ? ` - ${selectedTheme.title}` : ''}`
    : 'Release-Theme'

  return (
    <div className={styles.uploadForm}>
      {/* D-07: Surface 3 — Release-Theme-Assets (ownerType=release_theme, statusPolicy=immediate) */}
      <MediaOwnershipContext
        ownerType="release_theme"
        ownerID={fansubID}
        ownerLabel={`Release «Anime ${animeID} · Fansub ${fansubID}»`}
        categoryMode="slot"
        categoryValue={categoryValue}
        statusPolicy="immediate"
        disabled={busy}
        onContextChange={setOwnerCtx}
      />

      <div className={styles.formRow}>
        <FormField label="Theme" htmlFor="release-theme-select">
          <Select
            id="release-theme-select"
            value={String(themeID)}
            onChange={(event) => setThemeID(Number(event.target.value))}
          >
            <option value="0">Bitte wählen</option>
            {themes.map((theme) => (
              <option key={theme.id} value={String(theme.id)}>
                {theme.theme_type_name}{theme.title ? ` - ${theme.title}` : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <label className={styles.field}>
          <span>Video-Datei</span>
          {/* hidden file input bleibt nativ — kein @/components/ui-Primitive für file inputs */}
          <input type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>

        <div className={styles.progressWrap}>
          <span>Upload</span>
          <progress value={progress} max={100} />
        </div>

        <button type="button" className={styles.button} onClick={() => void handleUpload()} disabled={!file || !themeID || busy || !hasAccessToken || !ownerCtx?.ownerResolved}>
          {busy ? 'Lade hoch...' : 'Video hochladen'}
        </button>
      </div>

      {error ? <p className={styles.errorBox}>{error}</p> : null}

      {releaseID && assets.length === 0 ? <p className={styles.fansubEditHint}>Keine Videos vorhanden.</p> : null}

      {assets.length > 0 ? (
        <div className={styles.assetList}>
          {assets.map((asset) => (
            <div key={`${asset.release_id}-${asset.theme_id}-${asset.media_id}`} className={styles.assetRow}>
              <div className={styles.assetMeta}>
                <strong>{asset.theme_type_name}{asset.theme_title ? ` - ${asset.theme_title}` : ''}</strong>
                <span>{asset.mime_type} | {Math.round(asset.size_bytes / 1024 / 1024)} MB</span>
                <a href={asset.public_url} target="_blank" rel="noreferrer">Video öffnen</a>
              </div>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={async () => {
                  await deleteAdminReleaseThemeAsset(asset.release_id, asset.theme_id, asset.media_id)
                  await reloadAssets()
                }}
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
