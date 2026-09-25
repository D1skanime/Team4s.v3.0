'use client'

import { FileVideo } from 'lucide-react'

import type { AdminThemeSegment } from '@/types/admin'
import { formatTimeInput } from './SegmenteTab.helpers'
import styles from './SegmenteTab.module.css'

interface SegmentPlaybackPreviewSectionProps {
  editingSegment: AdminThemeSegment | null
  previewStreamHref: string | null
  renderStatus: string
}

/**
 * Zeigt die aufgeloeste Standard-Playback-Quelle plus die Segmentstream-Vorschau. Aus
 * SegmentEditPanel.tsx extrahiert (Phase 156, Plan 156-14, Dateigroessen-Vorgabe aus
 * 156-UAT.md) -- rein lesende Anzeige, keine eigene Logik.
 */
export function SegmentPlaybackPreviewSection({
  editingSegment,
  previewStreamHref,
  renderStatus,
}: SegmentPlaybackPreviewSectionProps) {
  return (
    <>
      {editingSegment?.playback_source_kind ? (
        <div className={styles.panelField}>
          <label>Aktive Playback-Quelle (Standard)</label>
          <div style={{ padding: '8px 10px', background: '#f0f4ff', borderRadius: 8, fontSize: 13, color: '#2a2a3a' }}>
            {editingSegment.playback_source_label ?? (
              editingSegment.playback_source_kind === 'episode_version'
                ? 'Episode-Version / Stream (Standard)'
                : editingSegment.playback_source_kind === 'uploaded_asset'
                  ? 'hochgeladener Fallback'
                  : editingSegment.playback_source_kind === 'jellyfin_theme'
                    ? 'Serien-Theme'
                    : editingSegment.playback_source_kind
            )}
            {editingSegment.playback_duration_seconds != null ? (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#6b6b70' }}>
                Laufzeit: {formatTimeInput(editingSegment.playback_duration_seconds)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {editingSegment ? (
        <div className={styles.previewSection}>
          <div className={styles.assetSectionHeader}>
            <FileVideo size={14} />
            Segment-Vorschau
          </div>
          {previewStreamHref ? (
            <video
              key={previewStreamHref}
              className={styles.previewVideo}
              src={previewStreamHref}
              controls
              preload="metadata"
            />
          ) : (
            <div className={styles.previewStatus}>{renderStatus}</div>
          )}
          <p className={styles.sourceHelpText}>
            {previewStreamHref
              ? 'Spielt den serverseitig vorbereiteten Segmentstream ab.'
              : editingSegment.render_error_message || 'Der Segmentstream ist noch nicht bereit.'}
          </p>
        </div>
      ) : null}
    </>
  )
}
