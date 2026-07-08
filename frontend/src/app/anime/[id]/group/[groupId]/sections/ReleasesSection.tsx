import Link from 'next/link'

import type { EpisodeReleaseSummary } from '@/types/group'

import styles from '../page.module.css'
import { LatestReleaseSection } from './LatestReleaseSection'
import { OlderReleasesList } from './OlderReleasesList'

interface ReleasesSectionProps {
  episodes: EpisodeReleaseSummary[]
  animeID: number
  groupID: number
}

/**
 * AO4-13: komponiert das eingebettete neueste Release (AO4-11, hoechste
 * episode_number/rev.id — `episodes` ist aufsteigend sortiert) und die
 * kompakte, per Cursor nachladende Liste aelterer Releases (AO4-12).
 * Wird von der Seite nur gerendert, wenn `episodes.length > 0` ist — der
 * Leerfall laeuft ueber den gemeinsamen Sammel-Hinweis (AO4-07).
 */
export function ReleasesSection({ episodes, animeID, groupID }: ReleasesSectionProps) {
  if (episodes.length === 0) return null

  const latest = episodes[episodes.length - 1]
  const hasOlderReleases = episodes.length > 1

  return (
    <>
      <LatestReleaseSection animeID={animeID} groupID={groupID} releaseVersionID={latest.id} />
      {hasOlderReleases ? (
        <OlderReleasesList animeID={animeID} groupID={groupID} excludeReleaseVersionId={latest.id} />
      ) : null}
      <div className={styles.releasesCta}>
        <Link href={`/anime/${animeID}/group/${groupID}/releases`} className={styles.releasesButton}>
          Alle Releases ansehen
        </Link>
      </div>
    </>
  )
}
