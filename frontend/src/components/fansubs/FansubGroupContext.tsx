'use client'

import Link from 'next/link'

import { Button } from '@/components/ui'
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
    <article className={styles.card}>
      <h3 className={styles.name}>{activeGroup.name}</h3>
      {trimmedPreview ? (
        <>
          <p className={styles.storyPreview}>{trimmedPreview}</p>
          <Link href={`/fansubs/${activeGroup.slug}#geschichte`} prefetch={false} className={styles.moreLink}>
            Mehr lesen →
          </Link>
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
    </article>
  )
}
