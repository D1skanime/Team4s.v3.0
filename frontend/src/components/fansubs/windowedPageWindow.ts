/**
 * Direction-neutral, React-free window helpers for useWindowedEpisodePages (Quick-Task
 * 260920-sad). Extracted so the forward and backward restore paths share exactly one
 * eviction/adjacency implementation instead of duplicating it per direction.
 */

export type WindowDirection = 'before' | 'after'

/**
 * Slides `targetId` into `windowPageIds` on the given side, evicting from the opposite end
 * once `maxSize` is exceeded.
 *
 * `direction === 'before'`: `targetId` is prepended; on overflow the LAST element (farthest
 * from the touched end) is evicted via `slice(0, maxSize)`.
 * `direction === 'after'`: `targetId` is appended; on overflow the FIRST element is evicted
 * via `slice(length - maxSize)`.
 */
export function applyWindowSlide(
  windowPageIds: string[],
  targetId: string,
  direction: WindowDirection,
  maxSize: number,
): { windowPageIds: string[]; evictedId: string | null } {
  if (direction === 'before') {
    const slid = [targetId, ...windowPageIds]
    if (slid.length > maxSize) {
      const evictedId = slid[slid.length - 1]
      return { windowPageIds: slid.slice(0, maxSize), evictedId }
    }
    return { windowPageIds: slid, evictedId: null }
  }
  const slid = [...windowPageIds, targetId]
  if (slid.length > maxSize) {
    const evictedId = slid[0]
    return { windowPageIds: slid.slice(slid.length - maxSize), evictedId }
  }
  return { windowPageIds: slid, evictedId: null }
}

/**
 * Finds the page id adjacent to the current DOM window's edge (in `direction`) within the
 * full `orderedPageIds` history -- never the global tail/head of `orderedPageIds` itself.
 * This is the central fix: callers must consult this before ever falling back to a page's
 * own `pagination.next_cursor`, so a known-but-unmounted page is always restored first.
 *
 * `direction === 'before'`: looks at the id in front of `windowPageIds[0]`.
 * `direction === 'after'`: looks at the id behind the last element of `windowPageIds`.
 * Returns `undefined` when no such adjacent known page exists (window already touches that
 * edge of `orderedPageIds`, or the window is empty / its edge id is missing from
 * `orderedPageIds`).
 */
export function findAdjacentKnownPageId(
  orderedPageIds: string[],
  windowPageIds: string[],
  direction: WindowDirection,
): string | undefined {
  if (direction === 'before') {
    const firstId = windowPageIds[0]
    if (!firstId) return undefined
    const index = orderedPageIds.indexOf(firstId)
    if (index <= 0) return undefined
    return orderedPageIds[index - 1]
  }
  const lastId = windowPageIds[windowPageIds.length - 1]
  if (!lastId) return undefined
  const index = orderedPageIds.indexOf(lastId)
  if (index === -1 || index >= orderedPageIds.length - 1) return undefined
  return orderedPageIds[index + 1]
}
