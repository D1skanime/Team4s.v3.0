import Link from 'next/link'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { EpisodeReleaseSummary } from '@/types/group'

import styles from '../page.module.css'

interface ReleasesSectionProps {
  episodes: EpisodeReleaseSummary[]
  animeID: number
  groupID: number
}

export function ReleasesSection({ episodes, animeID, groupID }: ReleasesSectionProps) {
  return (
    <div id="releases" className={styles.releasesSection}>
      <SectionHeader title="Releases & Versionen" />
      {episodes.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Noch keine Releases"
          description="Für dieses Projekt sind noch keine öffentlichen Releases vorhanden."
        />
      ) : (
        <div className={styles.releaseGrid}>
          {episodes.map((ep) => (
            <Card key={ep.id} variant="interactive" className={styles.releaseCard}>
              <p className={styles.releaseTitle}>
                {ep.title ?? `Episode ${ep.episode_number}`}
              </p>
              {ep.version_label ? (
                <span className={styles.releaseMeta}>{ep.version_label}</span>
              ) : null}
              {/* Release-derived counters remain hidden until backed by real fields. */}
              {ep.released_at ? (
                <span className={styles.releaseMeta}>{ep.released_at}</span>
              ) : null}
              {/* NOTE: has_op/has_ed/karaoke_count are dummy values per RESEARCH — do NOT render */}
            </Card>
          ))}
        </div>
      )}
      <div className={styles.releasesCta}>
        <Link href={`/anime/${animeID}/group/${groupID}/releases`} className={styles.releasesButton}>
          Alle Releases ansehen
        </Link>
      </div>
    </div>
  )
}
