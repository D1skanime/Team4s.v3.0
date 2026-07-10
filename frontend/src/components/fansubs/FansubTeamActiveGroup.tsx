import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import type { DomainProjectionMemberRow } from '@/types/domain-projection'

import { FansubMemberAvatar } from './FansubMemberAvatar'
import styles from './FansubTeamSection.module.css'

interface FansubTeamActiveGroupProps {
  members: DomainProjectionMemberRow[]
}

function MemberRowInner({ member }: { member: DomainProjectionMemberRow }) {
  const roles = member.role_labels.join(' · ') || 'Rolle nicht hinterlegt'
  const isLinked = member.member_slug !== null

  return (
    <>
      <FansubMemberAvatar name={member.member_display_name} avatarUrl={member.member_avatar_url} />
      <span className={styles.memberMeta}>
        <span className={isLinked ? styles.memberNameLink : styles.memberName}>
          {member.member_display_name}
        </span>
        <span className={styles.memberRoles}>{roles}</span>
        {member.member_slogan ? <span className={styles.memberSlogan}>„{member.member_slogan}“</span> : null}
      </span>
      {isLinked ? <ChevronRight size={16} className={styles.chevron} aria-hidden="true" /> : null}
    </>
  )
}

export function FansubTeamActiveGroup({ members }: FansubTeamActiveGroupProps) {
  if (members.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className={styles.subgroupTitle}>Aktive Mitglieder · {members.length}</h3>
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
