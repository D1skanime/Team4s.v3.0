import Link from 'next/link'

import fansubSurfaceStyles from '@/app/fansubs/[slug]/page.module.css'
import { PublicReleaseBlock, type PublicReleasePreview } from '@/components/fansubs/PublicReleaseBlock'

import styles from '../page.module.css'
import { OlderReleasesList } from './OlderReleasesList'

interface ReleasesSectionProps {
  publicReleasePreviews: PublicReleasePreview[]
  animeID: number
  groupID: number
  canonicalProjectPath?: string | null
  releaseBackdropUrl?: string | null
}

/**
 * AO4-13: komponiert das eingebettete neueste Release (AO4-11) und die
 * kompakte, per Cursor nachladende Liste aelterer Releases (AO4-12).
 * Wird von der Seite nur gerendert, wenn `data.hasReleases` true ist (Plan 155-04:
 * `releaseVersionCount > 0 || publicReleasePreviews.length > 0`) — der Leerfall laeuft
 * ueber den gemeinsamen Sammel-Hinweis (AO4-07). Die frueher hier zusaetzlich gepruefte,
 * separat uebergebene `episodes`-Liste (per_page:100) war ein redundantes zweites Gate und
 * ist mit dem Fetch selbst entfernt worden.
 */
export function ReleasesSection({
  publicReleasePreviews,
  animeID,
  groupID,
  canonicalProjectPath,
  releaseBackdropUrl,
}: ReleasesSectionProps) {
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
