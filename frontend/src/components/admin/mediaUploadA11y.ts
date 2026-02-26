export type CropOffsetDelta = { x: number; y: number }

const CROP_KEYBOARD_STEP = 6
const CROP_KEYBOARD_FAST_STEP = 16

export function getCropOffsetDeltaForKey(key: string, shiftKey: boolean): CropOffsetDelta | null {
  const step = shiftKey ? CROP_KEYBOARD_FAST_STEP : CROP_KEYBOARD_STEP

  if (key === 'ArrowLeft') return { x: -step, y: 0 }
  if (key === 'ArrowRight') return { x: step, y: 0 }
  if (key === 'ArrowUp') return { x: 0, y: -step }
  if (key === 'ArrowDown') return { x: 0, y: step }

  return null
}

export function getFocusTrapNextIndex(currentIndex: number, total: number, shiftKey: boolean): number {
  if (total <= 0) return -1

  if (currentIndex < 0) {
    return shiftKey ? total - 1 : 0
  }

  if (shiftKey) {
    return currentIndex === 0 ? total - 1 : currentIndex - 1
  }

  return currentIndex === total - 1 ? 0 : currentIndex + 1
}
