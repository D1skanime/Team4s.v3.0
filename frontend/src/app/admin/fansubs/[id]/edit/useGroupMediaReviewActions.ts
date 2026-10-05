import {
  useCallback,
  type Dispatch,
  type DragEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'

import { getErrorStateCopy } from '@/components/ui'
import {
  ApiError,
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  deleteFansubGroupMedia,
  listFansubGroupMedia,
  patchFansubMediaReview,
  reorderFansubGroupMedia,
  uploadFansubGroupMedia,
} from '@/lib/api'

const SORT_ORDER_STEP = 1000

interface MediaDraft {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
  title: string
  description: string
  alt_text: string
  category: FansubGroupMediaCategory
  sort_order: number
}

interface PointerReorderRefValue {
  mediaId: number
  pointerId: number
  startX: number
  startY: number
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function itemToDraft(item: FansubGroupMediaItem): MediaDraft {
  return {
    visibility: item.visibility ?? 'intern',
    review_status: item.review_status ?? 'in_pruefung',
    title: item.title ?? '',
    description: item.description ?? '',
    alt_text: item.alt_text ?? '',
    category: item.category ?? 'other',
    sort_order: item.sort_order ?? 0,
  }
}

interface UseGroupMediaReviewActionsParams {
  fansubId: number
  mediaItems: FansubGroupMediaItem[]
  setMediaItems: Dispatch<SetStateAction<FansubGroupMediaItem[]>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setLoadError: Dispatch<SetStateAction<ReturnType<typeof getErrorStateCopy> | null>>
  drafts: Record<number, MediaDraft>
  setDrafts: Dispatch<SetStateAction<Record<number, MediaDraft>>>
  setSaveErrors: Dispatch<SetStateAction<Record<number, string>>>
  setSaving: Dispatch<SetStateAction<Record<number, boolean>>>
  selectedFiles: File[]
  uploadCategory: FansubGroupMediaCategory
  setUploadProgress: Dispatch<SetStateAction<number | null>>
  setUploadError: Dispatch<SetStateAction<string | null>>
  setToast: Dispatch<SetStateAction<string | null>>
  setEditingMediaId: Dispatch<SetStateAction<number | null>>
  resetUploadForm: () => void
  setIsUploadOpen: Dispatch<SetStateAction<boolean>>
  canUpdate: boolean
  canUpdateOwn: boolean
  canReview: boolean
  selectedMediaIds: Set<number>
  filteredMediaIdSet: Set<number>
  setSelectedMediaIds: Dispatch<SetStateAction<Set<number>>>
  setBulkSavingStatus: Dispatch<SetStateAction<FansubMediaReviewStatus | null>>
  setBulkError: Dispatch<SetStateAction<string | null>>
  updateMediaReviewStatus: (mediaIds: number[], reviewStatus: FansubMediaReviewStatus) => void
  canReorderMedia: boolean
  setReorderError: Dispatch<SetStateAction<string | null>>
  setReorderSaving: Dispatch<SetStateAction<boolean>>
  draggedMediaId: number | null
  dragOverMediaId: number | null
  handleDragEnd: () => void
  pointerReorderRef: MutableRefObject<PointerReorderRefValue | null>
  getPointerTargetMediaId: (event: ReactPointerEvent<HTMLButtonElement>) => number | null
  canDeleteMediaItem: (item: FansubGroupMediaItem) => boolean
  editingMediaId: number | null
  setPendingDeleteItem: Dispatch<SetStateAction<FansubGroupMediaItem | null>>
}

export function useGroupMediaReviewActions({
  fansubId,
  mediaItems,
  setMediaItems,
  setIsLoading,
  setLoadError,
  drafts,
  setDrafts,
  setSaveErrors,
  setSaving,
  selectedFiles,
  uploadCategory,
  setUploadProgress,
  setUploadError,
  setToast,
  setEditingMediaId,
  resetUploadForm,
  setIsUploadOpen,
  canUpdate,
  canUpdateOwn,
  canReview,
  selectedMediaIds,
  filteredMediaIdSet,
  setSelectedMediaIds,
  setBulkSavingStatus,
  setBulkError,
  updateMediaReviewStatus,
  canReorderMedia,
  setReorderError,
  setReorderSaving,
  draggedMediaId,
  dragOverMediaId,
  handleDragEnd,
  pointerReorderRef,
  getPointerTargetMediaId,
  canDeleteMediaItem,
  editingMediaId,
  setPendingDeleteItem,
}: UseGroupMediaReviewActionsParams) {
  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const items = await listFansubGroupMedia(fansubId, undefined)
      setMediaItems(items)
      setDrafts(Object.fromEntries(items.map((item) => [item.id, itemToDraft(item)])))
    } catch (err) {
      setLoadError(
        getErrorStateCopy(err, {
          defaultDescription: 'Medien konnten nicht geladen werden.',
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }, [fansubId, setDrafts, setIsLoading, setLoadError, setMediaItems])

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return
    setUploadError(null)
    setUploadProgress(0)
    try {
      const response = await uploadFansubGroupMedia({
        fansubID: fansubId,
        files: selectedFiles,
        category: uploadCategory,
        visibilityCode: 'private',
        reviewStatusCode: 'in_review',
        onProgress: setUploadProgress,
      })
      const failed = response.results.filter((result) => result.status === 'failed')
      if (failed.length > 0) {
        setUploadError(failed.map((result) => `${result.client_file_name}: ${result.message ?? 'Upload fehlgeschlagen'}`).join('\n'))
      } else {
        resetUploadForm()
        setToast('Medien hochgeladen. Auswahl wurde zurückgesetzt.')
        setIsUploadOpen(false)
      }
      await loadMedia()
    } catch (err) {
      setUploadError(readErrorMessage(err, 'Upload fehlgeschlagen.'))
    } finally {
      setUploadProgress(null)
      setTimeout(() => setToast(null), 3500)
    }
  }, [fansubId, loadMedia, resetUploadForm, selectedFiles, setIsUploadOpen, setToast, setUploadError, setUploadProgress, uploadCategory])

  const handleSave = useCallback(async (item: FansubGroupMediaItem) => {
    const draft = drafts[item.id]
    if (!draft || !(canUpdate || (canUpdateOwn && item.uploaded_by_current_user))) return
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      const textMetadata = {
        title: draft.title.trim() || null,
        description: draft.description.trim() || null,
        alt_text: draft.alt_text.trim() || null,
      }
      const patch = canUpdate
        ? {
            visibility: draft.visibility,
            category: draft.category,
            ...textMetadata,
            ...(canReview ? { review_status: draft.review_status } : {}),
          }
        : textMetadata
      await patchFansubMediaReview(fansubId, item.id, patch, undefined)
      setToast('Änderungen gespeichert.')
      setEditingMediaId(null)
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Änderungen konnten nicht gespeichert werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }, [canReview, canUpdate, canUpdateOwn, drafts, fansubId, loadMedia, setEditingMediaId, setSaveErrors, setSaving, setToast])

  const handleQuickReview = useCallback(async (item: FansubGroupMediaItem, reviewStatus: FansubMediaReviewStatus) => {
    if (!canReview) return
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      await patchFansubMediaReview(fansubId, item.id, { review_status: reviewStatus }, undefined)
      updateMediaReviewStatus([item.id], reviewStatus)
      setToast(reviewStatus === 'freigegeben' ? 'Medium freigegeben.' : 'Medium abgelehnt.')
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Prüfstatus konnte nicht aktualisiert werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }, [canReview, fansubId, setSaveErrors, setSaving, setToast, updateMediaReviewStatus])

  const handleBulkReview = useCallback(async (reviewStatus: FansubMediaReviewStatus) => {
    if (!canReview || selectedMediaIds.size === 0) return
    const targetIds = Array.from(selectedMediaIds).filter((id) => filteredMediaIdSet.has(id))
    if (targetIds.length === 0) return

    setBulkError(null)
    setBulkSavingStatus(reviewStatus)

    const results = await Promise.all(
      targetIds.map(async (mediaId) => {
        try {
          await patchFansubMediaReview(fansubId, mediaId, { review_status: reviewStatus }, undefined)
          return { mediaId, ok: true as const }
        } catch (err) {
          return { mediaId, ok: false as const, message: readErrorMessage(err, 'Prüfstatus konnte nicht aktualisiert werden.') }
        }
      }),
    )

    const successfulIds = results.filter((result) => result.ok).map((result) => result.mediaId)
    const failed = results.filter((result) => !result.ok)
    if (successfulIds.length > 0) {
      updateMediaReviewStatus(successfulIds, reviewStatus)
    }

    if (failed.length === 0) {
      setSelectedMediaIds(new Set())
      setToast(
        reviewStatus === 'freigegeben'
          ? `${successfulIds.length} Medien freigegeben.`
          : `${successfulIds.length} Medien abgelehnt.`,
      )
      setTimeout(() => setToast(null), 3500)
    } else {
      setSelectedMediaIds(new Set(failed.map((result) => result.mediaId)))
      setBulkError(`${failed.length} von ${targetIds.length} Medien konnten nicht aktualisiert werden. ${failed[0]?.message ?? ''}`.trim())
    }

    setBulkSavingStatus(null)
  }, [canReview, fansubId, filteredMediaIdSet, selectedMediaIds, setBulkError, setBulkSavingStatus, setSelectedMediaIds, setToast, updateMediaReviewStatus])

  const applyMediaReorder = useCallback(async (sourceMediaId: number, targetMediaId: number) => {
    if (!canReorderMedia || sourceMediaId === targetMediaId) {
      return
    }

    const previousItems = mediaItems
    const sourceIndex = previousItems.findIndex((item) => item.id === sourceMediaId)
    const targetIndex = previousItems.findIndex((item) => item.id === targetMediaId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const reorderedItems = [...previousItems]
    const [movedItem] = reorderedItems.splice(sourceIndex, 1)
    reorderedItems.splice(targetIndex, 0, movedItem)
    const normalizedItems = reorderedItems.map((item, index) => ({
      ...item,
      sort_order: (index + 1) * SORT_ORDER_STEP,
    }))

    setReorderError(null)
    setReorderSaving(true)
    setMediaItems(normalizedItems)
    setDrafts((current) => {
      const next = { ...current }
      normalizedItems.forEach((item) => {
        if (next[item.id]) {
          next[item.id] = { ...next[item.id], sort_order: item.sort_order }
        }
      })
      return next
    })

    try {
      await reorderFansubGroupMedia(fansubId, { mediaIds: normalizedItems.map((item) => item.id) }, undefined)
      setToast('Reihenfolge gespeichert.')
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setMediaItems(previousItems)
      setDrafts(Object.fromEntries(previousItems.map((item) => [item.id, itemToDraft(item)])))
      setReorderError(readErrorMessage(err, 'Reihenfolge konnte nicht gespeichert werden.'))
    } finally {
      setReorderSaving(false)
    }
  }, [canReorderMedia, fansubId, mediaItems, setDrafts, setMediaItems, setReorderError, setReorderSaving, setToast])

  const handleReorderDrop = useCallback(async (event: DragEvent<HTMLElement>, targetItem: FansubGroupMediaItem) => {
    if (!canReorderMedia || draggedMediaId === null || draggedMediaId === targetItem.id) {
      handleDragEnd()
      return
    }
    event.preventDefault()
    event.stopPropagation()

    const sourceMediaId = draggedMediaId
    handleDragEnd()
    await applyMediaReorder(sourceMediaId, targetItem.id)
  }, [applyMediaReorder, canReorderMedia, draggedMediaId, handleDragEnd])

  const handlePointerDragEnd = useCallback(async (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointerState = pointerReorderRef.current
    if (!pointerState || pointerState.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.releasePointerCapture(event.pointerId)

    const targetMediaId = dragOverMediaId ?? getPointerTargetMediaId(event)
    const sourceMediaId = pointerState.mediaId
    handleDragEnd()
    if (targetMediaId !== null && targetMediaId !== sourceMediaId) {
      await applyMediaReorder(sourceMediaId, targetMediaId)
    }
  }, [applyMediaReorder, dragOverMediaId, getPointerTargetMediaId, handleDragEnd, pointerReorderRef])

  const handleDelete = useCallback(async (item: FansubGroupMediaItem) => {
    if (!canDeleteMediaItem(item)) return
    setSaving((prev) => ({ ...prev, [item.id]: true }))
    try {
      await deleteFansubGroupMedia(fansubId, item.id)
      setToast('Medium aus den Gruppenmedien entfernt.')
      setPendingDeleteItem(null)
      if (editingMediaId === item.id) setEditingMediaId(null)
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Medium konnte nicht aus den Gruppenmedien entfernt werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }, [canDeleteMediaItem, editingMediaId, fansubId, loadMedia, setEditingMediaId, setPendingDeleteItem, setSaveErrors, setSaving, setToast])

  return {
    loadMedia,
    handleUpload,
    handleSave,
    handleQuickReview,
    handleBulkReview,
    applyMediaReorder,
    handleReorderDrop,
    handlePointerDragEnd,
    handleDelete,
  }
}
