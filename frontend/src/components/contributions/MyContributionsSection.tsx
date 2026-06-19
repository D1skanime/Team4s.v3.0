'use client'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import { ContributionCard } from './ContributionCard'
import styles from './contributions.module.css'

interface MyContributionsSectionProps {
  /**
   * Fertig gefilterte und vorbereitete Liste (von page.tsx via useMemo).
   * Enthält ausschließlich confirmed-Einträge, die dem aktiven Filter entsprechen.
   */
  contributions: MeAnimeContribution[]
  onVisibilityChange: (id: number, isPublic: boolean) => void
}

export function MyContributionsSection({
  contributions,
  onVisibilityChange,
}: MyContributionsSectionProps) {
  return (
    <Card variant="section">
      <SectionHeader
        title={`Bestätigte Projektrollen (${contributions.length})`}
        description="Von einer Gruppe bestätigte Rollen, die in deinem öffentlichen Profil erscheinen können."
      />
      <div className={styles.contributionList}>
        {contributions.length === 0 ? (
          <EmptyState
            variant="compact"
            title="Noch keine bestätigten Projektrollen"
            description="Hinweise erscheinen erst hier, nachdem eine Gruppe sie bestätigt hat."
          />
        ) : (
          <>
            {contributions.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                mode="confirmed"
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </>
        )}
      </div>
    </Card>
  )
}
