/**
 * ReleaseVersionMediaSection.helpers.tsx
 * Reine Konstanten und Utilities für ReleaseVersionMediaSection — kein State, keine Hooks, kein JSX.
 */

import { UploadQueueItem } from './useReleaseVersionMedia'
import { ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'
import { ReplaceReleaseVersionMediaFileOptions } from '@/lib/api'
import styles from './ReleaseVersionMediaSection.module.css'

// ─── Kategorie-Optionen (Surface 4, D-08) ───────────────────────────────────

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
      return 'idle'
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
  options: { file: File; category?: ReleaseVersionMediaCategory; caption?: string | null; isPreviewCandidate?: boolean },
  currentSourceRevision: number | null | undefined,
): ReplaceReleaseVersionMediaFileOptions {
  return {
    versionId,
    relationId: mediaId,
    file: options.file,
    category: options.category,
    caption: options.caption,
    isPreviewCandidate: options.isPreviewCandidate,
    sourceRevision: currentSourceRevision ?? undefined,
  }
}
