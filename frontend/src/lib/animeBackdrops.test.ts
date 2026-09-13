import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getImageProps } from 'next/image'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import nextConfig from '../../next.config.mjs'

import {
  normalizeBackdropImageURLs, normalizeThemeVideoURLs, resolveAnimeCoverURL,
  resolveAnimeImageURL, resolveInfoBannerURL, resolveInfoLogoURL,
} from './animeBackdrops'
import type { AnimeBackdropManifest } from '@/types/anime'

const origin = 'http://192.168.235.196:18092'
const provider = '/api/v1/media/image?item_id=series&kind=primary&provider=jellyfin&index=2&tag=original'

beforeEach(() => {
  // Next injects this object at compile time; use the actual project config and real generator.
  vi.stubGlobal('process', { ...process, env: {
    ...process.env, NEXT_PUBLIC_API_URL: origin,
    __NEXT_IMAGE_OPTS: { ...imageConfigDefault, ...nextConfig.images },
  } })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function url(value: string | null) { return new URL(value || '', 'http://team4s.local') }
function manifest(overrides: Partial<AnimeBackdropManifest>): AnimeBackdropManifest {
  return { anime_id: 1, provider: 'jellyfin', backdrops: [], theme_videos: [], ...overrides }
}

describe('bounded anime image delivery', () => {
  it.each([provider, origin + provider])('bounds the real provider while retaining identity query parameters: %s', (source) => {
    const output = url(resolveAnimeCoverURL(source))
    expect(output.origin).toBe(origin)
    expect(output.pathname).toBe('/api/v1/media/image')
    expect(Object.fromEntries(output.searchParams)).toEqual({
      item_id: 'series', kind: 'primary', provider: 'jellyfin', index: '2', tag: 'original', width: '512', quality: '75',
    })
  })

  it('replaces existing provider bounds without duplicate query keys', () => {
    const output = url(resolveAnimeCoverURL(provider + '&width=4000&width=3000&quality=100'))
    expect(output.searchParams.getAll('width')).toEqual(['512'])
    expect(output.searchParams.getAll('quality')).toEqual(['75'])
  })

  it.each(['/media/anime/1/poster/asset/original.jpg', '/covers/anime.jpg'])('uses a real generated local optimizer candidate at most 512px: %s', (source) => {
    const generated = getImageProps({ src: source, alt: '', width: 512, height: 768, quality: 75, sizes: '512px' }).props
    const candidates = generated.srcSet?.split(', ').map((candidate) => candidate.split(' ')[0])
    const result = resolveAnimeCoverURL(source)
    const output = url(result)
    expect(candidates).toContain(result)
    expect(output.pathname).toBe('/_next/image')
    expect(output.searchParams.get('url')).toBe(source)
    expect(output.searchParams.get('w')).toBe('512')
    expect(output.searchParams.get('q')).toBe('75')
    expect(url(output.searchParams.get('url')).search).toBe('')
    // The default src points at the largest generated candidate, so it is not the budget.
    expect(Number(url(generated.src).searchParams.get('w'))).toBeGreaterThan(512)
    expect(result).not.toBe(generated.src)
  })

  it('keeps an already bounded generated source unchanged instead of optimizing it twice', () => {
    const first = resolveAnimeCoverURL('/covers/anime.jpg')
    expect(resolveAnimeCoverURL(first)).toBe(first)
    expect(url(first).searchParams.get('url')).toBe('/covers/anime.jpg')
  })

  it('uses the configured API-file optimizer class without pretending its width query resizes files', () => {
    const source = origin + '/api/v1/media/files/logo.png'
    const output = url(resolveAnimeImageURL(source, 760))
    expect(output.pathname).toBe('/_next/image')
    expect(output.searchParams.get('url')).toBe(source)
    expect(Number(output.searchParams.get('w'))).toBeLessThanOrEqual(760)
    expect(url(output.searchParams.get('url')).search).toBe('')
  })

  it.each([
    null, undefined, '', 'https://untrusted.example/image.jpg',
    'https://untrusted.example/api/v1/media/image?item_id=x',
    '/\\\\untrusted.example/api/v1/media/image?item_id=x',
    'http://user:pass@192.168.235.196:18092/api/v1/media/image?item_id=x',
    '//untrusted.example/covers/image.jpg', 'http://[invalid', 'javascript:alert(1)',
    '/media/admin/private/original.jpg', '/covers/../private.jpg', '/covers/local.jpg?width=512',
    '/_next/image?url=https%3A%2F%2Funtrusted.example%2Fx.jpg&w=512&q=75',
  ])('bounds the existing placeholder for an unusable cover and omits optional media: %s', (source) => {
    const fallback = url(resolveAnimeCoverURL(source))
    expect(fallback.pathname).toBe('/_next/image')
    expect(fallback.searchParams.get('url')).toBe('/covers/placeholder.jpg')
    expect(fallback.searchParams.get('w')).toBe('512')
    expect(resolveAnimeImageURL(source, 512)).toBeNull()
  })

  it('retains the existing bare cover filename convention without filename-derived variants', () => {
    const output = url(resolveAnimeCoverURL('named-cover.jpg'))
    expect(output.searchParams.get('url')).toBe('/covers/named-cover.jpg')
  })

  it('keeps missing-file delivery bounded without prefetching or original fallback', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const source = '/covers/missing-404.jpg'
    const output = resolveAnimeCoverURL(source)
    expect(url(output).searchParams.get('url')).toBe(source)
    expect(output).not.toBe(source)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('bounds banner/logo/backdrop slots through the same delivery classes', () => {
    const data = manifest({ banner_url: provider, logo_url: provider, backdrops: [provider, '', 'https://untrusted.example/a.jpg', '/media/anime/1/backdrop.jpg'] })
    expect(url(resolveInfoBannerURL(data)).searchParams.get('width')).toBe('1280')
    expect(url(resolveInfoLogoURL(data)).searchParams.get('width')).toBe('760')
    const backdrops = normalizeBackdropImageURLs(data)
    expect(backdrops).toHaveLength(2)
    expect(url(backdrops[0]).searchParams.get('width')).toBe('1920')
    expect(url(backdrops[1]).pathname).toBe('/_next/image')
    expect(url(resolveInfoBannerURL(manifest({ backdrops: [provider] }))).searchParams.get('width')).toBe('1280')
    expect(resolveInfoLogoURL(manifest({ logo_url: 'https://untrusted.example/logo.png' }))).toBeNull()
  })

  it('does not add image parameters or alter the video resolver', () => {
    expect(normalizeThemeVideoURLs(manifest({ theme_videos: [' /api/v1/media/video?item_id=video&provider=jellyfin ', ''] })))
      .toEqual([origin + '/api/v1/media/video?item_id=video&provider=jellyfin'])
  })
})
