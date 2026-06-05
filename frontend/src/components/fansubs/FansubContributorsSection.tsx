import Link from 'next/link'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { DomainProjectionContributorRow } from '@/types/domain-projection'

interface FansubContributorsSectionProps {
  contributors: DomainProjectionContributorRow[]
}

function renderContributorName(contributor: DomainProjectionContributorRow) {
  if (contributor.member_slug !== null) {
    return <Link href={'/members/' + contributor.member_slug}>{contributor.member_display_name}</Link>
  }

  return <span>{contributor.member_display_name}</span>
}

export function FansubContributorsSection({ contributors }: FansubContributorsSectionProps) {
  const visibleContributors = contributors.filter(
    (c) => c.visibility === 'public' && c.review_status === 'approved',
  )

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
        <div style={{ display: 'grid', gap: 8 }}>
          {visibleContributors.map((contributor) => (
            <Card key={contributor.member_display_name} variant="flat">
              <strong>{renderContributorName(contributor)}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {contributor.role_labels.join(', ') || 'Rolle nicht hinterlegt'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
