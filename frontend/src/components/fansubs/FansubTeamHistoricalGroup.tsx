'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Badge, Button, Card } from '@/components/ui'
import type { DomainProjectionHistoricalRow } from '@/types/domain-projection'

import { formatMemberPeriod } from './fansubTeamPeriod'
import styles from './FansubTeamSection.module.css'

interface FansubTeamHistoricalGroupProps {
  historical: DomainProjectionHistoricalRow[]
}

const HISTORICAL_COLLAPSE_THRESHOLD = 9

function renderLinkedName(member: DomainProjectionHistoricalRow) {
  if (member.member_slug !== null) {
    return (
      <Link href={'/members/' + member.member_slug} className={styles.memberName}>
        {member.member_display_name}
      </Link>
    )
  }

  return <span className={styles.memberName}>{member.member_display_name}</span>
}

function renderRoleAndPeriod(member: DomainProjectionHistoricalRow) {
  const roles = member.role_labels.join(', ') || 'Rolle nicht hinterlegt'
  const period = formatMemberPeriod(member.joined_year, member.left_year)

  return (
    <>
      <span>{roles}</span>
      {period ? (
        <>
          {' · '}
          <span className={styles.memberPeriod}>{period}</span>
        </>
      ) : null}
    </>
  )
}

function useCollapsibleEntries<T>(entries: T[]) {
  const [showAll, setShowAll] = useState(false)
  const isCollapsible = entries.length > HISTORICAL_COLLAPSE_THRESHOLD
  const visible = !isCollapsible || showAll ? entries : entries.slice(0, HISTORICAL_COLLAPSE_THRESHOLD)
  const remaining = entries.length - HISTORICAL_COLLAPSE_THRESHOLD

  return { visible, isCollapsible, showAll, setShowAll, remaining }
}

export function FansubTeamHistoricalGroup({ historical }: FansubTeamHistoricalGroupProps) {
  const nonMemorial = historical.filter((member) => member.profile_status !== 'memorial')
  const former = nonMemorial.filter((member) => member.claimed)
  const unconfirmed = nonMemorial.filter((member) => member.claimed === false)

  const formerCollapse = useCollapsibleEntries(former)
  const unconfirmedCollapse = useCollapsibleEntries(unconfirmed)

  if (former.length === 0 && unconfirmed.length === 0) {
    return null
  }

  return (
    <div>
      {former.length > 0 ? (
        <div>
          <h3 className={styles.subgroupTitle}>Ehemalige Mitglieder</h3>
          <div className={styles.historicalList}>
            {formerCollapse.visible.map((member) => (
              <Card key={member.member_display_name} variant="flat">
                {renderLinkedName(member)}
                <p className={styles.memberRoles}>{renderRoleAndPeriod(member)}</p>
              </Card>
            ))}
          </div>
          {formerCollapse.isCollapsible ? (
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => formerCollapse.setShowAll((current) => !current)}
            >
              {formerCollapse.showAll ? 'Weniger anzeigen' : formerCollapse.remaining + ' weitere anzeigen'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {unconfirmed.length > 0 ? (
        <div>
          <h3 className={styles.subgroupTitle}>Historische Nennungen</h3>
          <div className={styles.historicalList}>
            {unconfirmedCollapse.visible.map((member) => (
              <div key={member.member_display_name} className={styles.historicalEntry}>
                <span>{member.member_display_name}</span>
                <Badge variant="muted">unbestätigt</Badge>
                {renderRoleAndPeriod(member)}
              </div>
            ))}
          </div>
          {unconfirmedCollapse.isCollapsible ? (
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => unconfirmedCollapse.setShowAll((current) => !current)}
            >
              {unconfirmedCollapse.showAll
                ? 'Weniger anzeigen'
                : unconfirmedCollapse.remaining + ' weitere anzeigen'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
