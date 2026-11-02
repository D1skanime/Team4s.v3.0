'use client'

import { Button, Card, Heading, Text } from '@/components/ui'
import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'

import styles from './FansubGroupContext.module.css'

export interface FansubGroupContextActiveGroup {
  id: number
  slug: string
  name: string
  story_preview?: string | null
}

export interface FansubGroupContextProps {
  activeGroup: FansubGroupContextActiveGroup | null
  animeSlug?: string
}

export function FansubGroupContext({ activeGroup, animeSlug }: FansubGroupContextProps) {
  if (!activeGroup) return null

  const trimmedPreview = activeGroup.story_preview?.trim()
  const canLinkToProject = Boolean(animeSlug?.trim() && activeGroup.slug?.trim())

  return (
    <Card variant="glass" className={styles.card} data-testid="fansub-group-context">
      <Heading level={3} tone="onScrim" className={styles.name}>{activeGroup.name}</Heading>
      {trimmedPreview ? (
        <>
          <Text tone="onScrim" className={styles.storyPreview}>{trimmedPreview}</Text>
          <Button href={`/fansubs/${activeGroup.slug}#geschichte`} variant="text" className={styles.moreLink}>
            Mehr lesen →
          </Button>
        </>
      ) : null}
      <div className={styles.navRow}>
        <Button href={`/fansubs/${activeGroup.slug}`} variant="secondary" size="sm">
          Zur Fansub-Gruppe
        </Button>
        {canLinkToProject ? (
          <Button href={buildPublicFansubProjectPath(activeGroup.slug, animeSlug as string)} variant="secondary" size="sm">
            Zum Projekt
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
