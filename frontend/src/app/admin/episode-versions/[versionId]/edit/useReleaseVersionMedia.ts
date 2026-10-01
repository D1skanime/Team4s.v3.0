'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getAnimeSegments, getReleaseVersionCapabilities, deleteReleaseVersionMediaItem, getReleaseVersionMedia, patchReleaseVersionMediaItem, replaceReleaseVersionMediaFile, reorderReleaseVersionMedia, reorderReleaseVersionMediaHighlights, setReleaseVersionMediaHighlight, uploadReleaseVersionMedia } from '@/lib/api'
import { useCancellableSlugState } from '@/hooks/useCancellableSlugState'
import { CATEGORY_ALLOWS_PREVIEW, ReleaseVersionMediaCategory, ReleaseVersionCapabilities, ReleaseVersionMediaItem, ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse, ReleaseVersionMediaPatchRequest, ReleaseVersionMediaReorderRequest, ReleaseVersionMediaHighlightReorderRequest, ReleaseVersionAdminStoryItem, ReleaseVersionStoryOrderItem } from '@/types/releaseVersionMedia'
import { buildReplaceMediaFileRequest, createKaraStoryItem, fileKey, sortStoryItems } from './ReleaseVersionMediaSection.helpers'

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

interface StoryContext {
  animeId: number | null
  groupId: number | null
  version: string | null
}

interface UploadConfig {
  category: ReleaseVersionMediaCategory
  versionId: number
}

export interface UseReleaseVersionMediaResult {
  items: ReleaseVersionMediaItem[]
  storyItems?: ReleaseVersionAdminStoryItem[]
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
  setHighlight?: (mediaId: number, highlighted: boolean) => Promise<void>
  reorderHighlights?: (versionId: number, body: ReleaseVersionMediaHighlightReorderRequest) => Promise<void>
  patchError: string | null
  replaceError: string | null
  deleteError: string | null
  reorderError: string | null
  highlightError?: string | null
  highlightReorderError?: string | null
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
  const orderMap = new Map(body.items.filter((item): item is Extract<typeof item, { type: 'media' }> => 'type' in item && item.type === 'media').map((item) => [(item.media_id), item.sort_order]))

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

export function useReleaseVersionMedia(versionId: number | null, storyContext?: StoryContext): UseReleaseVersionMediaResult {
  const [items, setItems] = useState<ReleaseVersionMediaItem[]>([])
  const [segments, setSegments] = useState<import('@/types/admin').AdminThemeSegment[]>([])
  const [storyItems, setStoryItems] = useState<ReleaseVersionAdminStoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploadItems, setUploadItems] = useState<UploadQueueItem[]>([])
  const [patchError, setPatchError] = useState<string | null>(null)
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [highlightError, setHighlightError] = useState<string | null>(null)
  const [highlightReorderError, setHighlightReorderError] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<ReleaseVersionCapabilities | null>(null)
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  const lastUploadConfigRef = useRef<UploadConfig | null>(null)
  const itemsRef = useRef<ReleaseVersionMediaItem[]>([])
  const storyItemsRef = useRef<ReleaseVersionAdminStoryItem[]>([])

  useEffect(() => {
    itemsRef.current = items
    storyItemsRef.current = storyItems
  }, [items, storyItems])

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
      const previousStoryItems = storyItemsRef.current
      const orderByKey = new Map(body.items.map((item) => [
        'type' in item ? (item.type === 'media' ? 'media:' + item.media_id : 'kara:' + item.theme_segment_id) : 'media:' + item.id,
        item.sort_order,
      ]))
      const optimisticStoryItems = sortStoryItems(previousStoryItems.map((item) => ({
        ...item,
        sort_order: orderByKey.get(item.type === 'media' ? 'media:' + item.media.id : 'kara:' + item.segment.id) ?? item.sort_order,
      })))
      const optimisticItems = sortMediaItems(previousItems.map((item) => ({
        ...item,
        sort_order: orderByKey.get('media:' + item.id) ?? item.sort_order,
      })))

      setReorderError(null)
      setStoryItems(optimisticStoryItems)
      setItems(optimisticItems)

      try {
        await reorderReleaseVersionMedia(targetVersionId, body)
      } catch (reorderItemsError) {
        setStoryItems(previousStoryItems)
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

  const setHighlight = useCallback(
    async (mediaId: number, highlighted: boolean) => {
      if (versionId === null) return
      const previousItems = itemsRef.current
      const currentItem = previousItems.find((item) => item.id === mediaId)
      if (!currentItem) return

      setHighlightError(null)
      setItems((current) => current.map((item) => item.id === mediaId
        ? { ...item, is_highlight: highlighted, highlight_order: highlighted ? (item.highlight_order ?? 0) : null }
        : item))
      try {
        const response = await setReleaseVersionMediaHighlight(versionId, mediaId, {
          highlighted,
          ...(highlighted ? { highlight_order: currentItem.highlight_order ?? 0 } : {}),
        })
        setItems((current) => current.map((item) => item.id === mediaId
          ? { ...item, is_highlight: response.is_highlight, highlight_order: response.highlight_order }
          : item))
      } catch (highlightMutationError) {
        setItems(previousItems)
        const message = readUploadError(highlightMutationError, 'Highlight konnte nicht gespeichert werden.')
        setHighlightError(message)
        throw highlightMutationError
      }
    },
    [versionId],
  )

  const reorderHighlights = useCallback(
    async (targetVersionId: number, body: ReleaseVersionMediaHighlightReorderRequest) => {
      const previousItems = itemsRef.current
      setHighlightReorderError(null)
      setItems((current) => current.map((item) => {
        const nextOrder = body.items.find((entry) => entry.id === item.id)?.highlight_order
        return nextOrder === undefined ? item : { ...item, highlight_order: nextOrder }
      }))
      try {
        await reorderReleaseVersionMediaHighlights(targetVersionId, body)
      } catch (highlightReorderMutationError) {
        setItems(previousItems)
        const message = readUploadError(highlightReorderMutationError, 'Highlight-Reihenfolge konnte nicht gespeichert werden.')
        setHighlightReorderError(message)
        throw highlightReorderMutationError
      }
    },
    [],
  )

  const canFetch = versionId !== null
  const requestKey = canFetch ? `${versionId}:${reloadKey}` : ''
  const fetcher = useCallback(async () => {
    const [mediaResponse, capabilitiesResponseData] = await Promise.all([
      getReleaseVersionMedia(versionId as number),
      getReleaseVersionCapabilities(versionId as number),
    ])
    const segmentResponse =
      storyContext?.animeId != null
        ? await getAnimeSegments(
            storyContext.animeId,
            storyContext.groupId,
            storyContext.version,
            undefined,
            versionId,
          )
        : { data: [] }
    return [mediaResponse, capabilitiesResponseData, segmentResponse] as [ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse, { data: import('@/types/admin').AdminThemeSegment[] }]
  }, [storyContext?.animeId, storyContext?.groupId, storyContext?.version, versionId])
  const { state } = useCancellableSlugState<[ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse, { data: import('@/types/admin').AdminThemeSegment[] }]>({
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
      setSegments([])
      setStoryItems([])
      setError(null)
      setCapabilities(null)
      setCapabilitiesError(null)
    }
  } else if (state.key === requestKey && state.key !== appliedKey) {
    if (state.status === 'success') {
      setAppliedKey(state.key)
      const [mediaResponse, capabilitiesResponseData, segmentResponse] = state.data!
      const nextItems = sortMediaItems(Array.isArray(mediaResponse.data) ? mediaResponse.data : [])
      const nextSegments = Array.isArray(segmentResponse.data)
        ? segmentResponse.data.filter((segment) => (segment.assigned_release_version_ids ?? []).includes(versionId as number))
        : []
      setItems(nextItems)
      setSegments(nextSegments)
      const mediaByID = new Map(nextItems.map((media) => [media.id, media]))
      const segmentsByID = new Map(nextSegments.map((segment) => [segment.id, segment]))
      const persistedStoryItems = (mediaResponse.story_order ?? []).reduce<ReleaseVersionAdminStoryItem[]>((story, entry) => {
        if (entry.type === 'media' && entry.media_id != null) {
          const media = mediaByID.get(entry.media_id)
          if (media) story.push({ type: 'media', media, sort_order: entry.sort_order })
        }
        if (entry.type === 'kara' && entry.theme_segment_id != null) {
          const segment = segmentsByID.get(entry.theme_segment_id)
          if (segment) story.push(createKaraStoryItem(segment, entry.sort_order))
        }
        return story
      }, [])
      const expectedStoryItemCount = nextItems.length + nextSegments.length
      if (persistedStoryItems.length === expectedStoryItemCount) {
        setStoryItems(sortStoryItems(persistedStoryItems))
      } else {
        const mediaStoryItems = nextItems.map((media) => ({ type: 'media' as const, media, sort_order: media.sort_order }))
        const karaStoryItems = nextSegments.map((segment, index) => createKaraStoryItem(segment, (nextItems.at(-1)?.sort_order ?? 0) + (index + 1) * 10))
        setStoryItems(sortStoryItems([...mediaStoryItems, ...karaStoryItems]))
      }
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
    storyItems,
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
    setHighlight,
    reorderHighlights,
    patchError,
    replaceError,
    deleteError,
    reorderError,
    highlightError,
    highlightReorderError,
    capabilities,
    capabilitiesError,
  }
}
