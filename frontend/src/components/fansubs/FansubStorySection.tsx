import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { SectionHeader } from '@/components/ui'
import type { FansubGroup, PublicFansubStory } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubStorySectionProps {
  group: FansubGroup
  story: PublicFansubStory | null
}

export function FansubStorySection({ group, story }: FansubStorySectionProps) {
  void group
  const bodyHtml = story?.body_html?.trim() ?? ''
  const bodyText = story?.body_text?.trim() ?? ''
  const title = story?.title?.trim() ?? ''

  if (!story || (!bodyHtml && !bodyText && !title)) {
    return null
  }

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" />
      <article className={styles.storyArticle}>
        {title ? <h3 className={styles.sectionTitle}>{title}</h3> : null}
        {bodyHtml ? <RichTextRenderer bodyHtml={bodyHtml} /> : <p className={styles.bodyText}>{bodyText}</p>}
      </article>
    </section>
  )
}
