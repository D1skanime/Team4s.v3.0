import Link from 'next/link'

import { Card } from '@/components/ui'
import type { DomainProjectionMemberRow } from '@/types/domain-projection'

import styles from './FansubTeamSection.module.css'

interface FansubTeamActiveGroupProps {
  members: DomainProjectionMemberRow[]
}

function renderMemberName(member: DomainProjectionMemberRow) {
  if (member.member_slug !== null) {
    return (
      <Link href={'/members/' + member.member_slug} className={styles.memberName}>
        {member.member_display_name}
      </Link>
    )
  }

  return <span className={styles.memberName}>{member.member_display_name}</span>
}

export function FansubTeamActiveGroup({ members }: FansubTeamActiveGroupProps) {
  if (members.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className={styles.subgroupTitle}>Aktive Mitglieder</h3>
      <div className={styles.activeGrid}>
        {members.map((member) => (
          <Card key={member.member_display_name} variant="elevated">
            <div>
              {renderMemberName(member)}
              <p className={styles.memberRoles}>{member.role_labels.join(', ') || 'Rolle nicht hinterlegt'}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
