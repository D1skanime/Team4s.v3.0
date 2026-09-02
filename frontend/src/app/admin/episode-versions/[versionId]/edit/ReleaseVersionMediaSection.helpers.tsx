/**
 * ReleaseVersionMediaSection.helpers.tsx
 * Reine Konstanten und Utilities für ReleaseVersionMediaSection — kein State, keine Hooks, kein JSX.
 */

import { UploadQueueItem } from './useReleaseVersionMedia'
import {
  ReleaseVersionMediaCategory,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
} from '@/types/releaseVersionMedia'
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
  editCaption: string
  canEditPreviewCandidate: boolean
  editPreviewCandidate: boolean
  stagedReplaceFile: File | null
}

type SelectedItemSaveOp =
  | {
      mode: 'replace'
      payload: { file: File; category?: ReleaseVersionMediaCategory; caption: string | null; isPreviewCandidate?: boolean }
    }
  | { mode: 'patch'; payload: ReleaseVersionMediaPatchRequest }

/** Entscheidet zwischen replaceItem (gestagte Datei) und patchItem (nur Metadaten) und baut das jeweilige Payload. */
export function buildSelectedItemSavePayload(input: SelectedItemSaveInput): SelectedItemSaveOp {
  const { selectedItem, editCategory, editCaption, canEditPreviewCandidate, editPreviewCandidate, stagedReplaceFile } = input
  const trimmedCaption = editCaption.trim() === '' ? null : editCaption.trim()
  const categoryChanged = editCategory !== selectedItem.category
  const previewCandidateChanged = canEditPreviewCandidate && editPreviewCandidate !== selectedItem.is_preview_candidate

  if (stagedReplaceFile) {
    return {
      mode: 'replace',
      payload: {
        file: stagedReplaceFile,
        ...(categoryChanged ? { category: editCategory } : {}),
        caption: trimmedCaption,
        ...(previewCandidateChanged ? { isPreviewCandidate: editPreviewCandidate } : {}),
      },
    }
  }

  return {
    mode: 'patch',
    payload: {
      caption: trimmedCaption,
      ...(selectedItem.source_revision != null ? { source_revision: selectedItem.source_revision } : {}),
      ...(categoryChanged ? { category: editCategory } : {}),
    },
  }
}
