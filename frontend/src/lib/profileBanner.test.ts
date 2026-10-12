import { describe, expect, it } from 'vitest'

import {
  PROFILE_BANNER_ASPECT_RATIO,
  computeVisibleBannerFraction,
  computeVisibleBannerGuideLines,
} from './profileBanner'

describe('computeVisibleBannerFraction', () => {
  it('shows the full 5:1 crop once the container is wide enough to clear the min-height floor', () => {
    // 1384px wide / 5 = 276.8px, which already clears a 224px or 230px floor.
    expect(computeVisibleBannerFraction(1384, 224, PROFILE_BANNER_ASPECT_RATIO)).toBe(1)
    expect(computeVisibleBannerFraction(1384, 230, PROFILE_BANNER_ASPECT_RATIO)).toBe(1)
  })

  it('shows only a centered middle strip once the min-height floor forces an upscale-and-crop', () => {
    // 375px wide / 5 = 75px, far below a 230px floor -- cover scales up to 230px tall, which
    // widens the displayed image to 230*5=1150px, so only 375/1150 of the width stays visible.
    const fraction = computeVisibleBannerFraction(375, 230, PROFILE_BANNER_ASPECT_RATIO)
    expect(fraction).toBeCloseTo(375 / 1150, 5)
    expect(fraction).toBeLessThan(1)
    expect(fraction).toBeGreaterThan(0)
  })

  it('treats the breakeven width (minHeight * aspectRatio) as exactly fully visible', () => {
    expect(computeVisibleBannerFraction(1150, 230, PROFILE_BANNER_ASPECT_RATIO)).toBe(1)
  })

  it('returns 1 for degenerate (non-positive) inputs instead of dividing by zero', () => {
    expect(computeVisibleBannerFraction(0, 230, PROFILE_BANNER_ASPECT_RATIO)).toBe(1)
    expect(computeVisibleBannerFraction(375, 0, PROFILE_BANNER_ASPECT_RATIO)).toBe(1)
    expect(computeVisibleBannerFraction(375, 230, 0)).toBe(1)
  })
})

describe('computeVisibleBannerGuideLines', () => {
  it('returns null when the full crop is visible (nothing to mark)', () => {
    expect(computeVisibleBannerGuideLines(1384, 230, PROFILE_BANNER_ASPECT_RATIO)).toBeNull()
  })

  it('centers the guide lines symmetrically around the middle for a narrow reference width', () => {
    const guides = computeVisibleBannerGuideLines(375, 230, PROFILE_BANNER_ASPECT_RATIO)
    expect(guides).not.toBeNull()
    expect(guides!.leftPercent).toBeCloseTo(100 - guides!.rightPercent, 5)
    expect(guides!.leftPercent).toBeLessThan(50)
    expect(guides!.rightPercent).toBeGreaterThan(50)
    // 375/1150 ~= 0.3261 visible -> ~33.7% margin on each side.
    expect(guides!.leftPercent).toBeCloseTo(33.70, 1)
    expect(guides!.rightPercent).toBeCloseTo(66.30, 1)
  })
})
