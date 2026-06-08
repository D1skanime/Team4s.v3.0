import { ExternalLink } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
import type { FansubGroup } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubDeepDiveSectionProps {
  group: FansubGroup
}

export function FansubDeepDiveSection({ group }: FansubDeepDiveSectionProps) {
  return (
    <section id="deep-dive">
      <SectionHeader title="Mehr" />
      <Card variant="flat">
        {group.website_url ? (
          <a
            href={group.website_url}
            target="_blank"
            rel="noreferrer"
            className={styles.inlineLink}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Webseite besuchen
          </a>
        ) : (
          <p className={styles.flatText}>Keine weiteren Links verfügbar.</p>
        )}
      </Card>
    </section>
  )
}
