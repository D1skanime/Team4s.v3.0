import { Card, SectionHeader } from '@/components/ui'
import type { PublicGroupContributionsResponse } from '@/types/contributions'
import type { FansubGroup } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubHighlightsSectionProps {
  group: FansubGroup
  contributions: Pick<PublicGroupContributionsResponse, 'anime_count' | 'member_count'> | null
  animeProjectCount?: number
  historyCount?: number
}

interface Highlight {
  label: string
  value: number | string | null
}

function computeActiveYears(foundedYear?: number | null, dissolvedYear?: number | null): number | null {
  if (!foundedYear) return null
  return (dissolvedYear ?? new Date().getFullYear()) - foundedYear
}

function computeHighlights(
  group: FansubGroup,
  contributions: FansubHighlightsSectionProps['contributions'],
  animeProjectCount?: number,
  historyCount?: number,
): Highlight[] {
  return [
    { label: 'Anime-Projekte', value: animeProjectCount ?? null },
    { label: 'Historie & Erfolge', value: historyCount ?? null },
    { label: 'Release-Versionen', value: group.release_versions_count },
    { label: 'Mitglieder', value: group.members_count || contributions?.member_count || null },
    { label: 'Aktive Jahre', value: computeActiveYears(group.founded_year, group.dissolved_year) },
  ].filter((highlight) => highlight.value !== null && highlight.value !== 0)
}

export function FansubHighlightsSection({ group, contributions, animeProjectCount, historyCount }: FansubHighlightsSectionProps) {
  const highlights = computeHighlights(group, contributions, animeProjectCount, historyCount)

  if (highlights.length === 0) {
    return null
  }

  return (
    <section id="hoehepunkte">
      <SectionHeader title="Höhepunkte" />
      <div className={styles.highlightGrid}>
        {highlights.map((highlight) => (
          <Card key={highlight.label} variant="section">
            <strong className={styles.highlightValue}>{highlight.value}</strong>
            <span className={styles.mutedMeta}>{highlight.label}</span>
          </Card>
        ))}
      </div>
    </section>
  )
}
