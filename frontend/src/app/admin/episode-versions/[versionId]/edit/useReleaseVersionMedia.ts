'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  getReleaseVersionCapabilities,
  deleteReleaseVersionMediaItem,
  getReleaseVersionMedia,
  patchReleaseVersionMediaItem,
  reorderReleaseVersionMedia,
  uploadReleaseVersionMedia,
} from '@/lib/api'
import {
  ReleaseVersionMediaCategory,
  ReleaseVersionCapabilities,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
  ReleaseVersionMediaReorderRequest,
} from '@/types/releaseVersionMedia'

export interface UploadQueueItem {
  file: File
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'
  progress: number
  errorMessage: string | null
  resultId: number | null
}

interface UploadConfig {
  category: ReleaseVersionMediaCategory
  defaultCaption?: string
  isPreviewCandidate?: boolean
  visibilityCode?: string
  reviewStatusCode?: string
}

export interface UseReleaseVersionMediaResult {
  items: ReleaseVersionMediaItem[]
  isLoading: boolean
  error: string | null
  reload: () => void
  uploadItems: UploadQueueItem[]
  startUpload: (
    category: ReleaseVersionMediaCategory,
    files: File[],
    defaultCaption?: string,
    isPreviewCandidate?: boolean,
    visibilityCode?: string,
    reviewStatusCode?: string,
  ) => Promise<void>
  retryUpload: (fileIndex: number) => Promise<void>
  clearUploadQueue: () => void
  patchItem: (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => Promise<void>
  deleteItem: (mediaId: number) => Promise<void>
  reorderItems: (versionId: number, body: ReleaseVersionMediaReorderRequest) => Promise<void>
  patchError: string | null
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadItems, setUploadItems] = useState<UploadQueueItem[]>([])
  const [patchError, setPatchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<ReleaseVersionCapabilities | null>(null)
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const lastUploadConfigRef = useRef<UploadConfig | null>(null)
  const itemsRef = useRef<ReleaseVersionMediaItem[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  const patchUploadedItem = useCallback(
    async (mediaId: number, config: UploadConfig) => {
      const patch: ReleaseVersionMediaPatchRequest = {}
      const trimmedCaption = config.defaultCaption?.trim()

      if (trimmedCaption) {
        patch.caption = trimmedCaption
      }
      if (config.isPreviewCandidate) {
        patch.is_preview_candidate = true
      }
      if (Object.keys(patch).length === 0 || versionId === null) {
        return
      }

      await patchReleaseVersionMediaItem(versionId, mediaId, patch)
    },
    [versionId],
  )

  const runUpload = useCallback(
    async (queueIndices: number[], files: File[], config: UploadConfig) => {
      if (versionId === null || files.length === 0) {
        return
      }

      lastUploadConfigRef.current = config
      setError(null)
      setUploadItems((current) =>
        current.map((item, index) =>
          queueIndices.includes(index)
            ? {
                ...item,
                status: 'uploading',
                progress: 0,
                errorMessage: null,
                resultId: null,
              }
            : item,
        ),
      )

      try {
        const response = await uploadReleaseVersionMedia({
          versionId,
          category: config.category,
          files,
          visibilityCode: config.visibilityCode,
          reviewStatusCode: config.reviewStatusCode,
          onProgress: (_fileIndex, percent) => {
            setUploadItems((current) =>
              current.map((item, index) =>
                queueIndices.includes(index) && item.status === 'uploading'
                  ? { ...item, progress: percent }
                  : item,
              ),
            )
          },
        })

        setUploadItems((current) =>
          current.map((item, index) =>
            queueIndices.includes(index) && item.status === 'uploading'
              ? { ...item, status: 'processing', progress: 100 }
              : item,
          ),
        )

        const nextQueue = [...queueIndices]
        let shouldReload = false

        for (const result of response.results) {
          const targetIndex = nextQueue.shift()
          if (targetIndex == null) {
            continue
          }

          if (result.status === 'ready' && typeof result.release_version_media_id === 'number') {
            try {
              await patchUploadedItem(result.release_version_media_id, config)
              shouldReload = true
              setUploadItems((current) =>
                current.map((item, index) =>
                  index === targetIndex
                    ? {
                        ...item,
                        status: 'ready',
                        progress: 100,
                        errorMessage: null,
                        resultId: result.release_version_media_id ?? null,
                      }
                    : item,
                ),
              )
            } catch (patchError) {
              setUploadItems((current) =>
                current.map((item, index) =>
                  index === targetIndex
                    ? {
                        ...item,
                        status: 'failed',
                        progress: 100,
                        errorMessage: readUploadError(
                          patchError,
                          'Metadaten konnten nach dem Upload nicht gesetzt werden.',
                        ),
                        resultId: result.release_version_media_id ?? null,
                      }
                    : item,
                ),
              )
            }
            continue
          }

          setUploadItems((current) =>
            current.map((item, index) =>
              index === targetIndex
                ? {
                    ...item,
                    status: 'failed',
                    progress: 100,
                    errorMessage: result.error_code || 'Upload fehlgeschlagen.',
                    resultId: null,
                  }
                : item,
            ),
          )
        }

        if (shouldReload) {
          reload()
        }
      } catch (uploadError) {
        const message = readUploadError(uploadError, 'Upload fehlgeschlagen.')
        setError(message)
        setUploadItems((current) =>
          current.map((item, index) =>
            queueIndices.includes(index)
              ? {
                  ...item,
                  status: 'failed',
                  progress: item.progress,
                  errorMessage: message,
                  resultId: null,
                }
              : item,
          ),
        )
      }
    },
    [patchUploadedItem, reload, versionId],
  )

  const startUpload = useCallback(
    async (
      category: ReleaseVersionMediaCategory,
      files: File[],
      defaultCaption?: string,
      isPreviewCandidate?: boolean,
      visibilityCode?: string,
      reviewStatusCode?: string,
    ) => {
      if (files.length === 0) {
        return
      }

      const config: UploadConfig = { category, defaultCaption, isPreviewCandidate, visibilityCode, reviewStatusCode }
      const initialQueue = files.map<UploadQueueItem>((file) => ({
        file,
        status: 'idle',
        progress: 0,
        errorMessage: null,
        resultId: null,
      }))

      setUploadItems(initialQueue)
      await runUpload(
        initialQueue.map((_, index) => index),
        files,
        config,
      )
    },
    [runUpload],
  )

  const retryUpload = useCallback(
    async (fileIndex: number) => {
      const config = lastUploadConfigRef.current
      const queueItem = uploadItems[fileIndex]
      if (!config || !queueItem) {
        return
      }

      await runUpload([fileIndex], [queueItem.file], config)
    },
    [runUpload, uploadItems],
  )

  const clearUploadQueue = useCallback(() => {
    setUploadItems([])
  }, [])

  const patchItem = useCallback(
    async (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => {
      if (versionId === null) {
        return
      }

      setPatchError(null)
      try {
        const updated = await patchReleaseVersionMediaItem(versionId, mediaId, patch)
        setItems((current) => {
          const next = current.map((item) => (item.id === mediaId ? updated : item))
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

  useEffect(() => {
    if (versionId === null) {
      setItems([])
      setError(null)
      setCapabilities(null)
      setCapabilitiesError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)
    setCapabilitiesError(null)

    Promise.all([
      getReleaseVersionMedia(versionId),
      getReleaseVersionCapabilities(versionId),
    ])
      .then(([response, capabilitiesResponse]) => {
        if (cancelled) return
        setItems(sortMediaItems(Array.isArray(response.data) ? response.data : []))
        setCapabilities(capabilitiesResponse.data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setCapabilitiesError(message)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [versionId, reloadKey])

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
    deleteItem,
    reorderItems,
    patchError,
    deleteError,
    reorderError,
    capabilities,
    capabilitiesError,
  }
}
