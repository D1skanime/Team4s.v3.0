'use client'

import { useEffect, useState } from 'react'

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
const MOBILE_ARCHIVE_QUERY = '(max-width: 900px)'

function useIsArchiveMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const media = window.matchMedia(MOBILE_ARCHIVE_QUERY)
    const handleChange = () => setIsMobile(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

export function FansubStorySection({ group, stories }: FansubStorySectionProps) {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isMobileStoryOpen, setIsMobileStoryOpen] = useState(false)
  const [selectedStoryID, setSelectedStoryID] = useState<number | null>(null)
  const isArchiveMobile = useIsArchiveMobile()
  const publishedStories = stories.filter(hasStoryContent)

  if (publishedStories.length === 0) {
    return null
  }

  const inlineStories = publishedStories.slice(0, INLINE_STORY_LIMIT)
  const hasStoryArchive = publishedStories.length > INLINE_STORY_LIMIT
  const selectedStory = publishedStories.find((story) => story.id === selectedStoryID) ?? publishedStories[0]
  const selectedStoryIndex = Math.max(
    0,
    publishedStories.findIndex((story) => story.id === selectedStory?.id),
  )
  const modalTitle = selectedStory?.title?.trim() || 'Geschichte'
  const modalBodyHtml = selectedStory?.body_html?.trim() ?? ''
  const modalBodyText = selectedStory?.body_text?.trim() ?? ''

  function openArchive(storyID?: number) {
    setSelectedStoryID(storyID ?? publishedStories[0]?.id ?? null)
    setIsArchiveOpen(true)
  }

  function closeArchive() {
    setIsMobileStoryOpen(false)
    setIsArchiveOpen(false)
  }

  function selectStory(storyID: number) {
    setSelectedStoryID(storyID)
    if (isArchiveMobile) {
      setIsMobileStoryOpen(true)
    }
  }

  function renderSelectedStory(className: string) {
    return (
      <article className={className}>
        <div className={styles.archiveStoryHeader}>
          <p className={styles.archiveStoryMeta}>
            Geschichte {selectedStoryIndex + 1} von {publishedStories.length}
          </p>
          <h3 className={styles.archiveTitle}>{modalTitle}</h3>
        </div>
        <div className={styles.archiveStoryContent}>
          {modalBodyHtml ? (
            <RichTextRenderer bodyHtml={modalBodyHtml} />
          ) : (
            <p className={styles.archiveText}>{modalBodyText}</p>
          )}
        </div>
      </article>
    )
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
        onClose={closeArchive}
        title="Geschichtenarchiv"
        description={`Alle öffentlichen Geschichten von ${group.name}.`}
        size="lg"
      >
        <div className={styles.archiveLayout}>
          <aside className={styles.archiveSidebar}>
            <p className={styles.archiveSidebarLabel}>Geschichten</p>
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
                    onClick={() => selectStory(story.id)}
                  >
                    <span className={styles.archiveNavIndex}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={styles.archiveNavTitle}>{title}</span>
                  </button>
                )
              })}
            </nav>
          </aside>
          {renderSelectedStory(styles.archiveStory)}
        </div>
      </Modal>
      <Modal
        open={isArchiveOpen && isArchiveMobile && isMobileStoryOpen}
        onClose={() => setIsMobileStoryOpen(false)}
        title={modalTitle}
        description="Geschichte lesen"
        footer={
          <Button variant="secondary" onClick={() => setIsMobileStoryOpen(false)}>
            Zurück zum Archiv
          </Button>
        }
      >
        {renderSelectedStory(`${styles.archiveStory} ${styles.archiveStoryDialog}`)}
      </Modal>
    </section>
  )
}
