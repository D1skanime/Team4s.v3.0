import Link from 'next/link'

import { Badge, Card } from '@/components/ui'
import type { DomainHistoricalRow } from '@/types/domain-projection'

import styles from './FansubTeamSection.module.css'

interface FansubTeamHistoricalGroupProps {
  historical: DomainHistoricalRow[]
}

function renderLinkedName(member: DomainHistoricalRow) {
  if (member.member_slug !== null) {
    return (
      <Link href={'/members/' + member.member_slug} className={styles.memberName}>
        {member.member_display_name}
      </Link>
    )
  }

  return <span className={styles.memberName}>{member.member_display_name}</span>
}

function renderRoles(member: DomainHistoricalRow) {
  return member.role_labels.join(', ') || 'Rolle nicht hinterlegt'
}

export function FansubTeamHistoricalGroup({ historical }: FansubTeamHistoricalGroupProps) {
  const nonMemorial = historical.filter((member) => member.profile_status !== 'memorial')
  const former = nonMemorial.filter((member) => member.claimed)
  const unconfirmed = nonMemorial.filter((member) => member.claimed === false)

  if (former.length === 0 && unconfirmed.length === 0) {
    return null
  }

  return (
    <div>
      {former.length > 0 ? (
        <div>
          <h3 className={styles.subgroupTitle}>Ehemalige Mitglieder</h3>
          <div className={styles.historicalList}>
            {former.map((member) => (
              <Card key={member.member_display_name} variant="flat">
                {renderLinkedName(member)}
                <p className={styles.memberRoles}>{renderRoles(member)}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {unconfirmed.length > 0 ? (
        <div>
          <h3 className={styles.subgroupTitle}>Historische Nennungen</h3>
          <div className={styles.historicalList}>
            {unconfirmed.map((member) => (
              <div key={member.member_display_name} className={styles.historicalEntry}>
                <span>{member.member_display_name}</span>
                <Badge variant="muted">unbestätigt</Badge>
                <span>{renderRoles(member)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
