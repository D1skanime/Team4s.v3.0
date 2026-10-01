/**
 * ReleaseVersionMediaSection.helpers.tsx
 * Reine Konstanten und Utilities für ReleaseVersionMediaSection — kein State, keine Hooks, kein JSX.
 */

import { UploadQueueItem } from './useReleaseVersionMedia'
import type { AdminThemeSegment } from '@/types/admin'
import {
  ReleaseVersionAdminStoryItem,
  ReleaseVersionKaraStoryItem,
  ReleaseVersionMediaCategory,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
} from '@/types/releaseVersionMedia'
import { ReplaceReleaseVersionMediaFileOptions } from '@/lib/api'
import styles from './ReleaseVersionMediaSection.module.css'

// ─── Kategorie-Optionen (Surface 4, D-08) ───────────────────────────────────

export function storyItemKey(item: ReleaseVersionAdminStoryItem): string {
  return item.type === 'media' ? 'media:' + item.media.id : 'kara:' + item.segment.id
}

export function moveStoryItem(
  items: ReleaseVersionAdminStoryItem[],
  fromIndex: number,
  toIndex: number,
): ReleaseVersionAdminStoryItem[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) {
    return items
  }
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next.map((item, index) => ({ ...item, sort_order: (index + 1) * 10 }))
}

export function sortStoryItems(items: ReleaseVersionAdminStoryItem[]): ReleaseVersionAdminStoryItem[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || storyItemKey(a).localeCompare(storyItemKey(b)))
}

export function buildStoryReorderRequest(items: ReleaseVersionAdminStoryItem[]) {
  return {
    items: sortStoryItems(items).map((item, index) =>
      item.type === 'media'
        ? { type: 'media' as const, media_id: item.media.id, sort_order: (index + 1) * 10 }
        : { type: 'kara' as const, theme_segment_id: item.segment.id, sort_order: (index + 1) * 10 },
    ),
  }
}

export function getKaraCategoryLabel(segment: AdminThemeSegment): string {
  const normalized = segment.theme_type_name.trim().toLocaleLowerCase()
  if (normalized.includes('op')) return 'Opening'
  if (normalized.includes('ed')) return 'Ending'
  if (normalized.includes('insert')) return 'Insert'
  if (normalized.includes('outro')) return 'Outro'
  return segment.theme_type_name.trim() || 'Kara'
}

export function formatKaraDuration(segment: AdminThemeSegment): string | null {
  if (!segment.start_time || !segment.end_time) return null
  return segment.start_time + '–' + segment.end_time
}

export function formatKaraEpisodeHint(segment: AdminThemeSegment): string | null {
  const assigned = segment.assigned_episodes?.map((episode) => episode.episode_number).filter(Boolean)
  if (assigned && assigned.length > 0) return 'Folge ' + [...new Set(assigned)].join(', ')
  if (segment.start_episode != null || segment.end_episode != null) {
    return 'Folge ' + (segment.start_episode ?? '—') + '–' + (segment.end_episode ?? '—')
  }
  return null
}

export function getKaraStatusLabel(segment: AdminThemeSegment): string {
  if (segment.render_status === 'ready') return 'Erzeugt'
  if (segment.render_status === 'queued' || segment.render_status === 'rendering') return 'Wird vorbereitet'
  if (segment.render_status === 'failed' || segment.render_status === 'stale') return 'Nicht bereit'
  if (segment.source_type === 'release_asset' && segment.source_ref) return 'Asset hinterlegt'
  return 'Quelle offen'
}

export function createKaraStoryItem(
  segment: AdminThemeSegment,
  mediaItems: ReleaseVersionMediaItem[],
  sortOrder: number,
): ReleaseVersionKaraStoryItem {
  const fallback =
    mediaItems.find((item) => item.is_preview_candidate && item.thumbnail_url) ??
    mediaItems.find((item) => item.thumbnail_url)
  return {
    type: 'kara',
    segment,
    sort_order: sortOrder,
    thumbnail_url: fallback?.thumbnail_url ?? null,
    thumbnail_is_fallback: Boolean(fallback),
  }
}

export const CATEGORY_OPTIONS = [
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'typesetting_karaoke', label: 'Typesetting / Karaoke' },
  { value: 'fun_outtake', label: 'Fun / Outtake' },
  { value: 'other', label: 'Sonstiges' },
] as const

// ─── Upload-Queue Hilfsfunktionen ────────────────────────────────────────────

export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function buildLocalPreviewURL(file: File): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null
  }
  return URL.createObjectURL(file)
}

export function statusLabel(item: UploadQueueItem): string {
  switch (item.status) {
    case 'uploading':
      return `hochladen... ${item.progress}%`
    case 'processing':
      return 'verarbeiten...'
    case 'ready':
      return 'Fertig'
    case 'failed':
      return 'Fehler'
    default:
      return 'Bereit'
  }
}

export function statusClassName(item: UploadQueueItem): string {
  switch (item.status) {
    case 'uploading':
      return styles.uploading
    case 'processing':
      return styles.processing
    case 'ready':
      return styles.ready
    case 'failed':
      return styles.failed
    default:
      return styles.idle
  }
}

export function isTerminalStatus(status: UploadQueueItem['status']): boolean {
  return status === 'ready' || status === 'failed'
}

// ─── replaceItem Argument-Mapping (Phase 144) ───────────────────────────────

/** Baut das FormData-Argument für replaceReleaseVersionMediaFile aus dem Hook-Zustand. */
export function buildReplaceMediaFileRequest(
  versionId: number,
  mediaId: number,
  options: { file: File; category?: ReleaseVersionMediaCategory; title?: string | null; caption?: string | null; isPreviewCandidate?: boolean },
  currentSourceRevision: number | null | undefined,
): ReplaceReleaseVersionMediaFileOptions {
  return {
    versionId,
    relationId: mediaId,
    file: options.file,
    category: options.category,
    title: options.title,
    caption: options.caption,
    isPreviewCandidate: options.isPreviewCandidate,
    sourceRevision: currentSourceRevision ?? undefined,
  }
}

// ─── Edit-Drawer Speichern/Übernahme (Phase 144) ────────────────────────────

/** Drei-Zustands-Label für den Primäraktions-Button des Bearbeiten-Drawers (UI-SPEC Copywriting Contract). */
export function resolveEditDrawerPrimaryLabel(
  item: { review_state?: string | null } | null,
  hasStagedChanges: boolean,
): string {
  if (item?.review_state === 'rejected') {
    return hasStagedChanges ? 'Überarbeitung einreichen' : 'Erneut einreichen'
  }
  return 'Speichern'
}

interface SelectedItemSaveInput {
  selectedItem: ReleaseVersionMediaItem
  editCategory: ReleaseVersionMediaCategory
  editTitle?: string
  editCaption: string
  canEditPreviewCandidate: boolean
  editPreviewCandidate: boolean
  stagedReplaceFile: File | null
}

type SelectedItemSaveOp =
  | {
      mode: 'replace'
      payload: { file: File; category?: ReleaseVersionMediaCategory; title?: string | null; caption: string | null; isPreviewCandidate?: boolean }
    }
  | { mode: 'patch'; payload: ReleaseVersionMediaPatchRequest }

/** Entscheidet zwischen replaceItem (gestagte Datei) und patchItem (nur Metadaten) und baut das jeweilige Payload. */
export function buildSelectedItemSavePayload(input: SelectedItemSaveInput): SelectedItemSaveOp {
  const { selectedItem, editCategory, editTitle, editCaption, canEditPreviewCandidate, editPreviewCandidate, stagedReplaceFile } = input
  const titlePatch = editTitle === undefined ? {} : { title: editTitle.trim() || null }
  const trimmedCaption = editCaption.trim() === '' ? null : editCaption.trim()
  const categoryChanged = editCategory !== selectedItem.category
  const previewCandidateChanged = canEditPreviewCandidate && editPreviewCandidate !== selectedItem.is_preview_candidate

  if (stagedReplaceFile) {
    return {
      mode: 'replace',
      payload: {
        file: stagedReplaceFile,
        ...(categoryChanged ? { category: editCategory } : {}),
        ...titlePatch,
        caption: trimmedCaption,
        ...(previewCandidateChanged ? { isPreviewCandidate: editPreviewCandidate } : {}),
      },
    }
  }

  return {
    mode: 'patch',
    payload: {
      ...titlePatch,
      caption: trimmedCaption,
      ...(selectedItem.source_revision != null ? { source_revision: selectedItem.source_revision } : {}),
      ...(categoryChanged ? { category: editCategory } : {}),
    },
  }
}
