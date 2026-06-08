import { Card, SectionHeader } from '@/components/ui'
import type { PublicFansubMediaItem } from '@/types/fansub'

import { FansubGroupMediaBlock } from './FansubGroupMediaBlock'
import styles from './FansubPublicSections.module.css'

interface FansubMediaSectionProps {
  media: PublicFansubMediaItem[]
}

export function FansubMediaSection({ media }: FansubMediaSectionProps) {
  return (
    <section id="medien">
      <SectionHeader title="Medien" />
      <div className={styles.mediaGrid}>
        <Card variant="section">
          <h3 className={styles.sectionTitle}>Gruppenmedien</h3>
          <FansubGroupMediaBlock media={media} />
        </Card>
      </div>
    </section>
  )
}
