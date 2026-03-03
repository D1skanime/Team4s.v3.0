export type CropSize = { w: number; h: number }
export type CropOffset = { x: number; y: number }

export type CropMetrics = {
  scale: number
  width: number
  height: number
  maxOffsetX: number
  maxOffsetY: number
}

export type CropDrawRect = {
  drawX: number
  drawY: number
  drawWidth: number
  drawHeight: number
}

export function computeCropMetrics(imageSize: CropSize | null, viewSize: number, zoom: number): CropMetrics | null {
  if (!imageSize) return null

  const baseScale = Math.max(viewSize / imageSize.w, viewSize / imageSize.h)
  const scale = baseScale * zoom
  const width = imageSize.w * scale
  const height = imageSize.h * scale

  return {
    scale,
    width,
    height,
    maxOffsetX: Math.max(0, (width - viewSize) / 2),
    maxOffsetY: Math.max(0, (height - viewSize) / 2),
  }
}

export function clampCropOffset(offset: CropOffset, metrics: CropMetrics | null): CropOffset {
  if (!metrics) return { x: 0, y: 0 }

  return {
    x: Math.max(-metrics.maxOffsetX, Math.min(metrics.maxOffsetX, offset.x)),
    y: Math.max(-metrics.maxOffsetY, Math.min(metrics.maxOffsetY, offset.y)),
  }
}

export function computeCropDrawRect(input: {
  imageNatural: CropSize
  cropMetrics: CropMetrics | null
  cropZoom: number
  cropOffset: CropOffset
  viewportWidth: number
  viewportHeight: number
  viewSize: number
  outputSize: number
}): CropDrawRect {
  const fallbackScale = Math.max(input.viewSize / input.imageNatural.w, input.viewSize / input.imageNatural.h) * input.cropZoom
  const renderScale = input.cropMetrics?.scale ?? fallbackScale

  const ratioX = input.outputSize / input.viewportWidth
  const ratioY = input.outputSize / input.viewportHeight

  const imageWidth = input.imageNatural.w * renderScale
  const imageHeight = input.imageNatural.h * renderScale

  const drawX = ((input.viewportWidth - imageWidth) / 2 + input.cropOffset.x) * ratioX
  const drawY = ((input.viewportHeight - imageHeight) / 2 + input.cropOffset.y) * ratioY
  const drawWidth = imageWidth * ratioX
  const drawHeight = imageHeight * ratioY

  return { drawX, drawY, drawWidth, drawHeight }
}
