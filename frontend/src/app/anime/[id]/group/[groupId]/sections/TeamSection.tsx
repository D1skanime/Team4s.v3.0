import { ProjectMemberRows } from '@/components/fansubs/ProjectMemberRows'
import { SectionHeader } from '@/components/ui'
import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'

import styles from '../page.module.css'

interface TeamSectionProps {
  teamMembers: GroupTeamMember[]
  externalContributors: GroupExternalContributor[]
  canonicalProjectPath?: string | null
}

export function TeamSection({ teamMembers, externalContributors, canonicalProjectPath }: TeamSectionProps) {
  const hasMembers = teamMembers.length > 0 || externalContributors.length > 0

  return (
    <div id="team" className={styles.teamSection}>
      <SectionHeader title="Mitwirkende am Fansub-Projekt" />
      {hasMembers ? (
        <ProjectMemberRows
          teamMembers={teamMembers}
          externalContributors={externalContributors}
          canonicalProjectPath={canonicalProjectPath}
        />
      ) : (
        <p className={styles.sectionEmptyState}>Noch keine öffentlichen Projektrollen hinterlegt.</p>
      )}
    </div>
  )
}
