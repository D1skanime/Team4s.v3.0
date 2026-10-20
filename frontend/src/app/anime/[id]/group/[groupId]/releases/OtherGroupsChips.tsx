'use client'

import Link from 'next/link'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'

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
  otherGroups: OtherGroupChipItem[]
}

export function OtherGroupsChips({ animeID, otherGroups }: OtherGroupsChipsProps) {
  if (otherGroups.length === 0) {
    return null
  }

  return (
    <div className={styles.otherGroupsSection}>
      <p className={styles.otherGroupsLabel}>Weitere Gruppen zu diesem Anime</p>
      <div className={styles.otherGroupsScroller} aria-label="Weitere Fansub-Gruppen">
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
