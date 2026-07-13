'use client'

import { useState } from 'react'

import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { FansubStoryBlock } from '@/components/fansubs/FansubStoryBlock'
import { Button, Modal, SectionHeader } from '@/components/ui'
import type { FansubGroup, PublicFansubStory } from '@/types/fansub'

import styles from './FansubStorySection.module.css'

interface FansubStorySectionProps {
  group: FansubGroup
  stories: PublicFansubStory[]
}

function hasStoryContent(story: PublicFansubStory): boolean {
  return Boolean(story.title?.trim() || story.body_html?.trim() || story.body_text?.trim())
}

const INLINE_STORY_LIMIT = 2

export function FansubStorySection({ group, stories }: FansubStorySectionProps) {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [selectedStoryID, setSelectedStoryID] = useState<number | null>(null)
  const publishedStories = stories.filter(hasStoryContent)

  if (publishedStories.length === 0) {
    return null
  }

  const inlineStories = publishedStories.slice(0, INLINE_STORY_LIMIT)
  const hasStoryArchive = publishedStories.length > INLINE_STORY_LIMIT
  const selectedStory = publishedStories.find((story) => story.id === selectedStoryID) ?? publishedStories[0]
  const modalTitle = selectedStory?.title?.trim() || 'Geschichte'
  const modalBodyHtml = selectedStory?.body_html?.trim() ?? ''
  const modalBodyText = selectedStory?.body_text?.trim() ?? ''

  function openArchive(storyID?: number) {
    setSelectedStoryID(storyID ?? publishedStories[0]?.id ?? null)
    setIsArchiveOpen(true)
  }

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" underline />
      <div className={styles.storyStack}>
        {inlineStories.map((story) => (
          <FansubStoryBlock key={story.id} story={story} />
        ))}
      </div>
      {hasStoryArchive ? (
        <div className={styles.archiveAction}>
          <Button type="button" variant="secondary" onClick={() => openArchive()}>
            Alle Geschichten lesen ({publishedStories.length})
          </Button>
        </div>
      ) : null}
      <Modal
        open={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        title="Geschichtenarchiv"
        description={`Alle öffentlichen Geschichten von ${group.name}.`}
        size="lg"
      >
        <div className={styles.archiveLayout}>
          <nav className={styles.archiveNav} aria-label="Geschichten">
            {publishedStories.map((story, index) => {
              const title = story.title?.trim() || `Geschichte ${index + 1}`
              const isActive = story.id === selectedStory?.id
              return (
                <button
                  key={story.id}
                  type="button"
                  className={isActive ? `${styles.archiveNavItem} ${styles.archiveNavItemActive}` : styles.archiveNavItem}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => setSelectedStoryID(story.id)}
                >
                  {title}
                </button>
              )
            })}
          </nav>
          <article className={styles.archiveStory}>
            <h3 className={styles.archiveTitle}>{modalTitle}</h3>
            {modalBodyHtml ? (
              <RichTextRenderer bodyHtml={modalBodyHtml} />
            ) : (
              <p className={styles.archiveText}>{modalBodyText}</p>
            )}
          </article>
        </div>
      </Modal>
    </section>
  )
}
