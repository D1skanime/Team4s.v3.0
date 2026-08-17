import { Fragment } from 'react'
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'

import { Button, Card, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { resolveApiUrl } from '@/lib/api'
import type { MemberProfileMembership, PublicMemberRole } from '@/types/profile'

import styles from './profile.module.css'

type MembershipsSectionProps = {
  memberships: MemberProfileMembership[]
  title?: string
  headingLevel?: 2 | 3
  /** Zeigt zusaetzlich einen Arbeitsbereich-Link fuer aktive App-Mitgliedschaften (Dashboard). */
  showWorkspaceLink?: boolean
}

// membershipRoles liefert ALLE freigegebenen Rollen (D-05): serverautoritative
// Code+Label-Paare aus hist_group_member_roles; nie nur die erste, nie interne Codes.
function membershipRoles(membership: MemberProfileMembership): PublicMemberRole[] {
  return membership.roles ?? []
}

// membershipStatusLabel trennt current (is_current) von historical (PMDA-02) und
// haelt die bestehenden Historien-Status-Texte fuer nicht-laufende Eintraege bei.
function membershipStatusLabel(membership: MemberProfileMembership): string | null {
  if (membership.is_current) return 'Aktuelles Mitglied'
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
  showWorkspaceLink = false,
}: MembershipsSectionProps) {
  return (
    <section className={styles.membershipsSection}>
      <SectionHeader title={title} level={headingLevel} />
      {memberships.length === 0 ? (
        <p className={styles.emptyText}>Keine Gruppen eingetragen.</p>
      ) : (
        <ul className={styles.membershipsList}>
          {memberships.map((membership) => {
            const statusLabel = membershipStatusLabel(membership)
            const periodLabel = membershipPeriodLabel(membership)
            const roles = membershipRoles(membership)

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
                      {statusLabel ? (
                        <span data-membership-current={membership.is_current ? 'true' : 'false'}>
                          {statusLabel}
                        </span>
                      ) : null}
                      {roles.length > 0 ? (
                        <span>
                          {roles.map((role, index) => (
                            <Fragment key={role.code}>
                              {index > 0 ? <span aria-hidden="true"> · </span> : null}
                              <span data-role-code={role.code}>{role.label_de}</span>
                            </Fragment>
                          ))}
                        </span>
                      ) : null}
                      {periodLabel ? <span>{periodLabel}</span> : null}
                    </span>
                    <span className={styles.membershipAction}>
                      Zur Gruppe
                      <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                  {showWorkspaceLink && membership.app_member_status === 'active' ? (
                    <Button
                      href={`/admin/fansubs/${membership.fansub_group_id}/edit`}
                      variant="secondary"
                    >
                      Zum Arbeitsbereich
                    </Button>
                  ) : null}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
