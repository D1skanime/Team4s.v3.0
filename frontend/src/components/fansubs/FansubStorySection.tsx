import { EmptyState, SectionHeader } from '@/components/ui'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup } from '@/types/fansub'

interface FansubStorySectionProps {
  group: FansubGroup
}

export function FansubStorySection({ group }: FansubStorySectionProps) {
  const factSummary = buildFansubFactSummary(group)

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" />
      <EmptyState
        variant="compact"
        title="Noch keine Geschichte hinterlegt"
        description={factSummary || 'Die Gruppe hat bisher noch keine Beschreibung veröffentlicht.'}
      />
    </section>
  )
}
