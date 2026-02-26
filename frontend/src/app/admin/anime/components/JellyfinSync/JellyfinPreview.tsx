import { AdminAnimeJellyfinPreviewResult } from '@/types/admin'

import styles from '../../../admin.module.css'

interface JellyfinPreviewProps {
  preview: AdminAnimeJellyfinPreviewResult | null
}

export function JellyfinPreview({ preview }: JellyfinPreviewProps) {
  if (!preview) {
    return null
  }

  return (
    <>
      <p className={styles.hint}>
        Preview: {preview.jellyfin_series_name} | Pfad: {preview.jellyfin_series_path || '(unbekannt)'} | Episode-Treffer:{' '}
        {preview.matched_episodes}/{preview.scanned_episodes} | Pfad-gefiltert: {preview.path_filtered_episodes} | Eindeutig
        akzeptiert: {preview.accepted_unique_episodes} | Bestehende Jellyfin-Versionen: {preview.existing_jellyfin_versions}
      </p>
      {preview.mismatch_detected && preview.mismatch_reason ? (
        <p className={styles.hintWarning}>Guard-Hinweis: {preview.mismatch_reason}</p>
      ) : null}
      <pre className={styles.resultBox}>{JSON.stringify(preview, null, 2)}</pre>
    </>
  )
}