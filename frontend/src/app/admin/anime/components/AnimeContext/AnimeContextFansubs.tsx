import { FansubGroup } from '@/types/fansub'

import { buildFansubStoryPreview } from '../../utils/episode-helpers'
import sharedStyles from '../../../admin.module.css'
import contextStyles from './AnimeContext.module.css'

const styles = { ...sharedStyles, ...contextStyles }

/**
 * Props der AnimeContextFansubs-Komponente.
 * Enthalten die Liste der verknuepften Fansub-Gruppen und
 * einen Ladezustand.
 */
interface AnimeContextFansubsProps {
  fansubs: FansubGroup[]
  isLoading: boolean
}

/**
 * Lese-only-Anzeige der Fansub-Historie eines Anime.
 * Rendert eine kompakte Karte pro Fansub-Gruppe mit
 * einem Link zur Gruppendetailseite und einer kurzen Story-Vorschau.
 */
export function AnimeContextFansubs({ fansubs, isLoading }: AnimeContextFansubsProps) {
  return (
    <div className={styles.contextFansubSection}>
      <p className={styles.hint}>Fansub-Historie ({fansubs.length})</p>
      {isLoading ? <p className={styles.hint}>Fansub-Daten werden geladen...</p> : null}
      {!isLoading && fansubs.length === 0 ? <p className={styles.hint}>Keine Fansub-Verknuepfung fuer diesen Anime vorhanden.</p> : null}
      {!isLoading && fansubs.length > 0 ? (
        <div className={styles.contextFansubGrid}>
          {fansubs.map((group) => (
            <article key={group.id} className={styles.contextFansubCard}>
              <p className={styles.contextFansubTitle}>
                <a href={`/fansubs/${group.slug}`} target="_blank" rel="noreferrer">
                  {group.name}
                </a>
              </p>
              <p className={styles.contextFansubStory}>{buildFansubStoryPreview(group)}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
