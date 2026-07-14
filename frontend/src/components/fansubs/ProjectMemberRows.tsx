import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'

import { FansubMemberAvatar } from './FansubMemberAvatar'
import styles from './FansubTeamSection.module.css'

interface ProjectMemberRowsProps {
  teamMembers: GroupTeamMember[]
  externalContributors: GroupExternalContributor[]
}

type ProjectMemberRow = {
  key: string
  member_display_name: string
  member_slug: string | null
  member_avatar_url: string | null
  role_labels: string[]
}

function toRows(
  teamMembers: GroupTeamMember[],
  externalContributors: GroupExternalContributor[],
): ProjectMemberRow[] {
  return [
    ...teamMembers.map((member) => ({
      key: `team-${member.member_id}`,
      member_display_name: member.member_display_name,
      member_slug: member.member_slug,
      member_avatar_url: member.member_avatar_url,
      role_labels: member.role_labels,
    })),
    ...externalContributors.map((contributor) => ({
      key: `external-${contributor.member_slug ?? contributor.member_display_name}`,
      member_display_name: contributor.member_display_name,
      member_slug: contributor.member_slug,
      member_avatar_url: contributor.member_avatar_url,
      role_labels: contributor.role_labels,
    })),
  ]
}

function ProjectMemberRowInner({ member }: { member: ProjectMemberRow }) {
  const roles = member.role_labels.join(' · ')
  const isLinked = member.member_slug !== null

  return (
    <>
      <FansubMemberAvatar name={member.member_display_name} avatarUrl={member.member_avatar_url} />
      <span className={styles.memberMeta}>
        <span className={isLinked ? styles.memberNameLink : styles.memberName}>
          {member.member_display_name}
        </span>
        {roles ? <span className={styles.memberRoles}>{roles}</span> : null}
      </span>
      {isLinked ? <ChevronRight size={16} className={styles.chevron} aria-hidden="true" /> : null}
    </>
  )
}

export function ProjectMemberRows({ teamMembers, externalContributors }: ProjectMemberRowsProps) {
  const members = toRows(teamMembers, externalContributors)

  if (members.length === 0) {
    return null
  }

  return (
    <div className={styles.memberGrid}>
      {members.map((member) =>
        member.member_slug !== null ? (
          <Link
            key={member.key}
            href={'/members/' + member.member_slug}
            className={styles.memberRowLink}
          >
            <ProjectMemberRowInner member={member} />
          </Link>
        ) : (
          <div key={member.key} className={styles.memberRow}>
            <ProjectMemberRowInner member={member} />
          </div>
        ),
      )}
    </div>
  )
}
