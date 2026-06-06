import { ExternalLink } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
import type { FansubGroup } from '@/types/fansub'

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
            style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Webseite besuchen
          </a>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Keine weiteren Links verfügbar.</p>
        )}
      </Card>
    </section>
  )
}
