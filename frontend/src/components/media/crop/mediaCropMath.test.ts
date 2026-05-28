import { describe, expect, it } from 'vitest'

import { clampCropOffset, computeCropDrawRect, computeCropMetrics } from './mediaCropMath'

describe('computeCropMetrics', () => {
  it('derives stable metrics from image size, view size, and zoom', () => {
    const metrics = computeCropMetrics({ w: 1024, h: 512 }, 260, 1.2)

    expect(metrics).not.toBeNull()
    expect(metrics?.scale).toBeCloseTo(0.609375, 8)
    expect(metrics?.width).toBeCloseTo(624, 8)
    expect(metrics?.height).toBeCloseTo(312, 8)
    expect(metrics?.maxOffsetX).toBeCloseTo(442, 8)
    expect(metrics?.maxOffsetY).toBeCloseTo(286, 8)
  })

  it('returns null when image size is not ready', () => {
    expect(computeCropMetrics(null, 260, 1.2)).toBeNull()
  })

  it('supports square avatar view geometry with symmetric bounds', () => {
    const metrics = computeCropMetrics({ w: 800, h: 800 }, 320, 1.5)

    expect(metrics?.width).toBeCloseTo(metrics?.height ?? 0, 8)
    expect(metrics?.maxOffsetX).toBeCloseTo(metrics?.maxOffsetY ?? 0, 8)
  })

  it('allows panning until the image edge can touch the crop circle', () => {
    const metrics = computeCropMetrics({ w: 600, h: 336 }, 340, 0.6)

    expect(metrics?.width).toBeCloseTo(364.2857142857, 8)
    expect(metrics?.height).toBeCloseTo(204, 8)
    expect(metrics?.maxOffsetX).toBeCloseTo(352.1428571429, 8)
    expect(metrics?.maxOffsetY).toBeCloseTo(272, 8)
  })
})

describe('clampCropOffset', () => {
  it('clamps offsets to current crop bounds', () => {
    const metrics = computeCropMetrics({ w: 1024, h: 512 }, 260, 1.2)
    const clamped = clampCropOffset({ x: 999, y: -999 }, metrics)

    expect(clamped).toEqual({ x: 442, y: -286 })
  })

  it('resets to zero when metrics are unavailable', () => {
    expect(clampCropOffset({ x: 12, y: -8 }, null)).toEqual({ x: 0, y: 0 })
  })
})

describe('computeCropDrawRect', () => {
  it('keeps deterministic draw geometry for the active crop state', () => {
    const metrics = computeCropMetrics({ w: 1024, h: 512 }, 260, 1.2)
    const draw = computeCropDrawRect({
      imageNatural: { w: 1024, h: 512 },
      cropMetrics: metrics,
      cropZoom: 1.2,
      cropOffset: { x: 30, y: -10 },
      viewportWidth: 260,
      viewportHeight: 260,
      viewSize: 260,
      outputSize: 512,
    })

    expect(draw.drawX).toBeCloseTo(-299.3230769231, 8)
    expect(draw.drawY).toBeCloseTo(-70.8923076923, 8)
    expect(draw.drawWidth).toBeCloseTo(1228.8, 8)
    expect(draw.drawHeight).toBeCloseTo(614.4, 8)
  })

  it('falls back to computed scale when crop metrics are unavailable', () => {
    const draw = computeCropDrawRect({
      imageNatural: { w: 800, h: 400 },
      cropMetrics: null,
      cropZoom: 1.1,
      cropOffset: { x: 12, y: -4 },
      viewportWidth: 300,
      viewportHeight: 260,
      viewSize: 260,
      outputSize: 512,
    })

    expect(draw.drawX).toBeCloseTo(-211.6266666667, 8)
    expect(draw.drawY).toBeCloseTo(-33.4769230769, 8)
    expect(draw.drawWidth).toBeCloseTo(976.2133333333, 8)
    expect(draw.drawHeight).toBeCloseTo(563.2, 8)
  })
})
