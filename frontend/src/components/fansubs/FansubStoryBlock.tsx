'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Button } from '@/components/ui'
import type { PublicFansubStory } from '@/types/fansub'

import sharedStyles from './FansubPublicSections.module.css'
import styles from './FansubStoryBlock.module.css'

interface FansubStoryBlockProps {
  story: PublicFansubStory
}

export function FansubStoryBlock({ story }: FansubStoryBlockProps) {
  const bodyHtml = story.body_html?.trim() ?? ''
  const bodyText = story.body_text?.trim() ?? ''
  const title = story.title?.trim() ?? ''
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

    if (element) resizeObserver?.observe(element)
    window.addEventListener('resize', measureOverflow)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureOverflow)
    }
  }, [bodyHtml, bodyText, measureOverflow])

  if (!bodyHtml && !bodyText && !title) {
    return null
  }

  const contentClassName = isExpanded ? styles.storyContentExpanded : styles.storyContentClamped

  return (
    <article className={sharedStyles.storyArticle}>
      {title ? <h3 className={sharedStyles.sectionTitle}>{title}</h3> : null}
      <div ref={contentRef} className={contentClassName}>
        {bodyHtml ? <RichTextRenderer bodyHtml={bodyHtml} /> : <p className={sharedStyles.bodyText}>{bodyText}</p>}
      </div>
      {isOverflowing ? (
        <Button
          type="button"
          variant="subtle"
          size="sm"
          className={styles.toggle}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
        </Button>
      ) : null}
    </article>
  )
}
