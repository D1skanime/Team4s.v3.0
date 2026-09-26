import Link from 'next/link'

import { buildFansubReleaseHref } from '@/lib/fansubProjectRoutes'
import type { PublicReleaseNavigationTarget } from '@/types/releaseDetail'

import styles from './page.module.css'

interface ReleaseVersionSwitcherProps {
  animeID: number
  releases: PublicReleaseNavigationTarget[]
}

export function ReleaseVersionSwitcher({ animeID, releases }: ReleaseVersionSwitcherProps) {
  if (releases.length === 0) return null

  return (
    <nav className={styles.releaseSwitcher} aria-label="Weitere Releases dieser Episode">
      <span className={styles.releaseSwitcherLabel}>Weitere Releases dieser Episode</span>
      <div className={styles.releaseSwitcherLinks}>
        {releases.map((release) => (
          <Link
            key={release.release_version_id}
            href={buildFansubReleaseHref({
              animeID,
              groupID: release.group_id,
              releaseVersionID: release.release_version_id,
            })}
            className={styles.releaseSwitcherLink}
          >
            <span>{release.group_name || 'Weitere Gruppe'}</span>
            <span className={styles.releaseSwitcherVersion}>{release.version}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
