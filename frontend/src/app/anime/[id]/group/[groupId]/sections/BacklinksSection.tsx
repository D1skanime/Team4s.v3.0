import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
import { buildTechnicalFansubProjectPath } from '@/lib/fansubProjectRoutes'
import type { FansubGroupSummary } from '@/types/fansub'

import styles from '../page.module.css'

interface BacklinksSectionProps {
  fansubSlug: string
  animeID: number
  discoverableGroups?: FansubGroupSummary[]
}

export function BacklinksSection({ fansubSlug, animeID, discoverableGroups }: BacklinksSectionProps) {
  return (
    <div className={styles.backlinksSection}>
      <SectionHeader title="Mehr entdecken" />
      <Card variant="flat" className={styles.backlinksCard}>
        <Link href={`/fansubs/${fansubSlug}`} className={styles.deepLink}>
          <ExternalLink size={16} aria-hidden="true" /> Zur Gruppenseite
        </Link>
        <Link href={`/anime/${animeID}`} className={styles.deepLink}>
          <ExternalLink size={16} aria-hidden="true" /> Zur Anime-Seite
        </Link>
        {(discoverableGroups ?? []).map((group) => (
          <Link
            key={group.id}
            href={buildTechnicalFansubProjectPath(animeID, group.id)}
            className={styles.deepLink}
          >
            <ExternalLink size={16} aria-hidden="true" /> {group.name}
          </Link>
        ))}
      </Card>
    </div>
  )
}
