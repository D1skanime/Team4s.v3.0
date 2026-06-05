import { EmptyState, SectionHeader } from '@/components/ui'
import type { DomainHistoricalRow, DomainMemberRow } from '@/types/domain-projection'

import { FansubTeamActiveGroup } from './FansubTeamActiveGroup'
import { FansubTeamHistoricalGroup } from './FansubTeamHistoricalGroup'
import { FansubTeamMemorialBlock } from './FansubTeamMemorialBlock'
import styles from './FansubTeamSection.module.css'

interface FansubTeamSectionProps {
  members: DomainMemberRow[]
  historical: DomainHistoricalRow[]
}

export function FansubTeamSection({ members, historical }: FansubTeamSectionProps) {
  const activeMembers = members.filter((member) => member.profile_status !== 'memorial')
  const memorialMembers = members.filter((member) => member.profile_status === 'memorial')
  const historicalNonMemorial = historical.filter((member) => member.profile_status !== 'memorial')
  const memorialHistorical = historical.filter((member) => member.profile_status === 'memorial')
  const allMemorial = [...memorialMembers, ...memorialHistorical]
  const isEmpty = activeMembers.length === 0 && historicalNonMemorial.length === 0 && allMemorial.length === 0

  return (
    <section id="team" className={styles.teamSection}>
      <SectionHeader eyebrow="Fansub" title="Team & Mitglieder" />
      {isEmpty ? (
        <EmptyState
          variant="compact"
          title="Keine Mitglieder eingetragen"
          description="Für diese Gruppe sind noch keine Mitglieder erfasst."
        />
      ) : (
        <>
          <FansubTeamActiveGroup members={activeMembers} />
          <FansubTeamHistoricalGroup historical={historicalNonMemorial} />
          <FansubTeamMemorialBlock memorial={allMemorial} />
        </>
      )}
    </section>
  )
}
