import Link from 'next/link'

import { Card } from '@/components/ui'
import type { DomainProjectionHistoricalRow, DomainProjectionMemberRow } from '@/types/domain-projection'

import styles from './FansubTeamSection.module.css'

interface FansubTeamMemorialBlockProps {
  memorial: Array<DomainProjectionMemberRow | DomainProjectionHistoricalRow>
}

function renderMemorialName(member: DomainProjectionMemberRow | DomainProjectionHistoricalRow) {
  if (member.member_slug !== null) {
    return (
      <Link href={'/members/' + member.member_slug} className={styles.memberName}>
        {member.member_display_name}
      </Link>
    )
  }

  return <span className={styles.memberName}>{member.member_display_name}</span>
}

export function FansubTeamMemorialBlock({ memorial }: FansubTeamMemorialBlockProps) {
  if (memorial.length === 0) {
    return null
  }

  return (
    <div className={styles.memorialSection}>
      <h3 className={styles.subgroupTitle}>In Erinnerung</h3>
      <div className={styles.historicalList}>
        {memorial.map((member) => (
          <Card key={member.member_display_name} variant="flat">
            {renderMemorialName(member)}
            <p className={styles.memberRoles}>{member.role_labels.join(', ') || 'Rolle nicht hinterlegt'}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
