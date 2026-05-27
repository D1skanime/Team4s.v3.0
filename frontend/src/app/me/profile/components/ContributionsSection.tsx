import { Badge, Button, Card, EmptyState } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
import { formatHistoricalCreditRoleLabel } from '@/lib/profileLabels'

import styles from '../page.module.css'

type ContributionsSectionProps = {
  profile: MemberProfileData
}

const contributionDetailReasonID = 'profile-contribution-detail-reason'

function DisabledContributionDetailAction() {
  return (
    <span className={styles.deferredActionWrap}>
      <Button variant="subtle" disabled aria-describedby={contributionDetailReasonID}>Alle Beiträge anzeigen</Button>
      <span id={contributionDetailReasonID} className={styles.deferredActionReason}>
        Detailansichten folgen erst mit einem eigenen Beitrags-Contract.
      </span>
    </span>
  )
}

export function ContributionsSection({ profile }: ContributionsSectionProps) {
  if (!profile.capabilities.can_view_historical_credits) {
    return (
      <EmptyState
        title="Beiträge sind nicht sichtbar"
        description="Der aktuelle Capability-Zustand erlaubt keine Anzeige historischer Credits."
      />
    )
  }

  if (profile.historical_credits.length === 0) {
    return (
      <EmptyState
        title="Noch keine Beiträge"
        description="Detailzeilen sind erst mit einem eigenen Beitrags-Contract geplant. Phase 53 zeigt nur echte Aggregate."
        action={<DisabledContributionDetailAction />}
      />
    )
  }

  return (
    <div className={styles.contributionStack}>
      {profile.historical_credits.map((credit) => (
        <Card key={`${credit.fansub_group_id}:${credit.role_name}`} variant="nestedFlat" className={styles.contributionItem}>
          <div>
            <strong>{credit.fansub_group_name}</strong>
            <p>Historischer Credit, keine Berechtigung.</p>
          </div>
          <div className={styles.chipRow}>
            <Badge variant="info">{formatHistoricalCreditRoleLabel(credit.role_name, credit.role_label)}</Badge>
            <Badge variant="neutral">{credit.release_count} Releases</Badge>
          </div>
        </Card>
      ))}
      <DisabledContributionDetailAction />
    </div>
  )
}
