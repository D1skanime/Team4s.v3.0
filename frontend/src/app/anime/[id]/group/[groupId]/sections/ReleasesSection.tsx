import Link from 'next/link'

import { PublicReleaseBlock, type PublicReleasePreview } from '@/components/fansubs/PublicReleaseBlock'
import type { EpisodeReleaseSummary } from '@/types/group'

import styles from '../page.module.css'
import { OlderReleasesList } from './OlderReleasesList'

interface ReleasesSectionProps {
  episodes: EpisodeReleaseSummary[]
  publicReleasePreviews: PublicReleasePreview[]
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
export function ReleasesSection({ episodes, publicReleasePreviews, animeID, groupID }: ReleasesSectionProps) {
  if (episodes.length === 0) return null
  const [latestRelease, ...otherReleases] = publicReleasePreviews

  return (
    <>
      {latestRelease ? (
        <PublicReleaseBlock latestRelease={latestRelease} releases={otherReleases} />
      ) : (
        <OlderReleasesList animeID={animeID} groupID={groupID} />
      )}
      <div className={styles.releasesCta}>
        <Link href={`/anime/${animeID}/group/${groupID}/releases`} className={styles.releasesButton}>
          Alle Releases ansehen
        </Link>
      </div>
    </>
  )
}
