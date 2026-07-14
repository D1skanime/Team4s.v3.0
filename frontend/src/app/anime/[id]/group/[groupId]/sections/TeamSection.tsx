import { ProjectMemberRows } from '@/components/fansubs/ProjectMemberRows'
import { SectionHeader } from '@/components/ui'
import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'

import styles from '../page.module.css'

interface TeamSectionProps {
  teamMembers: GroupTeamMember[]
  externalContributors: GroupExternalContributor[]
}

export function TeamSection({ teamMembers, externalContributors }: TeamSectionProps) {
  if (teamMembers.length === 0 && externalContributors.length === 0) {
    return null
  }

  return (
    <div id="team" className={styles.teamSection}>
      <SectionHeader title="Mitwirkende am Fansub-Projekt" />
      <ProjectMemberRows teamMembers={teamMembers} externalContributors={externalContributors} />
    </div>
  )
}
