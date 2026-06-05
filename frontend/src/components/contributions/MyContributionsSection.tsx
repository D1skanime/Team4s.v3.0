'use client'

import { useState } from 'react'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import { ContributionCard } from './ContributionCard'
import styles from './contributions.module.css'

interface MyContributionsSectionProps {
  initialContributions: MeAnimeContribution[]
}

export function MyContributionsSection({ initialContributions }: MyContributionsSectionProps) {
  const [contributions, setContributions] = useState<MeAnimeContribution[]>(initialContributions)

  const confirmed = contributions.filter((c) => c.status === 'confirmed')

  function handleVisibilityChange(id: number, isPublic: boolean) {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_public_on_member_profile: isPublic } : c))
    )
  }

  return (
    <Card variant="section">
      <SectionHeader
        title={`Bestätigte Mitwirkungen (${confirmed.length})`}
        description="Von einer Gruppe bestätigte Rollen, die zu deinem öffentlichen Credit-Profil gehören können."
      />
      <div className={styles.contributionList}>
        {confirmed.length === 0 ? (
          <EmptyState
            variant="compact"
            title="Noch keine bestätigten Mitwirkungen"
            description="Eigene Vorschläge erscheinen erst hier, nachdem ein Gruppenleader sie bestätigt hat."
          />
        ) : (
          <>
            {confirmed.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                mode="confirmed"
                onVisibilityChange={handleVisibilityChange}
              />
            ))}
          </>
        )}
      </div>
    </Card>
  )
}
