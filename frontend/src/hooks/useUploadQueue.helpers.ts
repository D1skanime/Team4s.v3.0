/**
 * useUploadQueue.helpers.ts
 * Reine Hilfsfunktionen für useUploadQueue — kein State, keine Hooks, kein JSX/React-Import.
 * Generalisiert aus ReleaseVersionMediaSection.helpers.tsx (fileKey/isTerminalStatus) und
 * ReleaseVersionMediaSection.tsx's handleFiles (mergeFileSelection) sowie
 * useReleaseVersionMedia.ts's readUploadError.
 */

import { ApiError } from '@/lib/api'
import type { UploadQueueItem } from './useUploadQueue'

/** Identisch zur bestehenden Weg-1-Implementierung — die Key-Form bleibt unverändert, damit
 * Weg 2s Migration sich exakt wie Weg 1s bewährtes Dedup-Verhalten verhält. */
export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

/**
 * Hängt nur Dateien an, deren Key noch nicht in `current` vorkommt — bestehende Einträge
 * werden niemals entfernt oder neu angeordnet (generalisiert aus
 * ReleaseVersionMediaSection.tsx:240-253's handleFiles-Closure).
 */
export function mergeFileSelection<T extends { file: File }>(
  current: T[],
  incomingFiles: File[],
  buildDraft: (file: File) => T,
  keyFn: (file: File) => string = fileKey,
): T[] {
  const merged = [...current]
  const seen = new Set(current.map((entry) => keyFn(entry.file)))
  for (const file of incomingFiles) {
    const key = keyFn(file)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(buildDraft(file))
  }
  return merged
}

/** Kopiert aus ReleaseVersionMediaSection.helpers.tsx:145-147 (dort `isTerminalStatus`). */
export function isTerminalUploadStatus(status: UploadQueueItem['status']): boolean {
  return status === 'ready' || status === 'failed'
}

/** Kopiert verbatim aus useReleaseVersionMedia.ts:88-96. */
export function readUploadError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
