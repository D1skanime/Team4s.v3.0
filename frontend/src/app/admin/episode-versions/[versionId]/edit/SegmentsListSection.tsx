'use client'

import { Fragment, useState } from 'react'
import { Pencil, Trash2, Clock, RefreshCw } from 'lucide-react'

import {
  getTypeBadgeClass,
  getTypeBadgeLabel,
  formatDuration,
  formatEpisodeRange,
  resolveSegmentProvenanceDetails,
  resolveSegmentProvenance,
  resolveSourceLabel,
  isSegmentActiveForEpisode,
  SegmentTimeline,
} from './SegmenteTab.helpers'
import { renderStatusLabel } from './SegmenteTab.formHelpers'
import { SegmentAssignmentsRow } from './SegmentAssignmentsRow'
import {
  Badge,
  DisclosureIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { AdminThemeSegment } from '@/types/admin'
import styles from './SegmenteTab.module.css'

interface SegmentsListSectionProps {
  segments: AdminThemeSegment[]
  visibleSegments: AdminThemeSegment[]
  episodeNumber?: number | null
  durationSeconds?: number | null
  suggestions: AdminThemeSegment[]
  suggestionsLoading: boolean
  errorMessage: string | null
  isLoading: boolean
  assignmentBusySegmentId: number | null
  renderingSegmentId: number | null
  releaseVariantId?: number | null
  onAdoptSuggestion: (segment: AdminThemeSegment) => void
  onAssignCurrent: (segment: AdminThemeSegment) => void
  onUnassign: (segment: AdminThemeSegment, releaseVersionId: number) => void
  onRenderSegment: (segment: AdminThemeSegment) => void
  onEditSegment: (segment: AdminThemeSegment) => void
  onDeleteSegment: (segment: AdminThemeSegment) => void
}

/**
 * Vorschlaege-Leiste, Segment-Tabelle und Timeline-Vorschau, aus SegmenteTab.tsx extrahiert
 * (Phase 156, Plan 156-14, Dateigroessen-Vorgabe aus 156-UAT.md). Alle Business-Logik/State
 * bleibt in SegmenteTab.tsx -- diese Komponente bekommt fertige Daten und bereits gebundene
 * Callbacks. Einzige Ausnahme: `openAssignmentsFor` (rein lokales Zuweisungs-Disclosure je
 * Zeile), das ausserhalb der Tabelle nirgends gelesen/geschrieben wird.
 */
export function SegmentsListSection({
  segments,
  visibleSegments,
  episodeNumber,
  durationSeconds,
  suggestions,
  suggestionsLoading,
  errorMessage,
  isLoading,
  assignmentBusySegmentId,
  renderingSegmentId,
  releaseVariantId,
  onAdoptSuggestion,
  onAssignCurrent,
  onUnassign,
  onRenderSegment,
  onEditSegment,
  onDeleteSegment,
}: SegmentsListSectionProps) {
  const [openAssignmentsFor, setOpenAssignmentsFor] = useState<number | null>(null)

  return (
    <>
      {/* Suggestions bar */}
      {suggestionsLoading ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>Vorschläge werden geladen...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className={styles.suggestionsBar}>
          <span className={styles.suggestionsLabel}>
            Vorschläge aus anderen Releases für Episode {episodeNumber}:
          </span>
          <div className={styles.suggestionsList}>
            {suggestions.map((s) => (
              <div key={s.id} className={styles.suggestionItem}>
                <span className={`${styles.badge} ${getTypeBadgeClass(s.theme_type_name)}`}>
                  {getTypeBadgeLabel(s.theme_type_name)}
                </span>
                <span className={styles.suggestionMeta}>
                  {s.theme_title?.trim() ? `${s.theme_title} · ` : ''}
                  {formatEpisodeRange(s.start_episode, s.end_episode)}
                  {s.start_time && s.end_time ? ` · ${formatDuration(s.start_time, s.end_time)}` : ''}
                </span>
                <button
                  type="button"
                  className={styles.suggestionAdoptButton}
                  onClick={() => onAdoptSuggestion(s)}
                >
                  Übernehmen
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Error from hook */}
      {errorMessage ? <div className={styles.panelError}>{errorMessage}</div> : null}

      {/* Table */}
      {isLoading ? (
        <p className={styles.emptyState}>Lade Segmente...</p>
      ) : (
        <Table
          className={styles.table}
          containerClassName={styles.tableWrapper}
          variant="withActions"
        >
          <TableHead className={styles.tableHeader}>
            <TableRow>
              <TableHeaderCell>Typ</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Episoden</TableHeaderCell>
              <TableHeaderCell>Zeitbereich</TableHeaderCell>
              <TableHeaderCell>Quelle</TableHeaderCell>
              <TableHeaderCell>Aktionen</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleSegments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={styles.emptyState}>
                    {episodeNumber != null && segments.length > 0
                      ? `Kein Segment deckt Episode ${episodeNumber} ab. Andere Folgen können eigene Segmente haben.`
                      : 'Noch keine Segmente vorhanden. Klicke „Segment hinzufügen", um zu beginnen.'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleSegments.map((segment) => {
                  const isActive = episodeNumber != null && isSegmentActiveForEpisode(segment, episodeNumber)
                  const assignmentsOpen = openAssignmentsFor === segment.id
                  return (
                    <Fragment key={segment.id}>
                    <TableRow
                      className={`${styles.tableRow} ${isActive ? styles.tableRowActive : ''}`}
                    >
                      <TableCell data-label="Typ">
                        <span className={`${styles.badge} ${getTypeBadgeClass(segment.theme_type_name)}`}>
                          {getTypeBadgeLabel(segment.theme_type_name)}
                        </span>
                      </TableCell>
                      <TableCell data-label="Name" style={{ fontSize: 13, color: '#6b6b70' }}>
                        {segment.theme_title?.trim() || '—'}
                      </TableCell>
                      <TableCell data-label="Episoden">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {segment.is_shared ? <Badge variant="info">Geteiltes Segment</Badge> : null}
                          {segment.is_shared && segment.has_episode_override ? (
                            <Badge variant="warning">Zeit hier überschrieben</Badge>
                          ) : null}
                          <span>{formatEpisodeRange(segment.start_episode, segment.end_episode)}</span>
                          <button
                            type="button"
                            className={styles.actionButton}
                            aria-label="Zugewiesene Folgen anzeigen/ausblenden"
                            onClick={() =>
                              setOpenAssignmentsFor(openAssignmentsFor === segment.id ? null : segment.id)
                            }
                          >
                            <DisclosureIndicator open={assignmentsOpen} variant="button" size="sm" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell data-label="Zeitbereich" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {segment.start_time && segment.end_time
                          ? formatDuration(segment.start_time, segment.end_time)
                          : '—'}
                      </TableCell>
                      <TableCell data-label="Quelle" style={{ fontSize: 13, color: '#6b6b70' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          {segment.playback_source_kind ? (
                            <span>
                              {segment.playback_source_label ?? (
                                segment.playback_source_kind === 'episode_version'
                                  ? 'Episode-Version / Jellyfin-Stream'
                                  : segment.playback_source_kind === 'uploaded_asset'
                                    ? 'hochgeladener Fallback'
                                    : segment.playback_source_kind === 'jellyfin_theme'
                                      ? 'Jellyfin Serien-Theme'
                                      : segment.playback_source_kind
                              )}
                            </span>
                          ) : (
                            <span>{resolveSourceLabel(segment)}</span>
                          )}
                          {resolveSegmentProvenance(segment) ? (
                            <span style={{ fontSize: 11, color: '#8a8a93' }}>
                              {resolveSegmentProvenance(segment)}
                              {resolveSegmentProvenanceDetails(segment) ? ` · ${resolveSegmentProvenanceDetails(segment)}` : ''}
                            </span>
                          ) : null}
                          <span className={styles.renderStatus}>
                            {renderStatusLabel(segment)}
                            {segment.render_error_message ? ` · ${segment.render_error_message}` : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Aktionen">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {segment.playback_source_kind && segment.playback_source_kind !== 'uploaded_asset' && segment.render_status !== 'ready' ? (
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Segment vorbereiten"
                              disabled={
                                renderingSegmentId === segment.id ||
                                segment.render_status === 'queued' ||
                                segment.render_status === 'rendering'
                              }
                              onClick={() => onRenderSegment(segment)}
                            >
                              <RefreshCw size={14} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={styles.actionButton}
                            title="Bearbeiten"
                            onClick={() => onEditSegment(segment)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                            title="Segment löschen"
                            aria-label="Segment löschen"
                            onClick={() => onDeleteSegment(segment)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {assignmentsOpen ? (
                      <TableRow className={styles.tableRow}>
                        <TableCell colSpan={6}>
                          <SegmentAssignmentsRow
                            segment={segment}
                            currentReleaseVersionId={releaseVariantId ?? null}
                            currentEpisodeNumber={episodeNumber ?? null}
                            onAssignCurrent={() => onAssignCurrent(segment)}
                            onUnassign={(id) => onUnassign(segment, id)}
                            isBusy={assignmentBusySegmentId === segment.id}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                    </Fragment>
                  )
                })
              )}
          </TableBody>
        </Table>
      )}

      {/* Timeline */}
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeader}>
          <Clock size={14} />
          Timeline Vorschau
          {durationSeconds == null && visibleSegments.some((s) => s.playback_duration_seconds != null) ? (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#8a8a93' }}>(Laufzeit aus Playback-Metadaten)</span>
          ) : durationSeconds == null ? (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#8a8a93' }}>(Keine reale Laufzeit bekannt)</span>
          ) : null}
        </div>
        <SegmentTimeline
          segments={visibleSegments}
          totalDurationSeconds={
            durationSeconds ??
            visibleSegments.reduce<number | null>((max, s) => {
              const d = s.playback_duration_seconds
              if (d == null) return max
              return max == null ? d : Math.max(max, d)
            }, null)
          }
        />
      </div>
    </>
  )
}
