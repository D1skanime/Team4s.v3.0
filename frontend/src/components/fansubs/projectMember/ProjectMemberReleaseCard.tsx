'use client'

import Link from 'next/link'

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

// Kompakte Release-Karte (Brief 19): Folge | Version, Bestätigt-Datum, Rollen, Release-Link.
// Keine Bilder/Volltexte (D-07/Brief 16).
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
    <article className={styles.card}>
      <div className={styles.episode}>Folge {release.episode_label}</div>
      <div className={styles.body}>
        <p className={styles.version}>Release-Version {release.version_label}</p>
        <p className={styles.confirmed}>
          {date ? `Mitwirkung bestätigt · ${date}` : 'Mitwirkung bestätigt'}
        </p>
        {release.role_labels.length > 0 ? (
          <div className={styles.roles}>
            {release.role_labels.map((role) => (
              <span key={role} className={styles.role}>
                {role}
              </span>
            ))}
          </div>
        ) : null}
        <Link href={href} className={styles.link}>
          Release ansehen →
        </Link>
      </div>
    </article>
  )
}
