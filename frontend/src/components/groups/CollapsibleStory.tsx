'use client'

import { useState } from 'react'
import styles from './CollapsibleStory.module.css'

interface CollapsibleStoryProps {
  content: string
}

const THRESHOLD = 400

export function CollapsibleStory({ content }: CollapsibleStoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!content || content.length === 0) {
    return null
  }

  const needsCollapse = content.length > THRESHOLD

  if (!needsCollapse) {
    return <p className={styles.storyContent}>{content}</p>
  }

  const displayContent = expanded ? content : content.slice(0, THRESHOLD) + '...'

  return (
    <div className={styles.storyCollapsible}>
      <p className={expanded ? styles.storyContentExpanded : styles.storyContentCollapsed}>
        {displayContent}
      </p>
      <button
        className={styles.expandButton}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        type="button"
      >
        {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
        <span className={expanded ? styles.expandIconRotated : styles.expandIcon}>▼</span>
      </button>
    </div>
  )
}
