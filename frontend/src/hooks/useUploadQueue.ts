'use client'

/**
 * useUploadQueue.ts
 * Adapter-parametrisierte Upload-Orchestrierung, geteilt von Weg 1 (release_version_media)
 * und Weg 2 (fansub_group_media) — generalisiert aus useReleaseVersionMedia.ts's
 * patchUploadedItem/runUpload/startUpload/retryUpload-Cluster (Zeilen 127-274).
 *
 * Diese Datei kennt KEIN review_status/visibility — jene bleiben vollständig in der
 * jeweiligen `uploadFiles`-Closure des aufrufenden Wegs verborgen (Pitfall 5). Die
 * einzige Erwähnung dieser Begriffe in dieser Datei ist diese Kommentarzeile und die
 * Beschreibung des Adapter-Vertrags selbst.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { fileKey, mergeFileSelection, readUploadError } from './useUploadQueue.helpers'

export interface UploadAdapter<TResult> {
  // Wird einmal pro startUpload/retryUpload-Batch aufgerufen. onProgress meldet EINEN
  // Gesamtprozentwert für die gesamte Multipart-Anfrage (authorizedUploadXhr's echtes
  // Verhalten — frontend/src/lib/api/client.ts:963-1037 — es gibt heute kein echtes
  // Pro-Datei-Progress vom Backend; hier wird keines simuliert.
  uploadFiles: (files: File[], onProgress: (percent: number) => void) => Promise<TResult[]>
  // Liest die fertige Relation-ID aus einem rohen Pro-Datei-Ergebnis, oder null bei Fehler.
  readyResultId: (result: TResult) => number | null
  // Liest result.status === 'ready' (die konkrete Status-String-Form unterscheidet sich
  // leicht zwischen den beiden Backend-Antwortformen — der Adapter normalisiert das, der
  // Hook inspiziert nie die rohe Status-Zeichenkette selbst).
  isReady: (result: TResult) => boolean
  // Liest eine Freitext-Fehlermeldung aus einem fehlgeschlagenen Ergebnis zur Anzeige.
  readErrorFromResult: (result: TResult) => string | null
  // Optionaler Metadaten-Patch-nach-Upload-Schritt (Titel/Beschreibung). Der Adapter besitzt
  // das Feldnamen-Mapping (z. B. caption->caption vs. caption->description), nicht der Hook.
  patchMetadata?: (resultId: number, patch: { title?: string; caption?: string }) => Promise<{ ok: true } | { ok: false; message: string }>
}

export interface UploadQueueItem {
  file: File
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'
  progress: number
  errorMessage: string | null
  resultId: number | null
  title?: string
  caption?: string
}

export interface UploadRunResult {
  items: UploadQueueItem[]
  allSucceeded: boolean
}

export interface UseUploadQueueResult<TResult> {
  items: UploadQueueItem[]
  selectFiles: (files: File[]) => void
  removeDraft: (key: string) => void
  updateDraft: (key: string, field: 'title' | 'caption', value: string) => void
  startUpload: (adapter: UploadAdapter<TResult>, config?: unknown) => Promise<UploadRunResult>
  retryUpload: (adapter: UploadAdapter<TResult>, fileIndex: number) => Promise<UploadRunResult>
  clearQueue: () => void
  error: string | null
}

function buildDraft(file: File): UploadQueueItem {
  return { file, title: '', caption: '', status: 'idle', progress: 0, errorMessage: null, resultId: null }
}

export function useUploadQueue<TResult>(): UseUploadQueueResult<TResult> {
  const [items, setItems] = useState<UploadQueueItem[]>([])
  const [error, setError] = useState<string | null>(null)
  // Merkt sich den zuletzt verwendeten Adapter/Config für retryUpload, analog zu
  // useReleaseVersionMedia.ts's lastUploadConfigRef.
  const lastAdapterRef = useRef<UploadAdapter<TResult> | null>(null)
  // Synchroner Spiegel von `items` für startUpload/retryUpload, die den aktuellen Stand
  // VOR dem nächsten Render lesen müssen (identisches Muster zu useReleaseVersionMedia.ts's
  // itemsRef, das ebenfalls per Effect synchron gehalten wird statt per State-Updater-Trick).
  const itemsRef = useRef<UploadQueueItem[]>([])
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const patchUploadedItem = useCallback(
    async (adapter: UploadAdapter<TResult>, queueItem: UploadQueueItem): Promise<UploadQueueItem> => {
      const patch: { title?: string; caption?: string } = {}
      const title = queueItem.title?.trim()
      const caption = queueItem.caption?.trim()
      if (title) patch.title = title
      if (caption) patch.caption = caption

      if (Object.keys(patch).length === 0 || !adapter.patchMetadata || queueItem.resultId === null) {
        return { ...queueItem, status: 'ready', progress: 100, errorMessage: null }
      }

      try {
        const result = await adapter.patchMetadata(queueItem.resultId, patch)
        if (result.ok) {
          return { ...queueItem, status: 'ready', progress: 100, errorMessage: null }
        }
        return { ...queueItem, status: 'failed', progress: 100, errorMessage: result.message }
      } catch (patchError) {
        return {
          ...queueItem,
          status: 'failed',
          progress: 100,
          errorMessage: readUploadError(patchError, 'Metadaten konnten nach dem Upload nicht gesetzt werden.'),
        }
      }
    },
    [],
  )

  const runUpload = useCallback(
    async (adapter: UploadAdapter<TResult>, queueIndices: number[], queue: UploadQueueItem[]): Promise<UploadRunResult> => {
      if (queue.length === 0) {
        return { items: [], allSucceeded: true }
      }

      setError(null)
      setItems((current) => current.map((item, index) => queueIndices.includes(index)
        ? { ...item, status: 'uploading', progress: 0, errorMessage: null }
        : item))

      try {
        const results = await adapter.uploadFiles(queue.map((item) => item.file), (percent) => {
          setItems((current) => current.map((item, index) =>
            queueIndices.includes(index) && item.status === 'uploading'
              ? { ...item, progress: percent }
              : item))
        })

        setItems((current) => current.map((item, index) =>
          queueIndices.includes(index) && item.status === 'uploading'
            ? { ...item, status: 'processing', progress: 100 }
            : item))

        const outcomes: UploadQueueItem[] = []
        // Backend liefert genau ein Ergebnis pro Multipart-Eingabe in Eingabereihenfolge,
        // einschließlich Fehlern (gespiegelt aus useReleaseVersionMedia.ts:191-210).
        for (const [position, queueItem] of queue.entries()) {
          const result = results[position]
          const targetIndex = queueIndices[position]
          let outcome: UploadQueueItem
          if (result !== undefined && adapter.isReady(result)) {
            const resultId = adapter.readyResultId(result)
            const uploaded: UploadQueueItem = {
              ...queueItem, status: 'processing', progress: 100, errorMessage: null, resultId,
            }
            setItems((current) => current.map((item, index) => index === targetIndex ? uploaded : item))
            outcome = await patchUploadedItem(adapter, uploaded)
          } else {
            outcome = {
              ...queueItem, status: 'failed', progress: 100,
              errorMessage: result ? adapter.readErrorFromResult(result) ?? 'Upload fehlgeschlagen.' : 'Upload fehlgeschlagen.',
              resultId: null,
            }
          }
          outcomes.push(outcome)
          setItems((current) => current.map((item, index) => index === targetIndex ? outcome : item))
        }
        return { items: outcomes, allSucceeded: outcomes.every((item) => item.status === 'ready') }
      } catch (uploadError) {
        const message = readUploadError(uploadError, 'Upload fehlgeschlagen.')
        setError(message)
        setItems((current) => current.map((item, index) => queueIndices.includes(index)
          ? { ...item, status: 'failed', errorMessage: message }
          : item))
        throw uploadError
      }
    },
    [patchUploadedItem],
  )

  const startUpload = useCallback(
    async (adapter: UploadAdapter<TResult>, _config?: unknown): Promise<UploadRunResult> => {
      lastAdapterRef.current = adapter
      const currentDrafts = itemsRef.current
      if (currentDrafts.length === 0) return { items: [], allSucceeded: true }
      const indices = currentDrafts.map((_, index) => index)
      return runUpload(adapter, indices, currentDrafts)
    },
    [runUpload],
  )

  const retryUpload = useCallback(
    async (adapter: UploadAdapter<TResult>, fileIndex: number): Promise<UploadRunResult> => {
      lastAdapterRef.current = adapter
      const queueItem = itemsRef.current[fileIndex]
      if (!queueItem || queueItem.status !== 'failed') {
        return { items: [], allSucceeded: false }
      }

      if (queueItem.resultId === null) {
        return runUpload(adapter, [fileIndex], [queueItem])
      }

      setError(null)
      setItems((current) => current.map((item, index) => index === fileIndex
        ? { ...item, status: 'processing', errorMessage: null }
        : item))
      const outcome = await patchUploadedItem(adapter, queueItem)
      setItems((current) => current.map((item, index) => index === fileIndex ? outcome : item))
      return { items: [outcome], allSucceeded: outcome.status === 'ready' }
    },
    [patchUploadedItem, runUpload],
  )

  const selectFiles = useCallback((files: File[]) => {
    setItems((current) => mergeFileSelection(current, files, buildDraft, fileKey))
  }, [])

  const removeDraft = useCallback((key: string) => {
    setItems((current) => current.filter((item) => fileKey(item.file) !== key))
  }, [])

  const updateDraft = useCallback((key: string, field: 'title' | 'caption', value: string) => {
    setItems((current) => current.map((item) => fileKey(item.file) === key ? { ...item, [field]: value } : item))
  }, [])

  const clearQueue = useCallback(() => {
    lastAdapterRef.current = null
    setError(null)
    setItems([])
  }, [])

  return { items, selectFiles, removeDraft, updateDraft, startUpload, retryUpload, clearQueue, error }
}
