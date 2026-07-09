import { SectionHeader } from '@/components/ui'
import type { PublicFansubMediaItem } from '@/types/fansub'

import { FansubGroupMediaBlock } from './FansubGroupMediaBlock'

interface FansubMediaSectionProps {
  media: PublicFansubMediaItem[]
}

/** AO6-04: genau ein Header ('Medien'), kein redundanter Zwischentitel. */
export function FansubMediaSection({ media }: FansubMediaSectionProps) {
  return (
    <section id="medien">
      <SectionHeader title="Medien" />
      <FansubGroupMediaBlock media={media} />
    </section>
  )
}
