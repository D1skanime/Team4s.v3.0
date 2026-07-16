'use client'

import { useState, useSyncExternalStore } from 'react'

export const GALLERY_DESKTOP_LIMIT = 6
export const GALLERY_TABLET_LIMIT = 4
export const GALLERY_MOBILE_LIMIT = 2

const MOBILE_QUERY = '(max-width: 600px)'
const TABLET_QUERY = '(max-width: 900px)'

export function galleryLimitForMatches(mobile: boolean, tablet: boolean): number {
  if (mobile) return GALLERY_MOBILE_LIMIT
  if (tablet) return GALLERY_TABLET_LIMIT
  return GALLERY_DESKTOP_LIMIT
}

function currentLimit(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return GALLERY_DESKTOP_LIMIT
  return galleryLimitForMatches(window.matchMedia(MOBILE_QUERY).matches, window.matchMedia(TABLET_QUERY).matches)
}

function subscribeToViewport(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined
  const mobile = window.matchMedia(MOBILE_QUERY)
  const tablet = window.matchMedia(TABLET_QUERY)
  mobile.addEventListener('change', onStoreChange)
  tablet.addEventListener('change', onStoreChange)
  return () => {
    mobile.removeEventListener('change', onStoreChange)
    tablet.removeEventListener('change', onStoreChange)
  }
}

/** Owns the sole responsive reveal limit; CSS must not independently hide items. */
export function useResponsiveGalleryReveal() {
  const collapsedLimit = useSyncExternalStore(subscribeToViewport, currentLimit, () => GALLERY_DESKTOP_LIMIT)
  const [expanded, setExpanded] = useState(false)

  return { collapsedLimit, expanded, expand: () => setExpanded(true) }
}
