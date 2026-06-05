import Link from 'next/link'

import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import type { GroupExternalContributor, GroupTeamMember } from '@/types/groupContributors'

import styles from '../page.module.css'

interface TeamSectionProps {
  teamMembers: GroupTeamMember[]
  externalContributors: GroupExternalContributor[]
}

export function TeamSection({ teamMembers, externalContributors }: TeamSectionProps) {
  return (
    <div id="team" className={styles.teamSection}>
      <SectionHeader title="Beteiligte am Projekt" />

      {/* Block 1: Team-Beteiligte (release_member_roles) */}
      <div className={styles.teamBlock}>
        <h3 className={styles.blockTitle}>Team-Beteiligte</h3>
        {teamMembers.length === 0 ? (
          <EmptyState
            variant="compact"
            title="Noch keine Team-Mitglieder"
            description="Für dieses Projekt sind noch keine Team-Mitglieder erfasst."
          />
        ) : (
          <div className={styles.personGrid}>
            {teamMembers.map((m) => (
              <Card key={m.member_id} variant="elevated" className={styles.personCard}>
                {m.member_slug ? (
                  <Link href={`/members/${m.member_slug}`} className={styles.personName}>
                    {m.member_display_name}
                  </Link>
                ) : (
                  <span className={styles.personName}>{m.member_display_name}</span>
                )}
                <div className={styles.roleTags}>
                  {m.role_labels.map((role) => (
                    <Badge key={role} variant="muted">{role}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Block 2: Externe Mitwirkende (anime_contributions) — abgesetzt, Card flat */}
      <div className={styles.externalBlock}>
        <h3 className={styles.blockTitle}>Externe Mitwirkende</h3>
        {externalContributors.length === 0 ? (
          <EmptyState
            variant="compact"
            title="Keine externen Mitwirkenden"
            description="Für dieses Projekt sind noch keine externen Mitwirkenden hinterlegt."
          />
        ) : (
          <Card variant="flat" className={styles.externalList}>
            {externalContributors.map((c) => (
              <div key={c.member_display_name} className={styles.externalRow}>
                {c.member_slug ? (
                  <Link href={`/members/${c.member_slug}`}>{c.member_display_name}</Link>
                ) : (
                  <span>{c.member_display_name}</span>
                )}
                <div className={styles.roleTags}>
                  {c.role_labels.map((r) => (
                    <Badge key={r} variant="muted">{r}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
