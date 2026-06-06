import { Card, SectionHeader } from '@/components/ui'
import type { FansubGroup } from '@/types/fansub'
import type { MediaOwnershipRow } from '@/types/media-ownership'

import { FansubGroupMediaBlock } from './FansubGroupMediaBlock'

interface FansubMediaSectionProps {
  mediaRows: MediaOwnershipRow[]
  group: FansubGroup
}

export function FansubMediaSection({ mediaRows, group }: FansubMediaSectionProps) {
  return (
    <section id="medien">
      <SectionHeader title="Medien" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card variant="section">
          <h3 style={{ margin: 0 }}>Gruppenmedien</h3>
          <FansubGroupMediaBlock mediaRows={mediaRows} group={group} />
        </Card>
      </div>
    </section>
  )
}
