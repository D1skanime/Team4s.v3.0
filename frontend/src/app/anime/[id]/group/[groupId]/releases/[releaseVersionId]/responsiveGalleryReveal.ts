'use client'

import { useEffect, useState } from 'react'

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

/** Owns the sole responsive reveal limit; CSS must not independently hide items. */
export function useResponsiveGalleryReveal() {
  const [collapsedLimit, setCollapsedLimit] = useState(currentLimit)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY)
    const tablet = window.matchMedia(TABLET_QUERY)
    const update = () => setCollapsedLimit(galleryLimitForMatches(mobile.matches, tablet.matches))
    update()
    mobile.addEventListener('change', update)
    tablet.addEventListener('change', update)
    return () => {
      mobile.removeEventListener('change', update)
      tablet.removeEventListener('change', update)
    }
  }, [])

  return { collapsedLimit, expanded, expand: () => setExpanded(true) }
}
