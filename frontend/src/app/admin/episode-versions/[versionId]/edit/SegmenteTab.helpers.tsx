import type { AdminSegmentLibraryCandidate, AdminThemeSegment } from '@/types/admin'
import styles from './SegmenteTab.module.css'

// --- Badge and display helpers ---

export function getTypeBadgeClass(typeNameRaw: string): string {
  const typeName = typeNameRaw.toUpperCase()
  if (typeName.includes('OP')) return styles.badgeOp
  if (typeName.includes('ED')) return styles.badgeEd
  if (typeName.includes('INSERT') || typeName.includes('IN')) return styles.badgeIn
  if (typeName.includes('OUTRO') || typeName.includes('PV')) return styles.badgePv
  return styles.badgeDefault
}

export function getTypeBadgeLabel(typeName: string): string {
  const upper = typeName.toUpperCase()
  if (upper.includes('OP')) return 'OP'
  if (upper.includes('ED')) return 'ED'
  if (upper.includes('INSERT') || (upper.includes('IN') && !upper.includes('INTRO'))) return 'IN'
  if (upper.includes('OUTRO')) return 'OUT'
  if (upper.includes('PV')) return 'PV'
  return typeName
}

export function getTypeColor(typeName: string): string {
  const upper = typeName.toUpperCase()
  if (upper.includes('OP')) return '#16a34a'
  if (upper.includes('ED')) return '#7c3aed'
  if (upper.includes('INSERT') || upper.includes('IN')) return '#ea580c'
  if (upper.includes('OUTRO') || upper.includes('PV')) return '#6b7280'
  return '#2563eb'
}

export function isUpperSpur(typeName: string): boolean {
  const upper = typeName.toUpperCase()
  return upper.includes('INSERT') || upper.includes('IN') || upper.includes('PV') || upper.includes('OUTRO')
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

export function formatTimeInput(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
        return segment.source_label ?? 'Jellyfin Serien-Theme'
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
    return 'Jellyfin Serien-Theme'
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

// --- Timeline sub-component ---

interface SegmentTimelineProps {
  segments: AdminThemeSegment[]
  totalDurationSeconds?: number | null
}

export function SegmentTimeline({ segments, totalDurationSeconds }: SegmentTimelineProps) {
  const timedSegments = segments.filter((s) => s.start_time && s.end_time)
  if (timedSegments.length === 0) {
    return <p className={styles.emptyState}>Keine Zeitbereiche fuer Timeline verfuegbar.</p>
  }

  const segmentMaxEnd = Math.max(...timedSegments.map((s) => parseTimeToSeconds(s.end_time!)))
  const maxEnd =
    totalDurationSeconds != null && totalDurationSeconds > segmentMaxEnd
      ? totalDurationSeconds
      : segmentMaxEnd
  const upperSegments = timedSegments.filter((s) => isUpperSpur(s.theme_type_name))
  const lowerSegments = timedSegments.filter((s) => !isUpperSpur(s.theme_type_name))

  const opSegments = lowerSegments.filter((s) => s.theme_type_name.toUpperCase().includes('OP'))
  const edSegments = lowerSegments.filter((s) => s.theme_type_name.toUpperCase().includes('ED'))
  const opMaxEnd = opSegments.length > 0 ? Math.max(...opSegments.map((s) => parseTimeToSeconds(s.end_time!))) : null
  const edMinStart = edSegments.length > 0 ? Math.min(...edSegments.map((s) => parseTimeToSeconds(s.start_time!))) : null

  function renderBlock(segment: AdminThemeSegment) {
    const startSec = parseTimeToSeconds(segment.start_time!)
    const endSec = parseTimeToSeconds(segment.end_time!)
    const leftPct = maxEnd > 0 ? (startSec / maxEnd) * 100 : 0
    const widthPct = Math.max(2, ((endSec - startSec) / maxEnd) * 100)
    const color = getTypeColor(segment.theme_type_name)
    return (
      <div
        key={segment.id}
        className={styles.timelineBlock}
        style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }}
        title={`${segment.theme_type_name}: ${segment.start_time} \u2013 ${segment.end_time}`}
      >
        {getTypeBadgeLabel(segment.theme_type_name)}
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
    </>
  )
}
