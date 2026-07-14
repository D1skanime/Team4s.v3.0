'use client'

import { useState } from 'react'

import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Button, SectionHeader } from '@/components/ui'

import styles from '../page.module.css'

interface StorySectionProps {
  story: string | null | undefined
  projectNotesHtml: string | null | undefined
}

const COLLAPSE_THRESHOLD = 400

export function StorySection({ story, projectNotesHtml }: StorySectionProps) {
  const bodyHtml = projectNotesHtml?.trim() ?? ''
  const bodyText = story?.trim() ?? ''
  const [isExpanded, setIsExpanded] = useState(false)

  if (!bodyHtml && !bodyText) {
    return null
  }

  const measureText = bodyHtml.replace(/<[^>]*>/g, ' ') || bodyText
  const isCollapsible = measureText.length > COLLAPSE_THRESHOLD
  const contentClassName = isExpanded ? styles.projectStoryContentExpanded : styles.projectStoryContentClamped

  return (
    <div id="story" className={styles.storySection}>
      <SectionHeader title="Geschichte des Fansub-Projekts" />
      <article className={styles.projectStoryArticle}>
        <div className={isCollapsible ? contentClassName : styles.projectStoryContent}>
          {bodyHtml ? <RichTextRenderer bodyHtml={bodyHtml} /> : <p>{bodyText}</p>}
        </div>
        {isCollapsible ? (
          <Button
            type="button"
            variant="subtle"
            size="sm"
            className={styles.projectStoryToggle}
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? 'Weniger anzeigen' : 'Alles anzeigen'}
          </Button>
        ) : null}
      </article>
    </div>
  )
}
