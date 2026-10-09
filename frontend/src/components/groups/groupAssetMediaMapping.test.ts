import { describe, expect, it } from 'vitest'

import type { GroupAssetImage } from '@/types/groupAsset'

import { toGroupAssetLightboxItem } from './groupAssetMediaMapping'

function makeImage(overrides: Partial<GroupAssetImage> = {}): GroupAssetImage {
  return {
    id: 'img-abc123',
    title: 'Ein Bildtitel',
    image_url: 'https://example.test/image.jpg',
    thumbnail_url: 'https://example.test/thumb.jpg',
    order: 0,
    ...overrides,
  }
}

describe('toGroupAssetLightboxItem', () => {
  it('setzt jedes D-19-Metadatenfeld außer title/media_type auf undefined (strukturelle, nicht zufällige Auslassung)', () => {
    const image = makeImage()

    const result = toGroupAssetLightboxItem(image, 3)

    expect(result.caption).toBeUndefined()
    expect(result.description).toBeUndefined()
    expect(result.display_url).toBeUndefined()
    expect(result.category).toBeUndefined()
    expect(result.episode_label).toBeUndefined()
    expect(result.release_version_label).toBeUndefined()
    expect(result.release_href).toBeUndefined()
    expect(result.title).toBe('Ein Bildtitel')
    expect(result.media_type).toBe('Ein Bildtitel')
  })

  it('verwendet den übergebenen index als synthetische numerische id, nicht die string-id des Bildes', () => {
    const image = makeImage({ id: 'img-xyz789' })

    const result = toGroupAssetLightboxItem(image, 7)

    expect(result.id).toBe(7)
    expect(typeof result.id).toBe('number')
  })

  it('mappt image_url auf original_url und thumbnail_url 1:1 durch', () => {
    const image = makeImage({
      image_url: 'https://example.test/full.jpg',
      thumbnail_url: 'https://example.test/thumb-2.jpg',
    })

    const result = toGroupAssetLightboxItem(image, 0)

    expect(result.original_url).toBe('https://example.test/full.jpg')
    expect(result.thumbnail_url).toBe('https://example.test/thumb-2.jpg')
  })
})
