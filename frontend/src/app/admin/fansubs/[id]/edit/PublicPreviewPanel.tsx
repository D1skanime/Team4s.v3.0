'use client'

import { Badge, Card, EmptyState } from '@/components/ui'
import { FansubProfileTabs } from '@/components/fansubs/FansubProfileTabs'
import { GroupLeaderTimeline } from '@/components/fansubs/GroupLeaderTimeline'
import type { AnimeListItem } from '@/types/anime'
import type { FansubGroup, FansubMember } from '@/types/fansub'
import type { HistFansubGroupMember } from '@/types/fansub'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { PublicFansubLeaderEntry } from '@/types/contributions'

interface PublicPreviewPanelProps {
  group: FansubGroup
  members: HistFansubGroupMember[]
  projects: AdminFansubAnimeEntry[]
  leaderTimeline: PublicFansubLeaderEntry[]
}

// TODO(Phase 73): Sobald Phase 73 ausgeführt ist, FansubProfileTabs und GroupLeaderTimeline
// durch die echten Section-Komponenten (FansubHeroSection, FansubStorySection, FansubHighlightsSection etc.)
// aus frontend/src/app/fansubs/[slug]/sections/ ersetzen (D-01).
// Dieser Fallback ist ein dokumentierter Übergangszustand bis Phase 73 liefert.

export function PublicPreviewPanel({
  group,
  members,
  projects,
  leaderTimeline,
}: PublicPreviewPanelProps) {
  // Fallback-Casts: FansubProfileTabs erwartet FansubMember[]/AnimeListItem[].
  // HistFansubGroupMember und AdminFansubAnimeEntry sind Admin-seitige DTOs mit
  // überlappenden Feldern. Der Cast ist im Übergangsmodus (bis Phase 73) akzeptabel.
  const membersCast = members as unknown as FansubMember[]
  const projectsCast = projects as unknown as AnimeListItem[]

  return (
    <Card variant="flat" aria-label="Öffentliche Vorschau (schreibgeschützt)">
      <Badge variant="info">
        Vorschau im Übergangsmodus: Bis die neue öffentliche Seite ausgerollt ist, zeigt diese Vorschau die bestehende Darstellung der Fansub-Seite.
      </Badge>

      <GroupLeaderTimeline entries={leaderTimeline} />

      <FansubProfileTabs group={group} members={membersCast} projects={projectsCast} />

      {members.length === 0 && projects.length === 0 ? (
        <EmptyState
          title="Noch keine öffentlichen Inhalte"
          description="Sobald Logo, Beschreibung und Story gepflegt sind, erscheinen sie hier in der Besucher-Vorschau. Nutze die Sprungmarken oben, um zu starten."
        />
      ) : null}
    </Card>
  )
}
