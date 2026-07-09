import { FansubStoryBlock } from '@/components/fansubs/FansubStoryBlock'
import { SectionHeader } from '@/components/ui'
import type { FansubGroup, PublicFansubStory } from '@/types/fansub'

import styles from './FansubStorySection.module.css'

interface FansubStorySectionProps {
  group: FansubGroup
  stories: PublicFansubStory[]
}

function hasStoryContent(story: PublicFansubStory): boolean {
  return Boolean(story.title?.trim() || story.body_html?.trim() || story.body_text?.trim())
}

export function FansubStorySection({ group, stories }: FansubStorySectionProps) {
  void group
  const publishedStories = stories.filter(hasStoryContent)

  if (publishedStories.length === 0) {
    return null
  }

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" />
      <div className={styles.storyStack}>
        {publishedStories.map((story) => (
          <FansubStoryBlock key={story.id} story={story} />
        ))}
      </div>
    </section>
  )
}
