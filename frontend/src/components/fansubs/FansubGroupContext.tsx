'use client'

import { Button, Card, Cluster, Heading, Stack, Text } from '@/components/ui'
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
    <Card variant="glass" padding="contextCard" data-testid="fansub-group-context">
      {/* Name/Vorschautext/Mehr-Link/Aktionsreihe sind eng zusammengehoerige Inhalte EINER
          Kontextkarte -- Stacks "relatedContent"-Zweck (8px) deckt den gesamten Rhythmus ab,
          unabhaengig davon, ob der Vorschautext-Zweig (0 oder 2 Kinder) gerendert wird. */}
      <Stack gap="relatedContent">
        <Heading level={3} tone="onScrim">{activeGroup.name}</Heading>
        {trimmedPreview ? (
          <>
            <Text tone="onScrim" className={styles.storyPreview}>{trimmedPreview}</Text>
            <Button href={`/fansubs/${activeGroup.slug}#geschichte`} variant="text" className={styles.moreLink}>
              Mehr lesen →
            </Button>
          </>
        ) : null}
        <Cluster gap="secondaryActionRow" justify="end" wrap>
          <Button href={`/fansubs/${activeGroup.slug}`} variant="secondary" size="sm">
            Zur Fansub-Gruppe
          </Button>
          {canLinkToProject ? (
            <Button href={buildPublicFansubProjectPath(activeGroup.slug, animeSlug as string)} variant="secondary" size="sm">
              Zum Projekt
            </Button>
          ) : null}
        </Cluster>
      </Stack>
    </Card>
  )
}
