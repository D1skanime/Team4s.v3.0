import { describe, expect, it } from 'vitest'

import type { PublicReleaseImage } from '@/types/releaseDetail'

import { toScreenshotLightboxItem } from './screenshotGalleryMapping'

function makeImage(overrides: Partial<PublicReleaseImage> = {}): PublicReleaseImage {
  return {
    id: 1,
    category: 'screenshot',
    thumbnail_url: 'https://example.com/thumb.jpg',
    original_url: 'https://example.com/original.jpg',
    display_url: null,
    title: null,
    caption: null,
    author_name: null,
    is_preview_candidate: false,
    is_highlight: false,
    highlight_order: null,
    ...overrides,
  }
}

describe('toScreenshotLightboxItem', () => {
  it('verwendet den Bildtitel, wenn vorhanden', () => {
    const image = makeImage({ title: 'Mein Screenshot' })

    const item = toScreenshotLightboxItem(image, 'Folge 1')

    expect(item.title).toBe('Mein Screenshot')
  })

  it('fällt auf "Fansub Screenshot" zurück, wenn kein Titel vorhanden ist', () => {
    const image = makeImage({ title: null })

    const item = toScreenshotLightboxItem(image, 'Folge 1')

    expect(item.title).toBe('Fansub Screenshot')
  })

  it('gibt episode_label unverändert durch', () => {
    const image = makeImage()

    const item = toScreenshotLightboxItem(image, 'Folge 7')

    expect(item.episode_label).toBe('Folge 7')
  })

  it('setzt release_version_label und release_href immer auf undefined, unabhängig vom Eingabebild', () => {
    const image = makeImage({ caption: 'irrelevant' })

    const item = toScreenshotLightboxItem(image, 'Folge 7')

    expect(item.release_version_label).toBeUndefined()
    expect(item.release_href).toBeUndefined()
  })
})
