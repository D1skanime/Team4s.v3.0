'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Shared measurement for CSS-clamped content; keeps collapse available while expanded. */
export function useClampedOverflow(content: string) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const measureOverflow = useCallback(() => {
    const element = contentRef.current
    if (!element) return
    const nextIsOverflowing = element.scrollHeight > element.clientHeight
    setIsOverflowing((current) => (isExpanded ? current || nextIsOverflowing : nextIsOverflowing))
  }, [isExpanded])

  useEffect(() => {
    measureOverflow()
    const element = contentRef.current
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measureOverflow)
      : null

    if (element) {
      resizeObserver?.observe(element)
      // Rich text and loaded media can grow inside a fixed-height preview.
      if (element.firstElementChild) resizeObserver?.observe(element.firstElementChild)
    }
    window.addEventListener('resize', measureOverflow)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureOverflow)
    }
  }, [content, measureOverflow])

  return { contentRef, isExpanded, setIsExpanded, isOverflowing }
}
