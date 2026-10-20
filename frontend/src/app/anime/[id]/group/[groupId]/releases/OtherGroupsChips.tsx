'use client'

import Link from 'next/link'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { getOtherGroupsHeading } from '@/lib/fansub-labels'

import styles from './page.module.css'

interface OtherGroupChipItem {
  id: number
  name: string
  slug: string
  logo_url?: string | null
  episode_count?: number
}

interface OtherGroupsChipsProps {
  animeID: number
  animeTitle: string
  otherGroups: OtherGroupChipItem[]
}

export function OtherGroupsChips({ animeID, animeTitle, otherGroups }: OtherGroupsChipsProps) {
  if (otherGroups.length === 0) {
    return null
  }

  const heading = getOtherGroupsHeading(animeTitle)

  return (
    <div className={styles.otherGroupsSection}>
      <p className={styles.otherGroupsLabel}>{heading}</p>
      <div className={styles.otherGroupsScroller} aria-label={heading}>
        {otherGroups.map((otherGroup) => (
          <Link
            key={otherGroup.id}
            href={`/anime/${animeID}/group/${otherGroup.id}/releases`}
            className={styles.otherGroupChip}
          >
            {otherGroup.logo_url ? (
              <ResponsiveImage
                src={otherGroup.logo_url}
                alt={otherGroup.name}
                width={22}
                height={22}
                className={styles.otherGroupLogo}
              />
            ) : (
              <span className={styles.otherGroupInitial} aria-hidden="true">
                {otherGroup.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className={styles.otherGroupName}>{otherGroup.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
