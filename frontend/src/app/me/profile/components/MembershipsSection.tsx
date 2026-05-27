import { ArrowRight, Users } from 'lucide-react'

import { Badge, Button, Card, EmptyState } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
import {
  formatAppMemberStatusLabel,
  formatGroupRoleLabel,
  formatGroupStatusLabel,
} from '@/lib/profileLabels'

import styles from '../page.module.css'

type MembershipsSectionProps = {
  profile: MemberProfileData
}

export function MembershipsSection({ profile }: MembershipsSectionProps) {
  if (!profile.capabilities.can_view_memberships) {
    return (
      <EmptyState
        title="Mitgliedschaften sind nicht sichtbar"
        description="Der aktuelle Profil-Contract gibt diese Daten für dich nicht frei. Team4s behandelt fehlende Capability-Zustände konservativ."
      />
    )
  }

  if (profile.memberships.length === 0) {
    return (
      <EmptyState
        title="Noch keine Mitgliedschaften"
        description="Für dieses Profil sind noch keine App-Mitgliedschaften oder historischen Gruppenlinks sichtbar."
      />
    )
  }

  return (
    <ul className={styles.membershipList}>
      {profile.memberships.map((membership) => (
        <li key={`${membership.fansub_group_id}:${membership.fansub_group_slug}`}>
          <Card variant="nested" className={styles.membershipCard}>
            <div className={styles.membershipLogo} aria-hidden="true">
              <Users size={20} />
            </div>
            <div className={styles.membershipBody}>
              <strong>{membership.fansub_group_name}</strong>
              <div className={styles.chipRow}>
                <Badge variant="info">{formatGroupStatusLabel(membership.group_status)}</Badge>
                <Badge variant="muted">{formatAppMemberStatusLabel(membership.app_member_status)}</Badge>
                {membership.joined_year ? <Badge variant="neutral">seit {membership.joined_year}</Badge> : null}
                {membership.left_year ? <Badge variant="neutral">bis {membership.left_year}</Badge> : null}
                {membership.has_historical_link ? <Badge variant="warning">Historischer Link</Badge> : null}
              </div>
              <div className={styles.chipRow}>
                {membership.app_member_roles?.length ? membership.app_member_roles.map((role) => (
                  <Badge key={role} variant="success">{formatGroupRoleLabel(role)}</Badge>
                )) : <Badge variant="muted">Keine aktive Gruppenrolle</Badge>}
              </div>
            </div>
            <Button variant="subtle" size="sm" disabled rightIcon={<ArrowRight size={14} />}>
              Gruppenbereich
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  )
}
