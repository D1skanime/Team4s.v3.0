import Image from 'next/image'
import { AnimeListItem, AnimeStatus } from '@/types/anime'

import { handleCoverImgError, resolveAnimeStatusClass, resolveCoverUrl } from '../../utils/anime-helpers'
import sharedStyles from '../../../admin.module.css'
import browserStyles from './AnimeBrowser.module.css'

const styles = { ...sharedStyles, ...browserStyles }

/**
 * Props der AnimeRow-Komponente.
 * Enthalten alle Daten und Zustaende fuer eine einzelne Zeile im Anime-Browser
 * sowie die zugehoerigen Aktions-Callbacks.
 */
interface AnimeRowProps {
  anime: AnimeListItem
  isActive: boolean
  isLoadingContext: boolean
  isSyncing: boolean
  isSyncDisabled: boolean
  hasCoverFailure: boolean
  onSelect: () => void
  onSync: () => void
  onCoverError: () => void
  hideNonEssential: boolean
}

/**
 * Einzelne Zeile im Anime-Browser.
 * Rendert Cover-Thumbnail, Titel, ID, Status-Badge und die Aktionsleiste
 * mit "Kontext laden" sowie optionalem Kontext-Menue (Oeffnen, Synchronisieren).
 */
export function AnimeRow({
  anime,
  isActive,
  isLoadingContext,
  isSyncing,
  isSyncDisabled,
  hasCoverFailure,
  onSelect,
  onSync,
  onCoverError,
  hideNonEssential,
}: AnimeRowProps) {
  const rawCover = (anime.cover_image || '').trim()
  const hasCover = rawCover.length > 0
  const coverMissing = !hasCover || hasCoverFailure

  return (
    <div className={`${styles.animeRow} ${isActive ? styles.animeRowActive : ''}`}>
      <Image
        className={styles.animeThumb}
        src={coverMissing ? '/covers/placeholder.jpg' : resolveCoverUrl(rawCover)}
        alt=""
        width={44}
        height={58}
        unoptimized
        onError={(event) => {
          onCoverError()
          handleCoverImgError(event)
        }}
      />
      <div className={styles.animeMeta}>
        <div className={styles.animeTitleLine}>
          <p className={styles.animeTitleText}>
            #{anime.id} | {anime.title}
          </p>
          <div className={styles.badgeRow}>
            {coverMissing ? <span className={styles.coverMissingBadge}>cover fehlt</span> : null}
            <span className={`${styles.statusBadge} ${styles[resolveAnimeStatusClass(anime.status as AnimeStatus)]}`}>
              {anime.status}
            </span>
          </div>
        </div>
        <p className={styles.hint}>
          Typ: {anime.type} | Jahr: {anime.year ?? '-'} | Max Episoden: {anime.max_episodes ?? '-'}
        </p>
        <div className={styles.actions}>
          <button className={styles.button} type="button" onClick={onSelect} disabled={isLoadingContext}>
            Kontext laden
          </button>
          {!hideNonEssential ? (
            <>
              <details className={styles.rowContextMenu}>
                <summary className={styles.buttonSecondary}>Mehr</summary>
                <div className={styles.rowContextMenuBody}>
                  <a href={`/anime/${anime.id}`} className={styles.buttonSecondary} target="_blank" rel="noreferrer">
                    Oeffnen
                  </a>
                  <button className={styles.buttonSecondary} type="button" onClick={onSync} disabled={isSyncDisabled || isSyncing}>
                    {isSyncing ? 'Synchronisiert...' : 'Synchronisieren'}
                  </button>
                </div>
              </details>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
