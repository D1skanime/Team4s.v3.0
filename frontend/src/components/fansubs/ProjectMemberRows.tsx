import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'

import { FansubMemberAvatar } from './FansubMemberAvatar'
import styles from './FansubTeamSection.module.css'

interface ProjectMemberRowsProps {
  teamMembers: GroupTeamMember[]
  externalContributors: GroupExternalContributor[]
  // Nur innerhalb der oeffentlichen Fansub-Projektseite gesetzt (aufloesbare Slugs): interne
  // Memberkarten verlinken dann auf die Projekt-Member-Seite. Ohne diesen Pfad bleibt der
  // Fallback auf das allgemeine Memberprofil /members/[slug] (D-03).
  canonicalProjectPath?: string | null
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

function ProjectMemberRowInner({
  member,
  showProjectAffordance,
}: {
  member: ProjectMemberRow
  showProjectAffordance: boolean
}) {
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
        {showProjectAffordance ? (
          <span className={styles.projectAffordance} aria-hidden="true">
            Beiträge im Projekt ansehen →
          </span>
        ) : null}
      </span>
      {isLinked ? <ChevronRight size={16} className={styles.chevron} aria-hidden="true" /> : null}
    </>
  )
}

export function ProjectMemberRows({
  teamMembers,
  externalContributors,
  canonicalProjectPath,
}: ProjectMemberRowsProps) {
  const members = toRows(teamMembers, externalContributors)

  if (members.length === 0) {
    return null
  }

  const projectPath = canonicalProjectPath?.trim().replace(/\/$/, '') || null

  return (
    <div className={styles.memberGrid}>
      {members.map((member) => {
        if (member.member_slug === null) {
          return (
            <div key={member.key} className={styles.memberRow}>
              <ProjectMemberRowInner member={member} showProjectAffordance={false} />
            </div>
          )
        }

        const href = projectPath
          ? `${projectPath}/mitwirkende/${encodeURIComponent(member.member_slug)}`
          : `/members/${member.member_slug}`

        return (
          <Link key={member.key} href={href} className={styles.memberRowLink}>
            <ProjectMemberRowInner member={member} showProjectAffordance={projectPath !== null} />
          </Link>
        )
      })}
    </div>
  )
}
