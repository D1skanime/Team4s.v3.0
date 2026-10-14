'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getAnimeSegments, getReleaseVersionCapabilities, deleteReleaseVersionMediaItem, getReleaseVersionMedia, patchReleaseVersionMediaItem, replaceReleaseVersionMediaFile, reorderReleaseVersionMedia, reorderReleaseVersionMediaHighlights, setReleaseVersionMediaHighlight } from '@/lib/api'
import { useCancellableSlugState } from '@/hooks/useCancellableSlugState'
import { ReleaseVersionMediaCategory, ReleaseVersionCapabilities, ReleaseVersionMediaItem, ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse, ReleaseVersionMediaPatchRequest, ReleaseVersionMediaReorderRequest, ReleaseVersionMediaHighlightReorderRequest, ReleaseVersionAdminStoryItem, ReleaseVersionStoryOrderItem } from '@/types/releaseVersionMedia'
import { buildReplaceMediaFileRequest, createKaraStoryItem, sortStoryItems } from './ReleaseVersionMediaSection.helpers'

interface StoryContext {
  animeId: number | null
  groupId: number | null
  version: string | null
}

export interface UseReleaseVersionMediaResult {
  items: ReleaseVersionMediaItem[]
  storyItems?: ReleaseVersionAdminStoryItem[]
  isLoading: boolean
  error: string | null
  reload: () => void
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
  const itemsRef = useRef<ReleaseVersionMediaItem[]>([])
  const storyItemsRef = useRef<ReleaseVersionAdminStoryItem[]>([])

  useEffect(() => {
    itemsRef.current = items
    storyItemsRef.current = storyItems
  }, [items, storyItems])

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
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

  // The gallery renders storyItems, but patch/replace/delete/highlight only update `items`.
  // Project every media story entry onto the current item (and drop deleted ones) so the
  // gallery never shows stale data until the next reload (BUG-174-03).
  const syncedStoryItems = useMemo(() => {
    const itemsByID = new Map(items.map((item) => [item.id, item]))
    return storyItems.flatMap((entry): ReleaseVersionAdminStoryItem[] => {
      if (entry.type !== 'media') return [entry]
      const current = itemsByID.get(entry.media.id)
      return current ? [current === entry.media ? entry : { ...entry, media: current }] : []
    })
  }, [items, storyItems])

  return {
    items,
    storyItems: syncedStoryItems,
    isLoading,
    error,
    reload,
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
