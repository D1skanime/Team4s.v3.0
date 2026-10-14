import { useState } from 'react'
import type { AdminSegmentLibraryCandidate, AdminThemeSegment, AdminThemeSegmentOverrideRequest } from '@/types/admin'
import styles from './SegmenteTab.module.css'

// --- Badge and display helpers ---

// D-01 (176-CONTEXT.md): Badge-Klasse/Label/Farbe/Upper-Spur werden aus der festen,
// DB-gehaltenen Kurzform (theme_types.kuerzel -- Migration 0179) abgeleitet, nicht mehr
// per Name-Guessing (.toUpperCase().includes(...)) auf theme_type_name. Unbekannte/leere
// Kuerzel (z.B. Alt-/Testdaten ohne Migration) fallen auf einen neutralen Default.
export function getTypeBadgeClass(kuerzel: string): string {
  switch (kuerzel) {
    case 'OP':
      return styles.badgeOp
    case 'ED':
      return styles.badgeEd
    case 'IN':
      return styles.badgeIn
    case 'OUT':
      return styles.badgeOut
    default:
      return styles.badgeDefault
  }
}

export function getTypeBadgeLabel(kuerzel: string): string {
  switch (kuerzel) {
    case 'OP':
      return 'OP'
    case 'ED':
      return 'ED'
    case 'IN':
      return 'IN'
    case 'OUT':
      return 'OUT'
    default:
      return kuerzel
  }
}

export function getTypeColor(kuerzel: string): string {
  switch (kuerzel) {
    case 'OP':
      return '#16a34a'
    case 'ED':
      return '#7c3aed'
    case 'IN':
      return '#ea580c'
    case 'OUT':
      return '#6b7280'
    default:
      return '#2563eb'
  }
}

export function isUpperSpur(kuerzel: string): boolean {
  return kuerzel === 'IN' || kuerzel === 'OUT'
}

// --- Time helpers ---

export function parseTimeToSeconds(t: string): number {
  const parts = t.split(':').map(Number)
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  }
  if (parts.length === 2) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  }
  if (parts.length === 1) {
    return parts[0] ?? 0
  }
  return 0
}

export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDuration(startTime: string, endTime: string): string {
  const startSec = parseTimeToSeconds(startTime)
  const endSec = parseTimeToSeconds(endTime)
  const durationSec = endSec - startSec
  if (durationSec <= 0) return `${startTime} - ${endTime}`
  return `${startTime} - ${endTime} (${formatSeconds(durationSec)})`
}

export function parseFlexibleTimeInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/\s+/g, '')
  if (/^\d+$/.test(normalized)) {
    const secondsOnly = Number.parseInt(normalized, 10)
    return Number.isFinite(secondsOnly) && secondsOnly >= 0 ? secondsOnly : null
  }
  // Kurzform: 1m30s, 1m30, 2m
  const minuteForm = /^(\d+)m(\d*)s?$/.exec(normalized)
  if (minuteForm) {
    const mins = Number.parseInt(minuteForm[1] ?? '0', 10)
    const secs = minuteForm[2] ? Number.parseInt(minuteForm[2], 10) : 0
    return Number.isFinite(mins) && Number.isFinite(secs) ? mins * 60 + secs : null
  }
  const parts = normalized.split(':')
  if (parts.length < 1 || parts.length > 3) return null
  const nums = parts.map((part) => Number.parseInt(part, 10))
  if (nums.some((num) => !Number.isFinite(num) || num < 0)) return null
  if (parts.length === 3) return (nums[0] ?? 0) * 3600 + (nums[1] ?? 0) * 60 + (nums[2] ?? 0)
  if (parts.length === 2) return (nums[0] ?? 0) * 60 + (nums[1] ?? 0)
  return nums[0] ?? null
}

export function formatTimeInput(totalSeconds: number, includeMilliseconds = false): string {
  const safe = Math.max(0, totalSeconds)
  // Restore integer DTO milliseconds after division for display, not whole-second adoption.
  const milliseconds = Math.round(safe * 1000) % 1000
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = includeMilliseconds ? Math.floor(safe % 60) : safe % 60
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return includeMilliseconds ? `${clock}.${String(milliseconds).padStart(3, '0')}` : clock
}

export function parsePositiveEpisodeInput(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function formatEpisodeRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return '\u2014'
  if (start === end) return String(start ?? '?')
  return `${start ?? '?'} \u2013 ${end ?? '?'}`
}

// --- Source / provenance helpers ---

export function resolveSourceLabel(segment: AdminThemeSegment): string {
  const provenance = resolveSegmentProvenance(segment)
  if (segment.source_type) {
    switch (segment.source_type) {
      case 'none':
        return 'Keine Quelle'
      case 'jellyfin_theme':
        return segment.source_label ?? 'Serien-Theme'
      case 'release_asset': {
        const filename = segment.source_ref?.split('/').pop()?.trim() || ''
        const label = segment.source_label?.trim() || ''
        const genericLabel =
          label === '' ||
          label.toLowerCase() === 'release-asset' ||
          label.toLowerCase() === 'datei aus release-ordner'

        if (filename && genericLabel) return provenance ? `${provenance}: ${filename}` : `Datei hochgeladen: ${filename}`
        if (filename && label && label !== filename) return provenance ? `${provenance}: ${label} · ${filename}` : `${label} · ${filename}`
        if (filename) return provenance ? `${provenance}: ${filename}` : filename
        if (label && !genericLabel) return provenance ? `${provenance}: ${label}` : label
        return 'Release-Asset (Upload fehlt)'
      }
    }
  }
  if (segment.source_jellyfin_item_id) {
    return 'Serien-Theme'
  }
  return 'Keine Quelle'
}

export function resolveSegmentProvenance(segment: AdminThemeSegment): string | null {
  const attach = segment.library_attach_source?.trim().toLowerCase() || ''
  if (!attach) return null
  if (attach === 'reuse_attach' || attach === 'reimport_rebind') return 'Library-Reuse'
  if (attach === 'local_segment' || attach === 'upload' || attach === 'migrated') return 'Library-Link'
  return 'Library'
}

export function resolveSegmentProvenanceDetails(segment: AdminThemeSegment): string | null {
  if (!segment.library_anime_source_provider || !segment.library_anime_source_external_id) {
    return null
  }
  const bits = [`${segment.library_anime_source_provider}:${segment.library_anime_source_external_id}`]
  if (segment.library_segment_kind) bits.push(segment.library_segment_kind.toUpperCase())
  if (segment.library_segment_name?.trim()) bits.push(segment.library_segment_name.trim())
  return bits.join(' · ')
}

export function resolveLibraryCandidateLabel(candidate: AdminSegmentLibraryCandidate): string {
  const filename = candidate.source_ref.split('/').pop()?.trim() || ''
  const label = candidate.source_label?.trim() || ''
  if (label && filename && label !== filename) return `${label} · ${filename}`
  return label || filename || 'Library-Asset'
}

// --- Episode active check ---

export function isSegmentActiveForEpisode(segment: AdminThemeSegment, episodeNumber: number): boolean {
  const start = segment.start_episode
  const end = segment.end_episode
  if (start == null && end == null) return true
  if (start != null && end == null) return episodeNumber >= start
  if (start == null && end != null) return episodeNumber <= end
  return episodeNumber >= (start ?? 0) && episodeNumber <= (end ?? Infinity)
}

// --- Zuweisungs-/Freigabe-Helfer (geteilte Segmente, Plan 117-07) ---

/**
 * Prüft, ob die aktuell im Editor geöffnete Release-Version diesem (potenziell
 * geteilten) Segment zugewiesen ist. Ergänzt `isSegmentActiveForEpisode` für den
 * neuen, zuweisungsbasierten Fall (statt reiner Episoden-Bereichsprüfung).
 */
export function isCurrentEpisodeAssigned(
  segment: AdminThemeSegment,
  currentReleaseVersionId: number | null,
): boolean {
  if (currentReleaseVersionId == null) return false
  return (segment.assigned_release_version_ids ?? []).includes(currentReleaseVersionId)
}

/**
 * Reiner Lookup der ECHTEN, sichtbaren Episodennummer einer Zuweisung. Liefert
 * `null`, wenn `assigned_episodes` fehlt oder kein Treffer existiert — keine
 * Herleitung, keine Netzwerk-Anfrage.
 */
export function findAssignedEpisodeNumber(segment: AdminThemeSegment, releaseVersionId: number): string | null {
  const entry = (segment.assigned_episodes ?? []).find((e) => e.release_version_id === releaseVersionId)
  return entry?.episode_number ?? null
}

/**
 * Reiner PRO-FOLGE-Lookup, ob GENAU diese Zuweisung (releaseVersionId) einen Zeit-Override hat.
 * Quick-Task 260819-lm5, Runde 5 Korrektheits-Fix: das segmentweite
 * `segment.has_episode_override` ist bereits true, sobald IRGENDEINE zugewiesene Folge einen
 * Override hat -- fuer den "verschoben"-Chip EINER konkreten Folge ist ausschliesslich dieser
 * PRO-FOLGE-Wert korrekt (sonst zeigt jede Folge faelschlich "verschoben"). Liefert `false`, wenn
 * `assigned_episodes` fehlt oder kein Treffer existiert.
 */
export function findAssignedEpisodeHasOverride(segment: AdminThemeSegment, releaseVersionId: number): boolean {
  const entry = (segment.assigned_episodes ?? []).find((e) => e.release_version_id === releaseVersionId)
  return entry?.has_override ?? false
}

export function findAssignedEpisodeOverrideStartTime(segment: AdminThemeSegment, releaseVersionId: number): string | null {
  const entry = (segment.assigned_episodes ?? []).find((e) => e.release_version_id === releaseVersionId)
  return entry?.has_override ? entry.override_start_time ?? null : null
}

/**
 * Formatiert das Zuweisungs-Chip-Label. `episodeNumber` MUSS die ECHTE,
 * sichtbare Episodennummer sein (z. B. aus `findAssignedEpisodeNumber`),
 * NIEMALS die interne `release_version_id` (B3-Fix).
 */
export function formatAssignmentChipLabel(episodeNumber: string, hasOverride: boolean): string {
  return hasOverride ? `Folge ${episodeNumber} · verschoben` : `Folge ${episodeNumber}`
}

// --- Zeit-Override Speichern/Entfernen-Handler (Plan 117-06) ---

interface UseSegmentOverrideHandlersOptions {
  editingSegment: AdminThemeSegment | null
  releaseVariantId: number | null
  setSegmentOverride: (
    segmentId: number,
    releaseVersionId: number,
    input: AdminThemeSegmentOverrideRequest,
  ) => Promise<AdminThemeSegment | null>
  removeSegmentOverride: (segmentId: number, releaseVersionId: number) => Promise<boolean>
}

/**
 * Kapselt isSavingOverride/overrideError-State + Save-/Remove-Handler fuer den Per-Folge
 * Zeit-Override-Block (UI-SPEC Surface 1) außerhalb von SegmenteTab.tsx, damit die
 * Verdrahtung die Datei nicht ueber die 800-Zeilen-Toleranzgrenze wachsen laesst.
 */
export function useSegmentOverrideHandlers({
  editingSegment,
  releaseVariantId,
  setSegmentOverride,
  removeSegmentOverride,
}: UseSegmentOverrideHandlersOptions) {
  const [isSavingOverride, setIsSavingOverride] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  async function handleSaveOverride(input: { startTime: string; endTime: string }) {
    if (!editingSegment || releaseVariantId == null) return false
    setIsSavingOverride(true)
    setOverrideError(null)
    const result = await setSegmentOverride(editingSegment.id, releaseVariantId, {
      start_time: input.startTime,
      end_time: input.endTime,
    })
    if (!result) {
      setOverrideError('Zeit-Override konnte nicht gespeichert werden. Bitte erneut versuchen.')
    }
    setIsSavingOverride(false)
    return result != null
  }

  async function handleRemoveOverride() {
    if (!editingSegment || releaseVariantId == null) return
    setIsSavingOverride(true)
    setOverrideError(null)
    const success = await removeSegmentOverride(editingSegment.id, releaseVariantId)
    if (!success) {
      setOverrideError('Override konnte nicht entfernt werden.')
    }
    setIsSavingOverride(false)
  }

  function resetOverrideError() {
    setOverrideError(null)
  }

  return { isSavingOverride, overrideError, handleSaveOverride, handleRemoveOverride, resetOverrideError }
}

// --- Timeline sub-component ---

interface SegmentTimelineProps {
  segments: AdminThemeSegment[]
  totalDurationSeconds?: number | null
}

export function SegmentTimeline({ segments, totalDurationSeconds }: SegmentTimelineProps) {
  const timedSegments = segments.filter((s) => s.start_time && s.end_time)
  const untimedSegments = segments.filter((s) => !s.start_time || !s.end_time)
  if (timedSegments.length === 0) {
    return (
      <>
        <p className={styles.emptyState}>Keine Zeitbereiche für Timeline verfügbar.</p>
        {untimedSegments.length > 0 ? <UntimedSegmentList segments={untimedSegments} /> : null}
      </>
    )
  }

  const segmentMaxEnd = Math.max(...timedSegments.map((s) => parseTimeToSeconds(s.end_time!)))
  const maxEnd =
    totalDurationSeconds != null && totalDurationSeconds > segmentMaxEnd
      ? totalDurationSeconds
      : segmentMaxEnd
  const upperSegments = timedSegments.filter((s) => isUpperSpur(s.theme_type_kuerzel))
  const lowerSegments = timedSegments.filter((s) => !isUpperSpur(s.theme_type_kuerzel))

  const opSegments = lowerSegments.filter((s) => s.theme_type_kuerzel === 'OP')
  const edSegments = lowerSegments.filter((s) => s.theme_type_kuerzel === 'ED')
  const opMaxEnd = opSegments.length > 0 ? Math.max(...opSegments.map((s) => parseTimeToSeconds(s.end_time!))) : null
  const edMinStart = edSegments.length > 0 ? Math.min(...edSegments.map((s) => parseTimeToSeconds(s.start_time!))) : null

  function renderBlock(segment: AdminThemeSegment) {
    const startSec = parseTimeToSeconds(segment.start_time!)
    const endSec = parseTimeToSeconds(segment.end_time!)
    const leftPct = maxEnd > 0 ? (startSec / maxEnd) * 100 : 0
    const widthPct = Math.max(2, ((endSec - startSec) / maxEnd) * 100)
    const color = getTypeColor(segment.theme_type_kuerzel)
    return (
      <div
        key={segment.id}
        className={styles.timelineBlock}
        style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }}
        title={`${segment.theme_type_name}: ${segment.start_time} \u2013 ${segment.end_time}`}
      >
        {getTypeBadgeLabel(segment.theme_type_kuerzel)}
      </div>
    )
  }

  return (
    <>
      <div className={styles.timelineLabels}>
        <span>00:00:00</span>
        <span>{formatSeconds(maxEnd)}</span>
      </div>

      {upperSegments.length > 0 ? (
        <div className={styles.timelineSpurLabel}>Einfueger / PV</div>
      ) : null}
      {upperSegments.length > 0 ? (
        <div className={styles.timelineTrack} style={{ marginBottom: 6 }}>
          {upperSegments.map(renderBlock)}
        </div>
      ) : null}

      <div className={styles.timelineSpurLabel}>OP / ED</div>
      <div className={styles.timelineTrack}>
        {lowerSegments.map(renderBlock)}
        {opMaxEnd != null && edMinStart != null && edMinStart > opMaxEnd ? (
          <div
            className={styles.timelineMainContent}
            style={{
              left: `${(opMaxEnd / maxEnd) * 100}%`,
              width: `${((edMinStart - opMaxEnd) / maxEnd) * 100}%`,
            }}
          >
            Hauptinhalt
          </div>
        ) : null}
      </div>
      {untimedSegments.length > 0 ? <UntimedSegmentList segments={untimedSegments} /> : null}
    </>
  )
}

interface UntimedSegmentListProps {
  segments: AdminThemeSegment[]
}

function UntimedSegmentList({ segments }: UntimedSegmentListProps) {
  return (
    <div className={styles.timelineUntimedList} aria-label="Segmente ohne Zeitbereich">
      <span className={styles.timelineUntimedLabel}>Ohne Zeitbereich</span>
      {segments.map((segment) => (
        <span
          key={segment.id}
          className={styles.timelineUntimedChip}
          style={{ borderColor: getTypeColor(segment.theme_type_kuerzel), color: getTypeColor(segment.theme_type_kuerzel) }}
          title={`${segment.theme_type_name}: Start/Ende fehlen`}
        >
          {getTypeBadgeLabel(segment.theme_type_kuerzel)}
          {segment.theme_title?.trim() ? ` · ${segment.theme_title.trim()}` : ''}
        </span>
      ))}
    </div>
  )
}
