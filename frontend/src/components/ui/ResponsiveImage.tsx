'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern'
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern'

import {
  LOCAL_IMAGE_PATTERNS,
  FIXED_REMOTE_IMAGE_URLS,
  configuredApiMediaPatterns,
} from '@/lib/images/publicImagePatterns'

const REMOTE_IMAGE_PATTERNS = [
  ...FIXED_REMOTE_IMAGE_URLS.map((url) => new URL(url)),
  ...configuredApiMediaPatterns(process.env.NEXT_PUBLIC_API_URL),
]

/**
 * 173-16 Task 0a (live-UAT finding, E426 crash on GET /fansubs/new-subs):
 * mirrors next/image's OWN src validation (next/dist/shared/lib/image-loader.js's
 * `defaultLoader`, which next's client bundle already runs this exact check
 * from during SSR) using the SAME images.localPatterns/remotePatterns this
 * app configures in next.config.mjs, via the shared `publicImagePatterns`
 * data module -- one source of truth, never a second hand-maintained list.
 *
 * Pre-existing data can contain image paths outside the configured
 * allow-list (flat legacy `/media/image_*.jpg`, `/api/v1/media/files/...`,
 * the Jellyfin proxy `/api/v1/media/image?...`) -- before the Phase 173
 * backfill runs, and potentially again any time an unmigrated path slips
 * through. Next.js's own validation throws (E426/E231) for those, which,
 * unhandled during SSR, crashes the entire page with an HTTP 500. One
 * unmatched image must never take down a whole public route (D-10) -- so
 * this check runs FIRST and falls back to unoptimized rendering (the image
 * loads directly, unresized) instead of letting next/image throw.
 */
export function isConfiguredForImageOptimization(src: string): boolean {
  if (src.startsWith('/')) {
    return hasLocalMatch(LOCAL_IMAGE_PATTERNS, src)
  }

  try {
    return hasRemoteMatch([], REMOTE_IMAGE_PATTERNS, new URL(src))
  } catch {
    return false
  }
}

export type ResponsiveImageProps = Omit<ImageProps, 'src' | 'unoptimized'> & {
  src: string
}

/**
 * Always routes through the Next.js image optimizer, bounded by next.config.mjs's
 * images.deviceSizes/imageSizes ladder -- the SAME bounded path used on success.
 *
 * P154-06 (154-03 plan, RCA-06): the previous optimizer-error fallback unconditionally
 * escaped that bound by re-requesting the unmodified src with unoptimized={true},
 * transferring the raw, full-size original file uncapped (measured up to 9.49MB/2.93MB
 * per profile for `AUDIT_FAIL_BADGES=1`-blocked badge artwork). That escape hatch is
 * removed: `frontend/scripts/audit-public-member-performance.mjs` blocks the ENTIRE
 * `/_next/image` route for the affected URL prefix regardless of requested width, so a
 * second request through the same route would fail identically anyway, and no smaller
 * same-origin static derivative exists for this asset class (no backend resize service --
 * `media_service.go` has no `imaging.Resize` call). There is therefore no bounded retry
 * to make: `failedOptimizedSource`/`usingDisplayOriginal` are still tracked for
 * observability/testing but no longer drive `unoptimized`, `src`, or any render branch --
 * width/height/fill and the wrapping CSS slot class stay identical in both states, so
 * there is no layout shift and exactly one (no-op) state transition, never a retry loop.
 * If the optimizer genuinely cannot serve the image, the browser's own default
 * broken-image behavior applies -- unchanged from every other unhandled <img> failure
 * already elsewhere on this site; this is not a new custom error visual.
 */
export function ResponsiveImage({ src, alt, onError, ...props }: ResponsiveImageProps) {
  const [failedOptimizedSource, setFailedOptimizedSource] = useState<string | null>(null)
  const usingDisplayOriginal = failedOptimizedSource === src
  // Retained for observability/testing only (per P154-06) -- deliberately not read by the
  // render below.
  void usingDisplayOriginal

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={!isConfiguredForImageOptimization(src)}
      onError={(event) => {
        onError?.(event)
        setFailedOptimizedSource((failedSource) => failedSource === src ? failedSource : src)
      }}
    />
  )
}
