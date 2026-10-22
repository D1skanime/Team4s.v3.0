import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
import { getOtherGroupsHeading } from '@/lib/fansub-labels'
import { buildFansubProjectPath } from '@/lib/fansubProjectRoutes'
import type { FansubGroupSummary } from '@/types/fansub'

import styles from './ProjectContentSections.module.css'

interface BacklinksSectionProps {
  fansubSlug: string
  animeID: number
  animeTitle: string
  animeSlug?: string | null
  discoverableGroups?: FansubGroupSummary[]
}

export function BacklinksSection({
  fansubSlug,
  animeID,
  animeTitle,
  animeSlug,
  discoverableGroups,
}: BacklinksSectionProps) {
  return (
    <div className={styles.backlinksSection}>
      <SectionHeader title="Mehr entdecken" />
      <Card variant="flat" className={styles.backlinksCard}>
        <div className={styles.backlinksRow}>
          <Link href={`/fansubs/${fansubSlug}`} className={styles.deepLink}>
            <ChevronRight size={16} aria-hidden="true" /> Zur Gruppenseite
          </Link>
          <Link href={`/anime/${animeID}`} className={styles.deepLink}>
            <ChevronRight size={16} aria-hidden="true" /> Zur Anime-Seite
          </Link>
        </div>
        {(discoverableGroups ?? []).length > 0 && (
          <div className={styles.backlinksGroup}>
            <h3 className={styles.otherGroupsLabel}>{getOtherGroupsHeading(animeTitle)}</h3>
            <div className={styles.backlinksRow}>
              {(discoverableGroups ?? []).map((group) => (
                <Link
                  key={group.id}
                  href={buildFansubProjectPath({ groupSlug: group.slug, animeSlug, animeID, groupID: group.id })}
                  className={styles.deepLink}
                >
                  <ChevronRight size={16} aria-hidden="true" /> {group.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
