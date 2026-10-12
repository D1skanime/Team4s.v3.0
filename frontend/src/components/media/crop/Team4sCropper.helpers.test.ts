import { describe, expect, it } from 'vitest'

import {
  WIDE_CROP_ASPECT_THRESHOLD,
  computeCropViewportAspectRatio,
  cropperObjectFitFor,
  isWideCropAspect,
} from './Team4sCropper.helpers'

describe('isWideCropAspect', () => {
  it('treats a square avatar crop (aspect 1) as not wide', () => {
    expect(isWideCropAspect(1)).toBe(false)
  })

  it('treats a 5:1 banner crop as wide', () => {
    expect(isWideCropAspect(1920 / 384)).toBe(true)
  })

  it('is exclusive at the threshold itself', () => {
    expect(isWideCropAspect(WIDE_CROP_ASPECT_THRESHOLD)).toBe(false)
    expect(isWideCropAspect(WIDE_CROP_ASPECT_THRESHOLD + 0.01)).toBe(true)
  })
})

describe('computeCropViewportAspectRatio', () => {
  it('leaves the square avatar viewport ratio unchanged (D-UAT: optically unchanged)', () => {
    expect(computeCropViewportAspectRatio(1)).toBe(1)
  })

  it('gives the 5:1 profile-background viewport extra vertical room below the crop ratio', () => {
    const viewportRatio = computeCropViewportAspectRatio(5)
    expect(viewportRatio).toBeLessThan(5)
    expect(viewportRatio).toBeGreaterThan(1)
  })

  it('gives the fansub banner crop (1200/220 ~= 5.45) extra vertical room too', () => {
    const bannerAspect = 1200 / 220
    const viewportRatio = computeCropViewportAspectRatio(bannerAspect)
    expect(viewportRatio).toBeLessThan(bannerAspect)
  })
})

describe('cropperObjectFitFor', () => {
  it('keeps contain fit for the square avatar crop', () => {
    expect(cropperObjectFitFor(1)).toBe('contain')
  })

  it('switches to horizontal-cover for the 5:1 banner crop so the image fills the width', () => {
    expect(cropperObjectFitFor(5)).toBe('horizontal-cover')
  })

  it('switches to horizontal-cover for a 16:9 source image framed into a 5:1 crop', () => {
    // User's own example: aspect 5:1 target + a 16:9 (1.78) source image -- the target is
    // wider than the image, so filling by width (horizontal-cover) is the correct cover-fit
    // axis; the image must overflow vertically, not be letterboxed down to the crop's height.
    const targetAspect = 5
    const imageAspect = 16 / 9
    expect(targetAspect).toBeGreaterThan(imageAspect)
    expect(cropperObjectFitFor(targetAspect)).toBe('horizontal-cover')
  })
})
