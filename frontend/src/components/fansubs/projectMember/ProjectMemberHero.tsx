import Image from 'next/image'

import { Button } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { roleColorCode } from '@/lib/roleColors'
import type { ProjectMemberSummary } from '@/types/projectMember'

import { getMemberInitials } from '../fansubTeamInitials'
import styles from './ProjectMemberPage.module.css'

interface ProjectMemberHeroProps {
  summary: ProjectMemberSummary
  memberSlug: string
  groupName: string
  animeTitle: string
  projectPath: string
}

// Kompakter Hero — bewusst NICHT das große allgemeine Memberprofil (Brief 6/26):
// nur Avatar, Name, optionaler Verifiziert-Badge, Kontextzeile, Rollen-Chips (D-12) und
// zwei Absprünge (allgemeines Profil + zurück zum Projekt, D-16). Die Rollen-Chips tragen die
// globalen Team4s-Rollenfarben (data-role-code → --role-accent).
export function ProjectMemberHero({
  summary,
  memberSlug,
  groupName,
  animeTitle,
  projectPath,
}: ProjectMemberHeroProps) {
  return (
    <section className={styles.hero} aria-label="Projekt-Mitwirkung">
      <span className={styles.heroAvatar} aria-hidden="true">
        {summary.member_avatar_url ? (
          <Image
            src={resolveApiUrl(summary.member_avatar_url)}
            alt=""
            width={72}
            height={72}
            className={styles.heroAvatarImg}
            unoptimized
          />
        ) : (
          getMemberInitials(summary.member_display_name)
        )}
      </span>
      <div className={styles.heroBody}>
        <div className={styles.heroNameRow}>
          <h1 className={styles.heroName}>{summary.member_display_name}</h1>
          {summary.is_verified ? <span className={styles.chip}>Verifiziert</span> : null}
        </div>
        <p className={styles.heroContext}>
          Mitwirkung an {animeTitle} · {groupName}
        </p>
        {summary.role_labels.length > 0 ? (
          <div className={styles.heroChips}>
            {summary.role_labels.map((role) => (
              <span
                key={role}
                className={styles.roleChip}
                data-role-code={roleColorCode(role)}
              >
                {role}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.heroActions}>
          <Button href={`/members/${memberSlug}`} variant="secondary" size="sm">
            Vollständiges Memberprofil
          </Button>
          <Button href={projectPath} variant="ghost" size="sm">
            Zurück zum Projekt
          </Button>
        </div>
      </div>
    </section>
  )
}
