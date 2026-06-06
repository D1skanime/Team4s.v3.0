import { CollapsibleStory } from '@/components/groups/CollapsibleStory'
import { EmptyState, SectionHeader } from '@/components/ui'
import { buildFansubFactSummary } from '@/lib/fansub-summary'
import type { FansubGroup } from '@/types/fansub'

interface FansubStorySectionProps {
  group: FansubGroup
}

export function FansubStorySection({ group }: FansubStorySectionProps) {
  const storyContent = buildFansubFactSummary(group)

  return (
    <section id="geschichte">
      <SectionHeader title="Geschichte" />
      {storyContent ? (
        <CollapsibleStory content={storyContent} />
      ) : (
        <EmptyState
          variant="compact"
          title="Noch keine Geschichte hinterlegt"
          description="Die Gruppe hat bisher noch keine Beschreibung veröffentlicht."
        />
      )}
    </section>
  )
}
