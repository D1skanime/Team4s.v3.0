export function getNextBackdropIndex(currentIndex: number, totalCount: number): number {
  if (totalCount <= 0) return 0
  const safeCurrent = ((currentIndex % totalCount) + totalCount) % totalCount
  return (safeCurrent + 1) % totalCount
}

export function canSwapInPreloadedBackdrop(preloadSucceeded: boolean): boolean {
  return preloadSucceeded
}

export function resolveBackdropSlotsAfterPreload(params: {
  preloadSucceeded: boolean
  currentSlots: [string, string]
  visibleSlotIndex: 0 | 1
  nextUrl: string
}): { slots: [string, string]; visibleSlotIndex: 0 | 1 } {
  const { preloadSucceeded, currentSlots, visibleSlotIndex, nextUrl } = params

  if (!preloadSucceeded) {
    return { slots: currentSlots, visibleSlotIndex }
  }

  const hiddenSlotIndex: 0 | 1 = visibleSlotIndex === 0 ? 1 : 0
  const nextSlots: [string, string] = [...currentSlots] as [string, string]
  nextSlots[hiddenSlotIndex] = nextUrl

  return { slots: nextSlots, visibleSlotIndex: hiddenSlotIndex }
}
