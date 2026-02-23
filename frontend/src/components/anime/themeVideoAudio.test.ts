import { describe, expect, it } from 'vitest'

import { shouldRenderEnableAudioButton } from './themeVideoAudio'

describe('shouldRenderEnableAudioButton', () => {
  it('returns true when theme video is visible, has url, and is muted', () => {
    expect(shouldRenderEnableAudioButton(true, '/api/v1/media/video?x=1', true)).toBe(true)
  })

  it('returns false when video is not visible', () => {
    expect(shouldRenderEnableAudioButton(false, '/api/v1/media/video?x=1', true)).toBe(false)
  })

  it('returns false when video url is missing', () => {
    expect(shouldRenderEnableAudioButton(true, '', true)).toBe(false)
    expect(shouldRenderEnableAudioButton(true, null, true)).toBe(false)
  })

  it('returns false when video audio is already unmuted', () => {
    expect(shouldRenderEnableAudioButton(true, '/api/v1/media/video?x=1', false)).toBe(false)
  })
})
