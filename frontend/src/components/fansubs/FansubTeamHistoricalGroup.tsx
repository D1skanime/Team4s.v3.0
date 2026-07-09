'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Badge, Button } from '@/components/ui'
import type { DomainProjectionHistoricalRow } from '@/types/domain-projection'

import { getMemberInitials } from './fansubTeamInitials'
import { formatMemberPeriod } from './fansubTeamPeriod'
import styles from './FansubTeamSection.module.css'

interface FansubTeamHistoricalGroupProps {
  historical: DomainProjectionHistoricalRow[]
}

const HISTORICAL_COLLAPSE_THRESHOLD = 9

function MemberRolesAndPeriod({ member }: { member: DomainProjectionHistoricalRow }) {
  const roles = member.role_labels.join(' · ') || 'Rolle nicht hinterlegt'
  const period = formatMemberPeriod(member.joined_year, member.left_year)

  return (
    <span className={styles.memberRoles}>
      <span>{roles}</span>
      {period ? (
        <>
          {' · '}
          <span className={styles.memberPeriod}>{period}</span>
        </>
      ) : null}
    </span>
  )
}

function HistoricalRow({ member, unconfirmed }: { member: DomainProjectionHistoricalRow; unconfirmed?: boolean }) {
  const isLinked = member.member_slug !== null

  const inner = (
    <>
      <span className={`${styles.avatar} ${styles.avatarMuted}`} aria-hidden="true">
        {getMemberInitials(member.member_display_name)}
      </span>
      <span className={styles.memberMeta}>
        <span className={styles.memberNameRow}>
          <span className={isLinked ? styles.memberNameLink : styles.memberName}>
            {member.member_display_name}
          </span>
          {unconfirmed ? <Badge variant="muted">unbestätigt</Badge> : null}
        </span>
        <MemberRolesAndPeriod member={member} />
      </span>
      {isLinked ? <ChevronRight size={16} className={styles.chevron} aria-hidden="true" /> : null}
    </>
  )

  return isLinked ? (
    <Link href={'/members/' + member.member_slug} className={styles.memberRowLink}>
      {inner}
    </Link>
  ) : (
    <div className={styles.memberRow}>{inner}</div>
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
          <h3 className={styles.subgroupTitle}>Ehemalige Mitglieder · {former.length}</h3>
          <div className={styles.memberGrid}>
            {formerCollapse.visible.map((member) => (
              <HistoricalRow key={member.member_display_name} member={member} />
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
          <h3 className={styles.subgroupTitle}>Historische Nennungen · {unconfirmed.length}</h3>
          <div className={styles.memberGrid}>
            {unconfirmedCollapse.visible.map((member) => (
              <HistoricalRow key={member.member_display_name} member={member} unconfirmed />
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
