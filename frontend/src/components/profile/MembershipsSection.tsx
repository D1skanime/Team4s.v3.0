import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Users } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { formatGroupRoleLabel } from '@/lib/profileLabels'
import type { MemberProfileMembership } from '@/types/profile'

import styles from './profile.module.css'

type MembershipsSectionProps = {
  memberships: MemberProfileMembership[]
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

export function MembershipsSection({ memberships }: MembershipsSectionProps) {
  return (
    <section className={styles.membershipsSection}>
      <SectionHeader title="Fansub-Gruppen" />
      {memberships.length === 0 ? (
        <p className={styles.emptyText}>Keine Gruppen eingetragen.</p>
      ) : (
        <ul className={styles.membershipsList}>
          {memberships.map((membership) => {
            const contextLabel = membershipContextLabel(membership)

            return (
              <li key={membership.fansub_group_id}>
                <Card variant="interactive" className={styles.membershipCard}>
                  <Link className={styles.membershipLink} href={`/fansubs/${membership.fansub_group_slug}`}>
                    <span className={styles.membershipLogo}>
                      {membership.logo_url ? (
                        <Image
                          src={resolveApiUrl(membership.logo_url)}
                          alt={`${membership.fansub_group_name} Logo`}
                          width={52}
                          height={52}
                          unoptimized
                        />
                      ) : (
                        <Users size={32} aria-hidden="true" />
                      )}
                    </span>
                    <span className={styles.membershipName}>
                      <strong>{membership.fansub_group_name}</strong>
                      {contextLabel ? <span>{contextLabel}</span> : null}
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
