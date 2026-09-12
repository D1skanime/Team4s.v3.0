import type { AdminThemeSegment } from '@/types/admin'
import type { FormState } from './SegmentEditPanel'
import { parseFlexibleTimeInput, parsePositiveEpisodeInput } from './SegmenteTab.helpers'

/**
 * Reine, seiteneffektfreie Konstanten/Helfer aus SegmenteTab.tsx extrahiert (Phase 156,
 * Plan 156-14, Dateigroessen-Vorgabe aus 156-UAT.md). Keine JSX, kein React-State.
 */

export const EMPTY_FORM: FormState = {
  themeKind: '',
  themeTitle: '',
  startEpisode: '',
  endEpisode: '',
  startTime: '',
  endTime: '',
  sourceType: 'none',
  sourceRef: '',
  sourceLabel: '',
}

export const MAX_SEGMENT_WINDOW_SECONDS = 240
export const DEFAULT_SEGMENT_END_SECONDS = 80

export function getDefaultSegmentEndSeconds(durationSeconds?: number | null): number {
  if (durationSeconds != null && Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Math.min(Math.floor(durationSeconds), DEFAULT_SEGMENT_END_SECONDS)
  }
  return DEFAULT_SEGMENT_END_SECONDS
}

export function segmentFormFromExisting(segment: AdminThemeSegment): FormState {
  return {
    themeKind:
      segment.theme_type_name.toUpperCase().includes('OP')
        ? 'op'
        : segment.theme_type_name.toUpperCase().includes('ED')
          ? 'ed'
          : segment.theme_type_name.toUpperCase().includes('INSERT')
            ? 'insert'
            : segment.theme_type_name.toUpperCase().includes('OUTRO')
              ? 'outro'
              : '',
    themeTitle: segment.theme_title ?? '',
    startEpisode: segment.start_episode != null ? String(segment.start_episode) : '',
    endEpisode: segment.end_episode != null ? String(segment.end_episode) : '',
    startTime: segment.start_time ?? '',
    endTime: segment.end_time ?? '',
    sourceType: segment.source_type ?? (segment.source_jellyfin_item_id ? 'jellyfin_theme' : 'none'),
    sourceRef: segment.source_ref ?? segment.source_jellyfin_item_id ?? '',
    sourceLabel: segment.source_label ?? '',
  }
}

export function buildSegmentPreviewStreamHref(
  segment: AdminThemeSegment | null,
  releaseVersionId?: number | null,
): string | null {
  if (!segment?.id) return null
  const params = new URLSearchParams()
  if (segment.render_cache_key) params.set('cache_key', segment.render_cache_key)
  // Die Next.js-Stream-Route verlangt release_version_id (sonst 400) -- gleiche
  // release-version-scoped Aufloesung wie beim Render.
  if (releaseVersionId != null) params.set('release_version_id', String(releaseVersionId))
  if (segment.playback_source_kind === 'uploaded_asset') {
    return `/api/segments/${segment.id}/stream${params.size > 0 ? `?${params.toString()}` : ''}`
  }
  if (segment.render_status !== 'ready') return null
  return `/api/segments/${segment.id}/stream${params.size > 0 ? `?${params.toString()}` : ''}`
}

export function renderStatusLabel(segment: AdminThemeSegment): string {
  if (segment.playback_source_kind === 'uploaded_asset') return 'Fallback-Datei'
  switch (segment.render_status) {
    case 'ready':
      return 'Bereit'
    case 'queued':
    case 'rendering':
      return 'Wird vorbereitet'
    case 'failed':
      return 'Fehlgeschlagen'
    case 'stale':
      return 'Veraltet'
    default:
      return 'Nicht vorbereitet'
  }
}

export type SegmentFormValidationResult =
  | { error: string }
  | { parsedStartEpisode: number; parsedEndEpisode: number; parsedStart: number | null; parsedEnd: number | null }

/**
 * Reine Validierung/Normalisierung des Episoden- und Zeitbereichs vor dem Speichern, aus
 * `handleSave` extrahiert. Gleiche Reihenfolge, gleiche Meldungen, gleiches Verhalten --
 * nur relokiert, damit SegmenteTab.tsx die Dateigroessen-Grenze einhaelt.
 */
export function validateSegmentFormInput(
  formState: FormState,
  editingSegment: AdminThemeSegment | null,
  durationSeconds: number | null | undefined,
): SegmentFormValidationResult {
  if (!formState.startEpisode.trim() || !formState.endEpisode.trim()) {
    return { error: 'Bitte den Episodenbereich vollständig ausfüllen.' }
  }
  const parsedStartEpisode = parsePositiveEpisodeInput(formState.startEpisode)
  const parsedEndEpisode = parsePositiveEpisodeInput(formState.endEpisode)
  if (parsedStartEpisode == null || parsedEndEpisode == null) {
    return { error: 'Episoden müssen positive ganze Zahlen sein.' }
  }
  if (parsedEndEpisode < parsedStartEpisode) {
    return { error: 'Bis muss größer oder gleich Von sein.' }
  }
  if (!formState.startTime.trim() || !formState.endTime.trim()) {
    return { error: 'Bitte den Zeitbereich vollständig ausfüllen.' }
  }
  const parsedStart = formState.startTime.trim() ? parseFlexibleTimeInput(formState.startTime) : null
  if (formState.startTime.trim() && parsedStart == null) {
    return { error: 'Start-Zeit ist ungültig. Erlaubt sind z. B. 1:20 oder 00:01:20.' }
  }
  let parsedEnd = formState.endTime.trim() ? parseFlexibleTimeInput(formState.endTime) : null
  if (formState.endTime.trim() && parsedEnd == null) {
    return { error: 'End-Zeit ist ungültig. Erlaubt sind z. B. 1:20 oder 00:01:20.' }
  }
  // Use segment's resolved playback duration as primary authority; fall back to page-level duration
  const effectiveDuration = editingSegment?.playback_duration_seconds ?? durationSeconds ?? null
  if (effectiveDuration != null && parsedEnd != null) {
    parsedEnd = Math.min(parsedEnd, effectiveDuration)
  }
  if (parsedStart != null && parsedEnd != null && parsedEnd <= parsedStart) {
    return { error: 'Ende muss nach dem Start liegen.' }
  }
  if (parsedStart != null && parsedEnd != null && parsedEnd - parsedStart > MAX_SEGMENT_WINDOW_SECONDS) {
    return { error: 'Segment-Zeitbereich darf maximal 4 Minuten lang sein.' }
  }
  return { parsedStartEpisode, parsedEndEpisode, parsedStart, parsedEnd }
}
