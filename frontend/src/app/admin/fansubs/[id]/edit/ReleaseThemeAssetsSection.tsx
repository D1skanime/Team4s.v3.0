'use client'

import { useEffect, useState } from 'react'

import {
  deleteAdminReleaseThemeAsset,
  getAdminFansubAnimeThemeAssets,
  uploadAdminReleaseThemeAsset,
} from '@/lib/api'
import { AdminAnimeTheme, AdminReleaseThemeAsset } from '@/types/admin'

import sharedStyles from '../../../admin.module.css'
import opEdStyles from './FansubOpEdSection.module.css'

const styles = { ...sharedStyles, ...opEdStyles }

interface ReleaseThemeAssetsSectionProps {
  fansubID: number
  animeID: number
  authToken: string | null
  themes: AdminAnimeTheme[]
}

export function ReleaseThemeAssetsSection({
  fansubID,
  animeID,
  authToken,
  themes,
}: ReleaseThemeAssetsSectionProps) {
  const [themeID, setThemeID] = useState<number>(themes[0]?.id ?? 0)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [releaseID, setReleaseID] = useState<number | null>(null)
  const [assets, setAssets] = useState<AdminReleaseThemeAsset[]>([])

  useEffect(() => {
    setThemeID(themes[0]?.id ?? 0)
  }, [themes])

  useEffect(() => {
    if (!authToken) return
    let active = true
    getAdminFansubAnimeThemeAssets(fansubID, animeID, authToken)
      .then((response) => {
        if (!active) return
        setReleaseID(response.release_id)
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
  }, [animeID, authToken, fansubID])

  async function reloadAssets() {
    const response = await getAdminFansubAnimeThemeAssets(fansubID, animeID, authToken || undefined)
    setReleaseID(response.release_id)
    setAssets(response.data)
  }

  async function handleUpload() {
    if (!file || !themeID || !authToken) return
    setBusy(true)
    setError(null)
    try {
      const response = await uploadAdminReleaseThemeAsset({
        fansubID,
        animeID,
        themeID,
        file,
        authToken,
        onProgress: setProgress,
      })
      setReleaseID(response.data.release_id)
      await reloadAssets()
      setFile(null)
      setProgress(100)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.uploadForm}>
      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>Theme</span>
          <select className={styles.select} value={themeID} onChange={(event) => setThemeID(Number(event.target.value))}>
            <option value={0}>Bitte waehlen</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.theme_type_name}{theme.title ? ` - ${theme.title}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Video-Datei</span>
          <input type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>

        <div className={styles.progressWrap}>
          <span>Upload</span>
          <progress value={progress} max={100} />
        </div>

        <button type="button" className={styles.button} onClick={() => void handleUpload()} disabled={!file || !themeID || busy || !authToken}>
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
                <a href={asset.public_url} target="_blank" rel="noreferrer">Video oeffnen</a>
              </div>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={async () => {
                  await deleteAdminReleaseThemeAsset(asset.release_id, asset.theme_id, asset.media_id, authToken || undefined)
                  await reloadAssets()
                }}
              >
                Loeschen
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
