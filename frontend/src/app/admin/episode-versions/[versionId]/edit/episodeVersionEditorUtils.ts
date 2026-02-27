import { ApiError } from '@/lib/api'
import { EpisodeVersionEditorContext, EpisodeVersionMediaFile, SubtitleType } from '@/types/episodeVersion'
import { FansubGroupSummary } from '@/types/fansub'

export interface FormState {
  title: string
  mediaProvider: string
  mediaItemID: string
  videoQuality: string
  subtitleType: '' | SubtitleType
  releaseDate: string
  streamURL: string
}

export function parsePositiveInt(raw: string): number | null {
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

export function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const day = `${parsed.getDate()}`.padStart(2, '0')
  const hour = `${parsed.getHours()}`.padStart(2, '0')
  const minute = `${parsed.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'n/a'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'n/a'
  return parsed.toLocaleString('de-DE')
}

export function formatBytes(value?: number | null): string {
  if (!value || value <= 0) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 100 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function padEpisodeNumber(value: number): string {
  return String(value).padStart(3, '0')
}

export function buildInitialFormState(context: EpisodeVersionEditorContext): FormState {
  return {
    title: context.version.title || '',
    mediaProvider: context.version.media_provider || '',
    mediaItemID: context.version.media_item_id || '',
    videoQuality: context.version.video_quality || '',
    subtitleType: context.version.subtitle_type || '',
    releaseDate: toDateTimeLocalValue(context.version.release_date),
    streamURL: context.version.stream_url || '',
  }
}

export function buildFallbackMediaFile(context: EpisodeVersionEditorContext): EpisodeVersionMediaFile | null {
  const itemID = context.version.media_item_id?.trim()
  if (!itemID) return null

  return {
    file_name: context.version.title || itemID,
    path: context.anime_folder_path || '',
    media_item_id: itemID,
    stream_url: context.version.stream_url || null,
    video_quality: context.version.video_quality || null,
    detected_episode_number: context.version.episode_number,
    release_name: context.version.title || null,
  }
}

export function buildSnapshot(formState: FormState, selectedGroups: FansubGroupSummary[]): string {
  return JSON.stringify({
    title: normalizeOptional(formState.title),
    mediaProvider: formState.mediaProvider.trim(),
    mediaItemID: formState.mediaItemID.trim(),
    videoQuality: normalizeOptional(formState.videoQuality),
    subtitleType: formState.subtitleType || null,
    releaseDate: fromDateTimeLocalValue(formState.releaseDate),
    streamURL: normalizeOptional(formState.streamURL),
    selectedGroupIDs: selectedGroups.map((group) => group.id).sort((left, right) => left - right),
  })
}

export function buildCollaborationName(selectedGroups: FansubGroupSummary[]): string {
  const parts = selectedGroups.map((group) => group.name.trim()).filter(Boolean)
  const label = `Kollaboration: ${parts.join(' + ')}`
  return label.length <= 120 ? label : `${label.slice(0, 117).trim()}...`
}

export function buildCollaborationSlug(selectedGroups: FansubGroupSummary[], versionID: number): string {
  const parts = selectedGroups.map((group) => sanitizeSlugPart(group.slug || group.name)).slice(0, 4)
  return ['collab', ...parts, `${versionID}-${Date.now().toString(36)}`].join('-').slice(0, 120)
}

function sanitizeSlugPart(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'group'
}
