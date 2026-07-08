'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { RichTextRenderer } from '@/components/editor'
import { Button, Card, SectionHeader } from '@/components/ui'

import styles from './MemberStorySection.module.css'

type MemberStorySectionProps = {
  storyHtml?: string | null
}

export function MemberStorySection({ storyHtml }: MemberStorySectionProps) {
  const trimmedStory = storyHtml?.trim() ?? ''
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const measureOverflow = useCallback(() => {
    const element = contentRef.current
    if (!element) return
    const nextIsOverflowing = element.scrollHeight > element.clientHeight
    setIsOverflowing((current) => isExpanded ? current || nextIsOverflowing : nextIsOverflowing)
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
  }, [measureOverflow, trimmedStory])

  if (!trimmedStory) return null

  const isClamped = !isExpanded

  return (
    <section className={styles.section}>
      <SectionHeader title="Fansub-Geschichte" />
      <Card variant="section" className={styles.storyCard}>
        <div className={styles.storyFrame}>
          <div
            ref={contentRef}
            className={isClamped ? styles.storyContentClamped : styles.storyContentExpanded}
          >
            <RichTextRenderer bodyHtml={trimmedStory} editorType="tiptap" contentSchemaVersion={1} />
          </div>
        </div>
        {isOverflowing ? (
          <Button
            type="button"
            variant="subtle"
            size="sm"
            className={styles.toggle}
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? 'Weniger anzeigen' : 'Mehr lesen'}
          </Button>
        ) : null}
      </Card>
    </section>
  )
}
