import Link from 'next/link'

import fansubSurfaceStyles from '@/app/fansubs/[slug]/page.module.css'
import { PublicReleaseBlock, type PublicReleasePreview } from '@/components/fansubs/PublicReleaseBlock'
import type { EpisodeReleaseSummary } from '@/types/group'

import styles from '../page.module.css'
import { OlderReleasesList } from './OlderReleasesList'

interface ReleasesSectionProps {
  episodes: EpisodeReleaseSummary[]
  publicReleasePreviews: PublicReleasePreview[]
  animeID: number
  groupID: number
  canonicalProjectPath?: string | null
  releaseBackdropUrl?: string | null
}

/**
 * AO4-13: komponiert das eingebettete neueste Release (AO4-11, hoechste
 * episode_number/rev.id — `episodes` ist aufsteigend sortiert) und die
 * kompakte, per Cursor nachladende Liste aelterer Releases (AO4-12).
 * Wird von der Seite nur gerendert, wenn `episodes.length > 0` ist — der
 * Leerfall laeuft ueber den gemeinsamen Sammel-Hinweis (AO4-07).
 */
export function ReleasesSection({
  episodes,
  publicReleasePreviews,
  animeID,
  groupID,
  canonicalProjectPath,
  releaseBackdropUrl,
}: ReleasesSectionProps) {
  if (episodes.length === 0) return null
  const [latestRelease] = publicReleasePreviews

  return (
    <>
      {latestRelease ? (
        <PublicReleaseBlock latestRelease={latestRelease} releases={[]} />
      ) : null}
      <div className={fansubSurfaceStyles.sectionBand} data-project-release-band>
        {releaseBackdropUrl ? (
          <div
            className={`${fansubSurfaceStyles.sectionBandBackdrop} ${styles.releaseBandBackdrop}`}
            style={{ backgroundImage: `url("${releaseBackdropUrl}")` }}
            aria-hidden="true"
          />
        ) : null}
        <div className={styles.releaseBandContent}>
          <OlderReleasesList
            animeID={animeID}
            groupID={groupID}
            canonicalProjectPath={canonicalProjectPath}
          />
          <div className={styles.releasesCta}>
            <Link href={`/anime/${animeID}/group/${groupID}/releases`} className={styles.releasesButton}>
              Alle Releases ansehen
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
