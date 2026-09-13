'use client'

import Link from 'next/link'

import { FansubGroupSummary } from '@/types/fansub'
import { buildFansubStoryPreview } from '@/lib/fansub-summary'

import styles from './ActiveFansubStory.module.css'

interface ActiveFansubStoryProps {
  activeFansubGroupID: number | null
  groups: FansubGroupSummary[]
}

export function ActiveFansubStory({ activeFansubGroupID, groups }: ActiveFansubStoryProps) {
  const activeGroup = groups.find((group) => group.id === activeFansubGroupID)
  if (!activeGroup) return null

  const preview = buildFansubStoryPreview(activeGroup)

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>
        <Link href={`/fansubs/${activeGroup.slug}`} prefetch={false}>{activeGroup.name}</Link>
      </h3>
      <p className={styles.text}>{preview}</p>
    </article>
  )
}
