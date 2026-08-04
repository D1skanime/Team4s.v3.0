import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { resolveApiUrl } from '@/lib/api'
import { formatGroupRoleLabel } from '@/lib/profileLabels'
import type { MemberProfileMembership } from '@/types/profile'

import styles from './profile.module.css'

type MembershipsSectionProps = {
  memberships: MemberProfileMembership[]
  title?: string
  headingLevel?: 2 | 3
}

function membershipContextLabel(membership: MemberProfileMembership): string | null {
  const appRole = membership.app_member_roles?.[0]?.trim()
  if (appRole) return formatGroupRoleLabel(appRole)
  if (!membership.has_historical_link) return null

  switch (membership.historical_member_status) {
    case 'confirmed':
      return 'Bestätigtes Gruppenmitglied'
    case 'disputed':
      return 'Klärfall in der Gruppenhistorie'
    case 'draft':
      return 'Entwurf in der Gruppenhistorie'
    default:
      return 'Historischer Eintrag'
  }
}

function membershipPeriodLabel(membership: MemberProfileMembership): string | null {
  if (!membership.joined_year) return null
  if (membership.left_year && membership.left_year !== membership.joined_year) {
    return `Mitglied ${membership.joined_year} bis ${membership.left_year}`
  }
  return `Mitglied seit ${membership.joined_year}`
}

export function MembershipsSection({
  memberships,
  title = 'Fansub-Gruppen',
  headingLevel = 2,
}: MembershipsSectionProps) {
  return (
    <section className={styles.membershipsSection}>
      <SectionHeader title={title} level={headingLevel} />
      {memberships.length === 0 ? (
        <p className={styles.emptyText}>Keine Gruppen eingetragen.</p>
      ) : (
        <ul className={styles.membershipsList}>
          {memberships.map((membership) => {
            const contextLabel = membershipContextLabel(membership)
            const periodLabel = membershipPeriodLabel(membership)

            return (
              <li key={membership.fansub_group_id}>
                <Card variant="interactive" className={styles.membershipCard}>
                  <Link className={styles.membershipLink} href={`/fansubs/${membership.fansub_group_slug}`}>
                    <span className={styles.membershipLogo}>
                      {membership.logo_url ? (
                        <ResponsiveImage
                          src={resolveApiUrl(membership.logo_url)}
                          alt={`${membership.fansub_group_name} Logo`}
                          width={52}
                          height={52}
                          sizes="52px"
                          loading="lazy"
                        />
                      ) : (
                        <Users size={32} aria-hidden="true" />
                      )}
                    </span>
                    <span className={styles.membershipName}>
                      <strong>{membership.fansub_group_name}</strong>
                      {contextLabel ? <span>{contextLabel}</span> : null}
                      {periodLabel ? <span>{periodLabel}</span> : null}
                    </span>
                    <span className={styles.membershipAction}>
                      Zur Gruppe
                      <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
