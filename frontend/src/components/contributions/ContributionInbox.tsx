'use client'

import { useMemo } from 'react'

import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import styles from './contributions.module.css'
import { ContributionCard } from './ContributionCard'
import { VisibilityDropdown } from './VisibilityDropdown'

interface ContributionInboxProps {
  contributions: MeAnimeContribution[]
  onConfirm: (id: number) => void
  onRejectWithReason: (id: number) => void
  onVisibilityChange: (id: number, isPublic: boolean) => void
}

// D-03a: zugeordnet-aber-unbestätigt (status=proposed, is_own_proposal=false)
// D-03b: bestrittene (!is_own_proposal)
// D-03c: eigene abgelehnte (is_own_proposal + status=disputed)
// D-03d: frisch bestätigt mit offener Sichtbarkeit (status=confirmed, !is_public_on_member_profile)

function DisputedItem({
  contribution,
}: {
  contribution: MeAnimeContribution
}) {
  const title = contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`
  return (
    <Card variant="nestedFlat" className={styles.contributionCard}>
      <div className={styles.contributionCardHeader}>
        <span className={styles.contributionTitle}>{title}</span>
        <Badge variant="danger">Bestritten</Badge>
      </div>
      {contribution.member_reason ? (
        <p className={styles.reviewNote}>
          <strong>Ablehngrund:</strong> {contribution.member_reason}
        </p>
      ) : null}
    </Card>
  )
}

function RejectedOwnItem({
  contribution,
}: {
  contribution: MeAnimeContribution
}) {
  const title = contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`
  return (
    <Card variant="nestedFlat" className={styles.contributionCard}>
      <div className={styles.contributionCardHeader}>
        <span className={styles.contributionTitle}>{title}</span>
        <Badge variant="danger">Abgelehnt</Badge>
      </div>
      {contribution.review_note ? (
        <p className={styles.reviewNote}>
          <strong>Ablehngrund:</strong> {contribution.review_note}
        </p>
      ) : null}
    </Card>
  )
}

function VisibilityPendingItem({
  contribution,
  onVisibilityChange,
}: {
  contribution: MeAnimeContribution
  onVisibilityChange: (id: number, isPublic: boolean) => void
}) {
  const title = contribution.anime_title?.trim() || `Anime #${contribution.anime_id}`
  return (
    <Card variant="nestedFlat" className={styles.contributionCard}>
      <div className={styles.contributionCardHeader}>
        <span className={styles.contributionTitle}>{title}</span>
        <Badge variant="warning">Sichtbarkeit offen</Badge>
      </div>
      <p className={styles.reviewNote}>
        Soll diese bestätigte Mitwirkung öffentlich im Profil erscheinen?
      </p>
      <VisibilityDropdown
        contributionId={contribution.id}
        isPublic={contribution.is_public_on_member_profile}
        onChanged={(isPublic) => onVisibilityChange(contribution.id, isPublic)}
      />
    </Card>
  )
}

export function ContributionInbox({
  contributions,
  onConfirm,
  onRejectWithReason,
  onVisibilityChange,
}: ContributionInboxProps) {
  const inbox = useMemo(() => {
    // D-03a: Leader-zugeordnet = status=proposed UND is_own_proposal=false
    const pending = contributions.filter(
      (c) => c.status === 'proposed' && !c.is_own_proposal,
    )
    // D-03b: Bestrittene/im Konflikt (nicht eigene)
    const disputed = contributions.filter(
      (c) => c.status === 'disputed' && !c.is_own_proposal,
    )
    // D-03c: Eigene abgelehnte Vorschläge
    const rejectedOwn = contributions.filter(
      (c) => c.status === 'disputed' && c.is_own_proposal,
    )
    // D-03d: Frisch bestätigt mit offener Sichtbarkeits-Entscheidung
    const visibilityPending = contributions.filter(
      (c) => c.status === 'confirmed' && !c.is_public_on_member_profile,
    )
    return { pending, disputed, rejectedOwn, visibilityPending }
  }, [contributions])

  const totalInbox =
    inbox.pending.length +
    inbox.disputed.length +
    inbox.rejectedOwn.length +
    inbox.visibilityPending.length

  return (
    <Card variant="section">
      <SectionHeader
        title="Offene Aktionen"
        description="Diese Punkte brauchen deine Aufmerksamkeit – bestätige Zuordnungen, kläre Widersprüche oder entscheide über die Sichtbarkeit."
      />
      <div className={styles.inboxContainer}>
        {totalInbox === 0 ? (
          <EmptyState
            variant="compact"
            title="Keine offenen Aktionen"
            description="Es gibt gerade nichts zu klären. Neue Zuordnungen oder Rückmeldungen erscheinen hier."
          />
        ) : (
          <>
            {inbox.pending.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                mode="pending"
                onConfirm={onConfirm}
                onRejectWithReason={onRejectWithReason}
              />
            ))}
            {inbox.disputed.map((c) => (
              <DisputedItem key={c.id} contribution={c} />
            ))}
            {inbox.rejectedOwn.map((c) => (
              <RejectedOwnItem key={c.id} contribution={c} />
            ))}
            {inbox.visibilityPending.map((c) => (
              <VisibilityPendingItem
                key={c.id}
                contribution={c}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </>
        )}
      </div>
    </Card>
  )
}
