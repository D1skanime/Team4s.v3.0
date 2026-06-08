import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { EmptyState, SectionHeader } from '@/components/ui'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup, PublicFansubStory } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubStorySectionProps {
  group: FansubGroup
  story: PublicFansubStory | null
}

export function FansubStorySection({ group, story }: FansubStorySectionProps) {
  const factSummary = buildFansubFactSummary(group)
  const bodyHtml = story?.body_html?.trim() ?? ''
  const bodyText = story?.body_text?.trim() ?? ''
  const title = story?.title?.trim() ?? ''

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" />
      {story && (bodyHtml || bodyText || title) ? (
        <article className={styles.storyArticle}>
          {title ? <h3 className={styles.sectionTitle}>{title}</h3> : null}
          {bodyHtml ? <RichTextRenderer bodyHtml={bodyHtml} /> : <p className={styles.bodyText}>{bodyText}</p>}
        </article>
      ) : (
        <EmptyState
          variant="compact"
          title="Noch keine Geschichte hinterlegt"
          description={factSummary || 'Die Gruppe hat bisher noch keine Beschreibung veröffentlicht.'}
        />
      )}
    </section>
  )
}
