import Link from 'next/link'

import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import type { DomainProjectionContributorRow } from '@/types/domain-projection'

import styles from './FansubPublicSections.module.css'

interface FansubContributorsSectionProps {
  contributors: DomainProjectionContributorRow[]
  teamMemberNames?: string[]
}

function renderContributorName(contributor: DomainProjectionContributorRow) {
  if (contributor.member_slug !== null) {
    return <Link href={'/members/' + contributor.member_slug}>{contributor.member_display_name}</Link>
  }

  return <span>{contributor.member_display_name}</span>
}

export function FansubContributorsSection({ contributors, teamMemberNames }: FansubContributorsSectionProps) {
  const visibleContributors = contributors.filter(
    (c) => c.visibility === 'public' && c.review_status === 'approved',
  )

  const teamSet = new Set((teamMemberNames ?? []).map((n) => n.toLowerCase()))

  return (
    <section id="mitwirkende">
      <SectionHeader title="Externe Mitwirkende" />
      {visibleContributors.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Keine externen Mitwirkenden"
          description="Für diese Gruppe sind noch keine Mitwirkenden eingetragen."
        />
      ) : (
        <div className={styles.compactStack}>
          {visibleContributors.map((contributor) => {
            const isAlsoMember = teamSet.has(contributor.member_display_name.toLowerCase())
            return (
              <Card key={contributor.member_display_name} variant="flat" className={styles.contributorCard}>
                <strong>{renderContributorName(contributor)}</strong>
                {isAlsoMember ? (
                  <Badge variant="muted" className={styles.inlineBadge}>auch Mitglied</Badge>
                ) : null}
                <span className={styles.mutedMeta}>
                  {contributor.role_labels.join(', ') || 'Rolle nicht hinterlegt'}
                </span>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
