import { describe, expect, it, vi } from 'vitest'

import {
  isNavigationLinkTarget,
  isNavigationTriggerEvent,
  resolvesToDifferentLocation,
  shouldRenderEnableAudioButton,
  stopThemeVideoPlayback,
  type StoppableVideo,
} from './themeVideoAudio'

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

describe('resolvesToDifferentLocation', () => {
  const currentHref = 'http://localhost:3000/anime/7'

  it('returns false for the same path', () => {
    expect(resolvesToDifferentLocation('/anime/7', currentHref)).toBe(false)
  })

  it('returns true for a different path', () => {
    expect(resolvesToDifferentLocation('/anime/42', currentHref)).toBe(true)
  })

  it('returns true for a different origin', () => {
    expect(resolvesToDifferentLocation('http://example.com/anime/7', currentHref)).toBe(true)
  })

  it('returns false on parse failure', () => {
    expect(resolvesToDifferentLocation('http://[::1', currentHref)).toBe(false)
  })
})

function buildAnchorTarget(attributes: Record<string, string | null>) {
  return {
    closest: (selector: string) =>
      selector === 'a[href]'
        ? {
            getAttribute: (name: string) => attributes[name] ?? null,
          }
        : null,
  }
}

describe('isNavigationLinkTarget', () => {
  const currentHref = 'http://localhost:3000/anime/7'

  it('returns false for a target without a closest method', () => {
    expect(isNavigationLinkTarget({}, currentHref)).toBe(false)
    expect(isNavigationLinkTarget(null, currentHref)).toBe(false)
    expect(isNavigationLinkTarget('string', currentHref)).toBe(false)
  })

  it('returns false when closest finds no anchor', () => {
    const target = { closest: () => null }
    expect(isNavigationLinkTarget(target, currentHref)).toBe(false)
  })

  it('returns true for an anchor linking to a different page', () => {
    const target = buildAnchorTarget({ href: '/anime/42' })
    expect(isNavigationLinkTarget(target, currentHref)).toBe(true)
  })

  it('returns false for a pure fragment link', () => {
    const target = buildAnchorTarget({ href: '#irgendwas' })
    expect(isNavigationLinkTarget(target, currentHref)).toBe(false)
  })

  it('returns false for an anchor linking to the current page itself', () => {
    const target = buildAnchorTarget({ href: '/anime/7' })
    expect(isNavigationLinkTarget(target, currentHref)).toBe(false)
  })

  it('returns false for a target="_blank" anchor even when href points elsewhere', () => {
    const target = buildAnchorTarget({ href: '/anime/42', target: '_blank' })
    expect(isNavigationLinkTarget(target, currentHref)).toBe(false)
  })
})

describe('isNavigationTriggerEvent', () => {
  const currentHref = 'http://localhost:3000/anime/7'
  const navigatingTarget = buildAnchorTarget({ href: '/anime/42' })
  const nonNavigatingTarget = { closest: () => null }

  it('returns true for pointerdown on a navigating link target regardless of key', () => {
    expect(isNavigationTriggerEvent('pointerdown', navigatingTarget, undefined, currentHref)).toBe(true)
  })

  it('returns false for pointerdown on a non-navigating target', () => {
    expect(isNavigationTriggerEvent('pointerdown', nonNavigatingTarget, undefined, currentHref)).toBe(false)
  })

  it('returns true for keydown with Enter on a navigating link target', () => {
    expect(isNavigationTriggerEvent('keydown', navigatingTarget, 'Enter', currentHref)).toBe(true)
  })

  it('returns false for keydown with a non-Enter key on a navigating link target', () => {
    expect(isNavigationTriggerEvent('keydown', navigatingTarget, 'Tab', currentHref)).toBe(false)
  })
})

describe('stopThemeVideoPlayback', () => {
  it('mutes, pauses, removes src, and reloads the video exactly once each', () => {
    const video: StoppableVideo = {
      muted: false,
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
    }

    stopThemeVideoPlayback(video)

    expect(video.muted).toBe(true)
    expect(video.pause).toHaveBeenCalledTimes(1)
    expect(video.removeAttribute).toHaveBeenCalledWith('src')
    expect(video.load).toHaveBeenCalledTimes(1)
  })
})
