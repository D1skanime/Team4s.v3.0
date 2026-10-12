import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'

import type { FansubGroupMediaItem } from '@/lib/api'

import {
  GROUP_MEDIA_REORDER_MIME_TYPE,
  isInteractiveDragTarget,
  isReorderDrag,
} from './useGroupMediaReviewReorder.helpers'

// Zweite, von der Upload-Zustandsauslagerung (180-07) unabhängige Extraktionsachse:
// Drag/Pointer-Reorder-Zustand und -Handler, damit GroupMediaReviewSection.tsx unter dem
// 450-Zeilen-Budget aus CLAUDE.md bleibt (analog zum Muster aus 180-06's
// useGroupMediaReviewFilters).
//
// Live-UAT-Fix (2026-10-12): dragover/drop dürfen sich nicht auf den React-State
// `draggedMediaId` verlassen, der beim allerersten dragover nach dragstart noch nicht
// committed ist. `sourceMediaIdRef` ist die synchron aktuelle Quelle der Wahrheit für jede
// native Drag-Entscheidung; `draggedMediaId`/`dragOverMediaId` bleiben reiner UI-Zustand
// (Styling, Re-Render) und sind für die Drop-Entscheidung selbst irrelevant.

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
  const sourceMediaIdRef = useRef<number | null>(null)
  const [draggedMediaId, setDraggedMediaId] = useState<number | null>(null)
  const [dragOverMediaId, setDragOverMediaId] = useState<number | null>(null)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [reorderError, setReorderError] = useState<string | null>(null)

  const canReorderMedia = canReorder && isCanonicalReorderView && !isBulkSaving && !reorderSaving

  function handleDragStart(event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia) return
    if (isInteractiveDragTarget(event.target as Element)) {
      event.preventDefault()
      return
    }
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(item.id))
    event.dataTransfer.setData(GROUP_MEDIA_REORDER_MIME_TYPE, String(item.id))
    sourceMediaIdRef.current = item.id
    setReorderError(null)
    setDraggedMediaId(item.id)
  }

  function handleDragOver(event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) {
    // Muss unabhängig von draggedMediaId (React-State) entscheiden -- beim allerersten
    // dragover nach dragstart ist der Re-Render mit dem neuen State ggf. noch nicht
    // committed. event.dataTransfer.types ist dagegen schon beim dragstart synchron gesetzt.
    if (!isReorderDrag(event.dataTransfer.types, canReorderMedia)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (sourceMediaIdRef.current === item.id) return
    if (dragOverMediaId !== item.id) setDragOverMediaId(item.id)
  }

  function handleDragEnd() {
    sourceMediaIdRef.current = null
    pointerReorderRef.current = null
    setDraggedMediaId(null)
    setDragOverMediaId(null)
  }

  function getPointerTargetMediaId(event: ReactPointerEvent<HTMLElement>): number | null {
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)
    const mediaCard = targetElement?.closest<HTMLElement>('[data-media-card-id]')
    const targetMediaId = Number(mediaCard?.dataset.mediaCardId)
    return Number.isInteger(targetMediaId) ? targetMediaId : null
  }

  function handlePointerDragStart(event: ReactPointerEvent<HTMLElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia || event.pointerType === 'mouse') return
    if (isInteractiveDragTarget(event.target as Element)) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerReorderRef.current = {
      mediaId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    sourceMediaIdRef.current = item.id
    setReorderError(null)
    setDraggedMediaId(item.id)
    setDragOverMediaId(null)
  }

  function handlePointerDragMove(event: ReactPointerEvent<HTMLElement>) {
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
    sourceMediaIdRef,
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
