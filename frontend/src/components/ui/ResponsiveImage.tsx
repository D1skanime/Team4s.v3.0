'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

export type ResponsiveImageProps = Omit<ImageProps, 'src' | 'unoptimized'> & {
  src: string
}

/**
 * Uses the Next optimizer first, then retries the same public display URL once
 * without optimization. The source URL and reserved geometry never change.
 */
export function ResponsiveImage({ src, alt, onError, ...props }: ResponsiveImageProps) {
  const [failedOptimizedSource, setFailedOptimizedSource] = useState<string | null>(null)
  const usingDisplayOriginal = failedOptimizedSource === src

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={usingDisplayOriginal}
      onError={(event) => {
        onError?.(event)
        setFailedOptimizedSource((failedSource) => failedSource === src ? failedSource : src)
      }}
    />
  )
}
