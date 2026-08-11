'use client'

import Link from 'next/link'

import { roleColorCode } from '@/lib/roleColors'
import type { ProjectMemberRelease } from '@/types/projectMember'

import styles from './ProjectMemberReleasesSection.module.css'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

// Kompakte Release-Zeile (Brief 3.4/19): eine dichte Zeile statt einer grossen Karte — reine
// Crew-Historie, keine Bilder/Volltexte. Rollen als kleine, farbcodierte Chips (Team4s-Rollenfarben).
export function ProjectMemberReleaseCard({
  release,
  projectPath,
}: {
  release: ProjectMemberRelease
  projectPath: string
}) {
  const href = `${projectPath}/releases/${release.release_version_id}`
  const date = formatDate(release.confirmed_at)

  return (
    <li className={styles.row}>
      <span className={styles.rowEpisode}>Folge {release.episode_label}</span>
      <span className={styles.rowVersion}>{release.version_label}</span>
      <span className={styles.rowRoles}>
        {release.role_labels.map((role) => (
          <span key={role} className={styles.roleTag} data-role-code={roleColorCode(role)}>
            {role}
          </span>
        ))}
      </span>
      {date ? <span className={styles.rowDate}>bestätigt {date}</span> : null}
      <Link href={href} className={styles.rowLink}>
        Release ansehen →
      </Link>
    </li>
  )
}
