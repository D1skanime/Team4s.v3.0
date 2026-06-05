import { Card, SectionHeader } from '@/components/ui'
import type { PublicGroupContributionsResponse } from '@/types/contributions'
import type { FansubGroup } from '@/types/fansub'

interface FansubHighlightsSectionProps {
  group: FansubGroup
  contributions: Pick<PublicGroupContributionsResponse, 'anime_count' | 'member_count'> | null
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
  _contributions: FansubHighlightsSectionProps['contributions'],
): Highlight[] {
  return [
    { label: 'Anime-Projekte', value: group.anime_relations_count },
    { label: 'Release-Versionen', value: group.release_versions_count },
    { label: 'Mitglieder', value: group.members_count },
    { label: 'Aktive Jahre', value: computeActiveYears(group.founded_year, group.dissolved_year) },
  ].filter((highlight) => highlight.value !== null && highlight.value !== 0)
}

export function FansubHighlightsSection({ group, contributions }: FansubHighlightsSectionProps) {
  const highlights = computeHighlights(group, contributions)

  if (highlights.length === 0) {
    return null
  }

  return (
    <section id="hoehepunkte">
      <SectionHeader title="Höhepunkte" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {highlights.map((highlight) => (
          <Card key={highlight.label} variant="section">
            <strong style={{ display: 'block', fontSize: 28, lineHeight: 1.1 }}>{highlight.value}</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{highlight.label}</span>
          </Card>
        ))}
      </div>
    </section>
  )
}
