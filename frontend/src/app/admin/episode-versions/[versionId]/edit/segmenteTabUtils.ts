import type { AdminThemeSegment } from '@/types/admin'

export function getTypeBadgeLabel(typeName: string): string {
  const upper = typeName.toUpperCase()
  if (upper.includes('OP')) return 'OP'
  if (upper.includes('ED')) return 'ED'
  if (upper.includes('INSERT') || (upper.includes('IN') && !upper.includes('INTRO'))) return 'IN'
  if (upper.includes('OUTRO') || upper.includes('PV')) return 'PV'
  return typeName
}

export function parseTimeToSeconds(t: string): number {
  const parts = t.split(':').map(Number)
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  }
  return 0
}

export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Berechnet Dauer zwischen zwei Zeitstempeln und gibt sie als "(MM:SS)" zurueck.
 * Gibt "(00:00)" zurueck wenn beide gleich sind.
 */
export function calcDuration(startTime: string, endTime: string): string {
  const startSec = parseTimeToSeconds(startTime)
  const endSec = parseTimeToSeconds(endTime)
  const durationSec = endSec - startSec
  if (durationSec <= 0) return `(${formatSeconds(0).slice(3)})`
  return `(${formatSeconds(durationSec).slice(3)})`
}

/**
 * Vollstaendiges Format mit Zeitbereich und Dauer: "00:00:30 - 00:01:45 (01:15)"
 */
export function formatDuration(startTime: string, endTime: string): string {
  const startSec = parseTimeToSeconds(startTime)
  const endSec = parseTimeToSeconds(endTime)
  const durationSec = endSec - startSec
  if (durationSec <= 0) return `${startTime} - ${endTime}`
  return `${startTime} - ${endTime} (${formatSeconds(durationSec)})`
}

export function formatEpisodeRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return '\u2014'
  if (start === end) return String(start ?? '?')
  return `${start ?? '?'} \u2013 ${end ?? '?'}`
}

export function resolveSourceLabel(segment: AdminThemeSegment): string {
  if (segment.source_type) {
    switch (segment.source_type) {
      case 'none': return 'Keine Quelle'
      case 'jellyfin_theme': return segment.source_label ?? 'Jellyfin Serien-Theme'
      case 'release_asset': return segment.source_label ?? 'Release-Asset'
    }
  }
  if (segment.source_jellyfin_item_id) {
    return 'Jellyfin Serien-Theme'
  }
  return 'Keine Quelle'
}

export function isSegmentActiveForEpisode(segment: AdminThemeSegment, episodeNumber: number): boolean {
  const start = segment.start_episode
  const end = segment.end_episode
  if (start == null && end == null) return true
  if (start != null && end == null) return episodeNumber >= start
  if (start == null && end != null) return episodeNumber <= end
  return episodeNumber >= (start ?? 0) && episodeNumber <= (end ?? Infinity)
}
