import Link from 'next/link'
import Image from 'next/image'
import { Users } from 'lucide-react'

import { Badge, Card, SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { MemberProfileMembership } from '@/types/profile'

import styles from './profile.module.css'

type MembershipsSectionProps = {
  memberships: MemberProfileMembership[]
}

export function MembershipsSection({ memberships }: MembershipsSectionProps) {
  return (
    <section className={styles.membershipsSection}>
      <SectionHeader title="Fansub-Gruppen" />
      {memberships.length === 0 ? (
        <p className={styles.emptyText}>Keine Gruppen eingetragen.</p>
      ) : (
        <ul className={styles.membershipsList}>
          {memberships.map((membership) => (
            <li key={membership.fansub_group_id}>
              <Card variant="nested" className={styles.membershipCard}>
                <Link className={styles.membershipLink} href={`/fansubs/${membership.fansub_group_slug}`}>
                  <span className={styles.membershipLogo}>
                    {membership.logo_url ? (
                      <Image src={resolveApiUrl(membership.logo_url)} alt="" width={52} height={52} unoptimized />
                    ) : (
                      <Users size={32} aria-hidden="true" />
                    )}
                  </span>
                  <span className={styles.membershipName}>
                    <strong>{membership.fansub_group_name}</strong>
                  </span>
                </Link>
                {membership.app_member_roles && membership.app_member_roles.length > 0 ? (
                  <div className={styles.chipRow}>
                    {membership.app_member_roles.map((role) => (
                      <Badge key={role} variant="info">
                        {role}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
