'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { useClampedOverflow } from '@/hooks/useClampedOverflow'
import type { DomainProjectionHistoricalRow } from '@/types/domain-projection'

import { FansubMemberAvatar } from './FansubMemberAvatar'
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

function HistoricalRow({ member }: { member: DomainProjectionHistoricalRow }) {
  const isLinked = member.member_slug !== null
  const { contentRef, isExpanded, setIsExpanded, isOverflowing } = useClampedOverflow(member.member_slogan ?? '')
  const quoteClassName = isExpanded ? styles.quoteExpanded : styles.quoteClamped

  const inner = (
    <>
      <FansubMemberAvatar name={member.member_display_name} avatarUrl={member.member_avatar_url} muted />
      <span className={styles.memberMeta}>
        <span className={styles.memberNameRow}>
          <span className={isLinked ? styles.memberNameLink : styles.memberName}>
            {member.member_display_name}
          </span>
        </span>
        <MemberRolesAndPeriod member={member} />
        {member.member_slogan ? (
          <>
            <div ref={contentRef} className={quoteClassName}>
              <span className={styles.memberSlogan}>„{member.member_slogan}“</span>
            </div>
            {isOverflowing ? (
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => setIsExpanded((current) => !current)}
              >
                {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
              </Button>
            ) : null}
          </>
        ) : null}
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
          <h3 className={styles.subgroupTitle}>Historische Nennungen (unbestätigt) · {unconfirmed.length}</h3>
          <div className={styles.memberGrid}>
            {unconfirmedCollapse.visible.map((member) => (
              <HistoricalRow key={member.member_display_name} member={member} />
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
