import type { FansubGroupMediaItem } from '@/lib/api'

// Pure helpers for the robust native-drag reorder fix (Live-UAT Phase 180, 2026-10-12). Kept as
// plain functions (no DOM/React dependency beyond the narrow shapes they actually read) so the
// regression can be covered by direct unit tests instead of render/click simulation.

/** Custom MIME type carried alongside `text/plain` on every reorder drag. Checking
 * `dataTransfer.types` for this value during dragover/dragenter lets every card decide
 * synchronously whether to accept the drop -- independent of React state, which is not yet
 * committed for the very first dragover right after dragstart. */
export const GROUP_MEDIA_REORDER_MIME_TYPE = 'application/x-team4s-group-media'

/** True when a dragover/dragenter event is carrying our own reorder payload and reordering is
 * currently allowed. Must be checked from `event.dataTransfer.types` (readable during dragover),
 * never from `getData()` (most browsers only expose values via getData() on `drop`). */
export function isReorderDrag(types: Iterable<string>, canReorderMedia: boolean): boolean {
  if (!canReorderMedia) return false
  for (const type of types) {
    if (type === GROUP_MEDIA_REORDER_MIME_TYPE) return true
  }
  return false
}

/** Resolves the dragged media's id on drop: prefers the native dataTransfer payload (the
 * authoritative source once a `drop` event fires, when getData() is reliably readable), falling
 * back to the synchronous ref captured at dragstart if the payload is missing/malformed. */
export function resolveSourceMediaId(
  dataTransfer: { getData: (type: string) => string },
  fallbackSourceId: number | null,
): number | null {
  const raw = dataTransfer.getData(GROUP_MEDIA_REORDER_MIME_TYPE)
  const parsed = Number(raw)
  if (Number.isInteger(parsed) && parsed > 0) return parsed
  return fallbackSourceId
}

/** True when an event's target is (or is nested inside) an interactive control -- these must
 * never start a whole-card drag, and must never trigger the card's own click-to-edit behavior. */
export function isInteractiveDragTarget(target: Element | null): boolean {
  return Boolean(target?.closest('button, input, label, a, select, textarea'))
}

/**
 * Pure reorder computation: moves `sourceId` to `targetId`'s position and recomputes
 * `sort_order` for every item using `sortOrderStep`. Returns null for a no-op reorder (same
 * item, or either id not found in `items`) so callers can skip the save/API-call entirely.
 */
export function computeReorderedMediaItems(
  items: FansubGroupMediaItem[],
  sourceId: number,
  targetId: number,
  sortOrderStep: number,
): FansubGroupMediaItem[] | null {
  if (sourceId === targetId) return null
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)
  if (sourceIndex === -1 || targetIndex === -1) return null

  const reordered = [...items]
  const [movedItem] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, movedItem)
  return reordered.map((item, index) => ({ ...item, sort_order: (index + 1) * sortOrderStep }))
}
