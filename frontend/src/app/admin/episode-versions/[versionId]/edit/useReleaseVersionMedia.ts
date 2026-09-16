'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getReleaseVersionCapabilities, deleteReleaseVersionMediaItem, getReleaseVersionMedia, patchReleaseVersionMediaItem, replaceReleaseVersionMediaFile, reorderReleaseVersionMedia, uploadReleaseVersionMedia } from '@/lib/api'
import { useCancellableSlugState } from '@/hooks/useCancellableSlugState'
import { CATEGORY_ALLOWS_PREVIEW, ReleaseVersionMediaCategory, ReleaseVersionCapabilities, ReleaseVersionMediaItem, ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse, ReleaseVersionMediaPatchRequest, ReleaseVersionMediaReorderRequest } from '@/types/releaseVersionMedia'
import { buildReplaceMediaFileRequest, fileKey } from './ReleaseVersionMediaSection.helpers'

export interface UploadFileDraft {
  file: File
  title: string
  caption: string
}

export interface UploadQueueItem {
  file: File
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'
  progress: number
  errorMessage: string | null
  resultId: number | null
  title?: string
  caption?: string
  isPreviewCandidate?: boolean
  /** Kept with resultId so metadata retries never upload the binary again. */
  sourceRevision?: number
}

export interface UploadRunResult {
  items: UploadQueueItem[]
  allSucceeded: boolean
}

interface UploadConfig {
  category: ReleaseVersionMediaCategory
  versionId: number
}

export interface UseReleaseVersionMediaResult {
  items: ReleaseVersionMediaItem[]
  isLoading: boolean
  error: string | null
  reload: () => void
  uploadItems: UploadQueueItem[]
  startUpload: (category: ReleaseVersionMediaCategory, drafts: UploadFileDraft[], previewFileKey?: string | null) => Promise<UploadRunResult>
  retryUpload: (fileIndex: number) => Promise<UploadRunResult>
  clearUploadQueue: () => void
  patchItem: (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => Promise<void>
  replaceItem: (mediaId: number, options: { file: File; category?: ReleaseVersionMediaCategory; title?: string | null; caption?: string | null; isPreviewCandidate?: boolean }) => Promise<void>
  deleteItem: (mediaId: number) => Promise<void>
  reorderItems: (versionId: number, body: ReleaseVersionMediaReorderRequest) => Promise<void>
  patchError: string | null
  replaceError: string | null
  deleteError: string | null
  reorderError: string | null
  capabilities?: ReleaseVersionCapabilities | null
  capabilitiesError?: string | null
}

function sortMediaItems(items: ReleaseVersionMediaItem[]): ReleaseVersionMediaItem[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order)
}

function applyReorderToItems(
  current: ReleaseVersionMediaItem[],
  body: ReleaseVersionMediaReorderRequest,
): ReleaseVersionMediaItem[] {
  const orderMap = new Map(body.items.map((item) => [item.id, item.sort_order]))

  return sortMediaItems(
    current.map((item) => {
      const nextSortOrder = orderMap.get(item.id)
      return nextSortOrder !== undefined ? { ...item, sort_order: nextSortOrder } : item
    }),
  )
}

function readUploadError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export function useReleaseVersionMedia(versionId: number | null): UseReleaseVersionMediaResult {
  const [items, setItems] = useState<ReleaseVersionMediaItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploadItems, setUploadItems] = useState<UploadQueueItem[]>([])
  const [patchError, setPatchError] = useState<string | null>(null)
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<ReleaseVersionCapabilities | null>(null)
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  const lastUploadConfigRef = useRef<UploadConfig | null>(null)
  const itemsRef = useRef<ReleaseVersionMediaItem[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  const patchUploadedItem = useCallback(
    async (queueItem: UploadQueueItem): Promise<UploadQueueItem> => {
      const patch: ReleaseVersionMediaPatchRequest = {}
      const title = queueItem.title?.trim()
      const caption = queueItem.caption?.trim()
      if (title) patch.title = title
      if (caption) patch.caption = caption
      // Unselected images must not clear an existing preview.
      if (queueItem.isPreviewCandidate) patch.is_preview_candidate = true

      try {
        let sourceRevision = queueItem.sourceRevision
        if (Object.keys(patch).length > 0 && versionId !== null && queueItem.resultId !== null) {
          if (sourceRevision != null) patch.source_revision = sourceRevision
          const updated = await patchReleaseVersionMediaItem(versionId, queueItem.resultId, patch)
          sourceRevision = updated.source_revision ?? sourceRevision
        }
        return { ...queueItem, status: 'ready', progress: 100, errorMessage: null, sourceRevision }
      } catch (patchError) {
        return {
          ...queueItem,
          status: 'failed',
          progress: 100,
          errorMessage: readUploadError(patchError, 'Metadaten konnten nach dem Upload nicht gesetzt werden.'),
        }
      }
    },
    [versionId],
  )

  const runUpload = useCallback(
    async (queueIndices: number[], queue: UploadQueueItem[], config: UploadConfig): Promise<UploadRunResult> => {
      if (versionId === null || queue.length === 0) {
        return { items: [], allSucceeded: true }
      }

      setError(null)
      setUploadItems((current) => current.map((item, index) => queueIndices.includes(index)
        ? { ...item, status: 'uploading', progress: 0, errorMessage: null }
        : item))

      try {
        const response = await uploadReleaseVersionMedia({
          versionId,
          category: config.category,
          files: queue.map(item => item.file),
          // The existing XHR reports progress for the whole multipart request.
          onProgress: (_fileIndex, percent) => {
            setUploadItems((current) => current.map((item, index) =>
              queueIndices.includes(index) && item.status === 'uploading'
                ? { ...item, progress: percent }
                : item))
          },
        })

        setUploadItems((current) => current.map((item, index) =>
          queueIndices.includes(index) && item.status === 'uploading'
            ? { ...item, status: 'processing', progress: 100 }
            : item))

        const outcomes: UploadQueueItem[] = []
        let shouldReload = false
        // Backend appends exactly one result per multipart input in input order,
        // including failures. Filenames are not unique and are never lookup keys.
        for (const [position, queueItem] of queue.entries()) {
          const result = response.results[position]
          const targetIndex = queueIndices[position]
          let outcome: UploadQueueItem
          if (result?.status === 'ready' && typeof result.release_version_media_id === 'number') {
            shouldReload = true
            const uploaded: UploadQueueItem = {
              ...queueItem, status: 'processing', progress: 100, errorMessage: null,
              resultId: result.release_version_media_id, sourceRevision: result.source_revision,
            }
            setUploadItems(current => current.map((item, index) => index === targetIndex ? uploaded : item))
            outcome = await patchUploadedItem(uploaded)
          } else {
            outcome = {
              ...queueItem, status: 'failed', progress: 100,
              errorMessage: result?.error_code || 'Upload fehlgeschlagen.', resultId: null,
            }
          }
          outcomes.push(outcome)
          setUploadItems(current => current.map((item, index) => index === targetIndex ? outcome : item))
        }
        if (shouldReload) reload()
        return { items: outcomes, allSucceeded: outcomes.every(item => item.status === 'ready') }
      } catch (uploadError) {
        const message = readUploadError(uploadError, 'Upload fehlgeschlagen.')
        setError(message)
        setUploadItems(current => current.map((item, index) => queueIndices.includes(index)
          ? { ...item, status: 'failed', errorMessage: message }
          : item))
        throw uploadError
      }
    },
    [patchUploadedItem, reload, versionId],
  )

  const startUpload = useCallback(
    async (
      category: ReleaseVersionMediaCategory,
      drafts: UploadFileDraft[],
      previewFileKey?: string | null,
    ): Promise<UploadRunResult> => {
      if (versionId === null || drafts.length === 0) return { items: [], allSucceeded: true }

      const config: UploadConfig = { category, versionId }
      lastUploadConfigRef.current = config
      const previewIndex = CATEGORY_ALLOWS_PREVIEW[category] && previewFileKey
        ? drafts.findIndex(draft => fileKey(draft.file) === previewFileKey)
        : -1
      const initialQueue = drafts.map<UploadQueueItem>((draft, index) => ({
        ...draft,
        isPreviewCandidate: index === previewIndex,
        status: 'idle', progress: 0, errorMessage: null, resultId: null,
      }))
      setUploadItems(initialQueue)
      return runUpload(initialQueue.map((_, index) => index), initialQueue, config)
    },
    [runUpload, versionId],
  )

  const retryUpload = useCallback(
    async (fileIndex: number): Promise<UploadRunResult> => {
      const config = lastUploadConfigRef.current
      const queueItem = uploadItems[fileIndex]
      if (!config || config.versionId !== versionId || !queueItem || queueItem.status !== 'failed') {
        return { items: [], allSucceeded: false }
      }
      if (queueItem.resultId === null) return runUpload([fileIndex], [queueItem], config)

      setError(null)
      setUploadItems(current => current.map((item, index) => index === fileIndex
        ? { ...item, status: 'processing', errorMessage: null }
        : item))
      const outcome = await patchUploadedItem(queueItem)
      setUploadItems(current => current.map((item, index) => index === fileIndex ? outcome : item))
      if (outcome.status === 'ready') reload()
      return { items: [outcome], allSucceeded: outcome.status === 'ready' }
    },
    [patchUploadedItem, reload, runUpload, uploadItems, versionId],
  )

  const clearUploadQueue = useCallback(() => {
    lastUploadConfigRef.current = null
    setUploadItems([])
  }, [])

  const patchItem = useCallback(
    async (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => {
      if (versionId === null) {
        return
      }

      setPatchError(null)
      try {
        const currentItem = itemsRef.current.find((item) => item.id === mediaId)
        const revisionBoundPatch = currentItem?.source_revision != null
          ? { ...patch, source_revision: currentItem.source_revision }
          : patch
        const updated = await patchReleaseVersionMediaItem(versionId, mediaId, revisionBoundPatch)
        setItems((current) => {
          const next = current.map((item) => {
            if (item.id === mediaId) return updated
            if (patch.is_preview_candidate === true) return { ...item, is_preview_candidate: false }
            return item
          })
          // Re-sort immediately when sort_order was part of the patch so the
          // in-memory list reflects the new order without a full reload.
          if (patch.sort_order !== undefined) {
            return sortMediaItems(next)
          }
          return next
        })
      } catch (patchItemError) {
        const message = readUploadError(patchItemError, 'Änderung konnte nicht gespeichert werden.')
        setPatchError(message)
        throw patchItemError
      }
    },
    [versionId],
  )

  const replaceItem = useCallback(
    async (mediaId: number, options: { file: File; category?: ReleaseVersionMediaCategory; title?: string | null; caption?: string | null; isPreviewCandidate?: boolean }) => {
      if (versionId === null) return
      setReplaceError(null)
      try {
        const currentItem = itemsRef.current.find((item) => item.id === mediaId)
        const updated = await replaceReleaseVersionMediaFile(buildReplaceMediaFileRequest(versionId, mediaId, options, currentItem?.source_revision))
        setItems((current) => current.map((item) => (item.id === mediaId ? updated : options.isPreviewCandidate === true ? { ...item, is_preview_candidate: false } : item)))
      } catch (replaceItemError) {
        const message = readUploadError(replaceItemError, 'Datei konnte nicht ersetzt werden. Versuch es erneut oder wähle eine andere Datei.')
        setReplaceError(message)
        throw replaceItemError
      }
    },
    [versionId],
  )

  const reorderItems = useCallback(
    async (targetVersionId: number, body: ReleaseVersionMediaReorderRequest) => {
      const previousItems = itemsRef.current
      const optimisticItems = applyReorderToItems(previousItems, body)

      setReorderError(null)
      setItems(optimisticItems)

      try {
        await reorderReleaseVersionMedia(targetVersionId, body)
      } catch (reorderItemsError) {
        setItems(previousItems)
        setReorderError(
          readUploadError(reorderItemsError, 'Reihenfolge konnte nicht gespeichert werden.'),
        )
        throw reorderItemsError
      }
    },
    [],
  )

  const deleteItem = useCallback(
    async (mediaId: number) => {
      if (versionId === null) {
        return
      }

      setDeleteError(null)
      try {
        await deleteReleaseVersionMediaItem(versionId, mediaId)
        setItems((current) => current.filter((item) => item.id !== mediaId))
      } catch (deleteItemError) {
        const message = readUploadError(deleteItemError, 'Medium konnte nicht gelöscht werden.')
        setDeleteError(message)
        throw deleteItemError
      }
    },
    [versionId],
  )

  const canFetch = versionId !== null
  const requestKey = canFetch ? `${versionId}:${reloadKey}` : ''
  const fetcher = useCallback(
    () => Promise.all([
      getReleaseVersionMedia(versionId as number),
      getReleaseVersionCapabilities(versionId as number),
    ]),
    [versionId],
  )
  const { state } = useCancellableSlugState<[ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse]>({
    requestKey,
    enabled: canFetch,
    fetcher,
  })

  // Adjust state during render (React-empfohlenes Muster statt Effect, siehe
  // GroupMemberFormModals.tsx-Praezedenzfall): nur die LADE-abgeleiteten Felder
  // (items/capabilities/error/capabilitiesError) werden hier gesetzt -- jede
  // Mutations-/Upload-Callback oben bleibt unveraendert und schreibt weiterhin direkt in
  // dieselben States, ohne von diesem Block ueberschrieben zu werden, sobald appliedKey
  // === state.key ist (Class-D-Nichteinmischungs-Beweis).
  if (!canFetch) {
    if (appliedKey !== null || items.length > 0 || capabilities !== null || error !== null || capabilitiesError !== null) {
      setAppliedKey(null)
      setItems([])
      setError(null)
      setCapabilities(null)
      setCapabilitiesError(null)
    }
  } else if (state.key === requestKey && state.key !== appliedKey) {
    if (state.status === 'success') {
      setAppliedKey(state.key)
      const [mediaResponse, capabilitiesResponseData] = state.data!
      setItems(sortMediaItems(Array.isArray(mediaResponse.data) ? mediaResponse.data : []))
      setCapabilities(capabilitiesResponseData.data)
      setError(null)
      setCapabilitiesError(null)
    } else if (state.status === 'error') {
      setAppliedKey(state.key)
      const message = state.error instanceof Error ? state.error.message : String(state.error)
      setError(message)
      setCapabilitiesError(message)
    }
  }

  const isLoading = canFetch && (state.key !== requestKey || state.status === 'loading')

  return {
    items,
    isLoading,
    error,
    reload,
    uploadItems,
    startUpload,
    retryUpload,
    clearUploadQueue,
    patchItem,
    replaceItem,
    deleteItem,
    reorderItems,
    patchError,
    replaceError,
    deleteError,
    reorderError,
    capabilities,
    capabilitiesError,
  }
}
