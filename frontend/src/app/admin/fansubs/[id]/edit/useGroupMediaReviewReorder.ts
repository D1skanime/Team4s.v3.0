import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'

import type { FansubGroupMediaItem } from '@/lib/api'

// Zweite, von der Upload-Zustandsauslagerung (180-07) unabhängige Extraktionsachse:
// Drag/Pointer-Reorder-Zustand und -Handler, damit GroupMediaReviewSection.tsx unter dem
// 450-Zeilen-Budget aus CLAUDE.md bleibt (analog zum Muster aus 180-06's
// useGroupMediaReviewFilters).

const POINTER_REORDER_THRESHOLD_PX = 6

interface PointerReorderState {
  mediaId: number
  pointerId: number
  startX: number
  startY: number
}

interface UseGroupMediaReviewReorderParams {
  canReorder: boolean
  isCanonicalReorderView: boolean
  isBulkSaving: boolean
}

export function useGroupMediaReviewReorder({
  canReorder,
  isCanonicalReorderView,
  isBulkSaving,
}: UseGroupMediaReviewReorderParams) {
  const pointerReorderRef = useRef<PointerReorderState | null>(null)
  const [draggedMediaId, setDraggedMediaId] = useState<number | null>(null)
  const [dragOverMediaId, setDragOverMediaId] = useState<number | null>(null)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [reorderError, setReorderError] = useState<string | null>(null)

  const canReorderMedia = canReorder && isCanonicalReorderView && !isBulkSaving && !reorderSaving

  function handleDragStart(event: DragEvent<HTMLButtonElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia) return
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(item.id))
    setReorderError(null)
    setDraggedMediaId(item.id)
  }

  function handleDragOver(event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia || draggedMediaId === null || draggedMediaId === item.id) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverMediaId(item.id)
  }

  function handleDragEnd() {
    pointerReorderRef.current = null
    setDraggedMediaId(null)
    setDragOverMediaId(null)
  }

  function getPointerTargetMediaId(event: ReactPointerEvent<HTMLButtonElement>): number | null {
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)
    const mediaCard = targetElement?.closest<HTMLElement>('[data-media-card-id]')
    const targetMediaId = Number(mediaCard?.dataset.mediaCardId)
    return Number.isInteger(targetMediaId) ? targetMediaId : null
  }

  function handlePointerDragStart(event: ReactPointerEvent<HTMLButtonElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia || event.pointerType === 'mouse') return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerReorderRef.current = {
      mediaId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    setReorderError(null)
    setDraggedMediaId(item.id)
    setDragOverMediaId(null)
  }

  function handlePointerDragMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const pointerState = pointerReorderRef.current
    if (!canReorderMedia || !pointerState || pointerState.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    const movementX = Math.abs(event.clientX - pointerState.startX)
    const movementY = Math.abs(event.clientY - pointerState.startY)
    if (movementX < POINTER_REORDER_THRESHOLD_PX && movementY < POINTER_REORDER_THRESHOLD_PX) return

    const targetMediaId = getPointerTargetMediaId(event)
    setDragOverMediaId(targetMediaId !== null && targetMediaId !== pointerState.mediaId ? targetMediaId : null)
  }

  return {
    pointerReorderRef,
    draggedMediaId,
    dragOverMediaId,
    setDragOverMediaId,
    reorderSaving,
    setReorderSaving,
    reorderError,
    setReorderError,
    canReorderMedia,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getPointerTargetMediaId,
    handlePointerDragStart,
    handlePointerDragMove,
  }
}
