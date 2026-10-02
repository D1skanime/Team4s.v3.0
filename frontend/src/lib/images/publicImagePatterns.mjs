/**
 * Single source of truth for which image `src` values this app allows the
 * Next.js image optimizer to process (173-16 Task 0a).
 *
 * `next.config.mjs` imports this module to build `images.localPatterns` /
 * `images.remotePatterns`. `ResponsiveImage.tsx` imports the SAME data to
 * detect -- before next/image's own SSR validation throws E426/E231 -- that a
 * given `src` is NOT covered, and falls back to unoptimized rendering instead
 * of letting the page crash. One stale/unmigrated image URL must never take
 * down an entire public route (D-10).
 *
 * Deliberately framework/runtime-neutral: no Node builtins (`path`/`url`/`fs`),
 * so this file is safe to import from BOTH `next.config.mjs` (loaded directly
 * by Node, no bundler/TS step) and a `'use client'` component (browser
 * bundle, resolved by webpack/turbopack).
 */

export const LOCAL_IMAGE_PATTERNS = [
  { pathname: '/__phase120-image-probe/alpha-badge.png', search: '' },
  { pathname: '/member-achievement-badges/**', search: '' },
  { pathname: '/history-event-badges-transparent/**', search: '' },
  { pathname: '/covers/**', search: '' },
  // T-143-07-01: narrowed from a blanket /media/** wildcard to the explicit set
  // of legitimate namespaces the app actually serves (confirmed via a
  // repo-wide grep of backend PublicURL construction, 143-07-PLAN.md Task 2)
  // -- /media/admin/** (or any other future namespace) is deliberately
  // excluded so it can never be optimized/served through the public image
  // endpoint.
  { pathname: '/media/anime/**', search: '' },
  { pathname: '/media/profile/**', search: '' },
  { pathname: '/media/release-version/**', search: '' },
  // D-09/173-04: dedicated namespace for the new fansub group media
  // (logo/banner-style assets), narrowed the same way as the other
  // namespaces above -- not a blanket /media/** wildcard.
  { pathname: '/media/fansub/**', search: '' },
]

export const FIXED_REMOTE_IMAGE_URLS = [
  'http://127.0.0.1:3101/api/v1/media/phase120-project-cover.png',
  'http://127.0.0.1:3101/api/v1/media/phase120-group-logo.png',
]

export function configuredApiMediaPatterns(apiBaseURL) {
  const trimmed = (apiBaseURL || '').trim()
  if (!trimmed) return []

  const mediaOrigin = new URL(trimmed)

  return [{
    protocol: mediaOrigin.protocol.slice(0, -1),
    hostname: mediaOrigin.hostname,
    port: mediaOrigin.port,
    pathname: '/api/v1/media/**',
  }]
}
