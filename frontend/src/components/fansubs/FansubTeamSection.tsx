import { SectionHeader } from '@/components/ui'
import type { DomainProjectionHistoricalRow, DomainProjectionMemberRow } from '@/types/domain-projection'

import { FansubTeamActiveGroup } from './FansubTeamActiveGroup'
import { FansubTeamHistoricalGroup } from './FansubTeamHistoricalGroup'
import { FansubTeamMemorialBlock } from './FansubTeamMemorialBlock'
import styles from './FansubTeamSection.module.css'

interface FansubTeamSectionProps {
  members: DomainProjectionMemberRow[]
  historical: DomainProjectionHistoricalRow[]
}

export function countVisibleTeamMembers(
  members: DomainProjectionMemberRow[],
  historical: DomainProjectionHistoricalRow[],
): number {
  const activeMembers = members.filter((member) => member.profile_status !== 'memorial')
  const memorialMembers = members.filter((member) => member.profile_status === 'memorial')
  const historicalNonMemorial = historical.filter((member) => member.profile_status !== 'memorial')
  const memorialHistorical = historical.filter((member) => member.profile_status === 'memorial')

  return activeMembers.length + historicalNonMemorial.length + memorialMembers.length + memorialHistorical.length
}

export function FansubTeamSection({ members, historical }: FansubTeamSectionProps) {
  const activeMembers = members.filter((member) => member.profile_status !== 'memorial')
  const memorialMembers = members.filter((member) => member.profile_status === 'memorial')
  const historicalNonMemorial = historical.filter((member) => member.profile_status !== 'memorial')
  const memorialHistorical = historical.filter((member) => member.profile_status === 'memorial')
  const allMemorial = [...memorialMembers, ...memorialHistorical]

  if (countVisibleTeamMembers(members, historical) === 0) {
    return null
  }

  return (
    <section id="team" className={styles.teamSection}>
      <SectionHeader eyebrow="Fansub" title="Team & Mitglieder" />
      <FansubTeamActiveGroup members={activeMembers} />
      <FansubTeamHistoricalGroup historical={historicalNonMemorial} />
      <FansubTeamMemorialBlock memorial={allMemorial} />
    </section>
  )
}
