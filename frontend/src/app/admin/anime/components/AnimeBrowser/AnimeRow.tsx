import { AnimeListItem, AnimeStatus } from '@/types/anime'

import { handleCoverImgError, resolveAnimeStatusClass, resolveCoverUrl } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

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
}

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
}: AnimeRowProps) {
  const rawCover = (anime.cover_image || '').trim()
  const hasCover = rawCover.length > 0
  const coverMissing = !hasCover || hasCoverFailure

  return (
    <div className={`${styles.animeRow} ${isActive ? styles.animeRowActive : ''}`}>
      <img
        className={styles.animeThumb}
        src={coverMissing ? '/covers/placeholder.jpg' : resolveCoverUrl(rawCover)}
        alt=""
        loading="lazy"
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
            Bearbeiten
          </button>
          <a href={`/anime/${anime.id}`} className={styles.buttonSecondary} target="_blank" rel="noreferrer">
            Oeffnen
          </a>
          <button className={styles.buttonSecondary} type="button" onClick={onSync} disabled={isSyncDisabled || isSyncing}>
            {isSyncing ? 'Sync...' : 'Sync'}
          </button>
        </div>
      </div>
    </div>
  )
}
