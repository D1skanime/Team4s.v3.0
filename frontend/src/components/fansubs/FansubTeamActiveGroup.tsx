'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui'
import { useClampedOverflow } from '@/hooks/useClampedOverflow'
import type { DomainProjectionMemberRow } from '@/types/domain-projection'
import type { FansubStatus } from '@/types/fansub'
import { resolveMemberSectionLabel } from '@/lib/fansub-team-labels'

import { FansubMemberAvatar } from './FansubMemberAvatar'
import styles from './FansubTeamSection.module.css'

interface FansubTeamActiveGroupProps {
  members: DomainProjectionMemberRow[]
  status: FansubStatus
}

function MemberRowInner({ member }: { member: DomainProjectionMemberRow }) {
  const roles = member.role_labels.join(' · ') || 'Rolle nicht hinterlegt'
  const historicalRoles = (member.historical_role_labels ?? []).join(' - ')
  const isLinked = member.member_slug !== null
  const { contentRef, isExpanded, setIsExpanded, isOverflowing } = useClampedOverflow(member.member_slogan ?? '')
  const quoteClassName = isExpanded ? styles.quoteExpanded : styles.quoteClamped

  return (
    <>
      <FansubMemberAvatar name={member.member_display_name} avatarUrl={member.member_avatar_url} />
      <span className={styles.memberMeta}>
        <span className={isLinked ? styles.memberNameLink : styles.memberName}>
          {member.member_display_name}
        </span>
        <span className={styles.memberRoles}>{roles}</span>
        {historicalRoles ? <span className={styles.memberRoles}>Früher: {historicalRoles}</span> : null}
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
}

export function FansubTeamActiveGroup({ members, status }: FansubTeamActiveGroupProps) {
  if (members.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className={styles.subgroupTitle}>{resolveMemberSectionLabel(status, members.length)}</h3>
      <div className={styles.memberGrid}>
        {members.map((member) =>
          member.member_slug !== null ? (
            <Link
              key={member.member_display_name}
              href={'/members/' + member.member_slug}
              className={styles.memberRowLink}
            >
              <MemberRowInner member={member} />
            </Link>
          ) : (
            <div key={member.member_display_name} className={styles.memberRow}>
              <MemberRowInner member={member} />
            </div>
          ),
        )}
      </div>
    </div>
  )
}
