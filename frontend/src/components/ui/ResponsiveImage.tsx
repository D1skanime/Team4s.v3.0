'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

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
      unoptimized={false}
      onError={(event) => {
        onError?.(event)
        setFailedOptimizedSource((failedSource) => failedSource === src ? failedSource : src)
      }}
    />
  )
}
