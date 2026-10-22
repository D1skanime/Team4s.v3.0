import Link from 'next/link'

import { Card } from '@/components/ui'
import { buildFansubMemorialKey, type FansubMemorialSource } from '@/lib/fansub-memorial-key'
import type { DomainProjectionHistoricalRow, DomainProjectionMemberRow } from '@/types/domain-projection'

import styles from './FansubTeamSection.module.css'

export interface FansubTeamMemorialEntry {
  source: FansubMemorialSource
  row: DomainProjectionMemberRow | DomainProjectionHistoricalRow
}

interface FansubTeamMemorialBlockProps {
  memorial: FansubTeamMemorialEntry[]
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
        {memorial.map((entry) => (
          <Card key={buildFansubMemorialKey(entry.source, entry.row.id)} variant="flat">
            {renderMemorialName(entry.row)}
            <p className={styles.memberRoles}>{entry.row.role_labels.join(', ') || 'Rolle nicht hinterlegt'}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
