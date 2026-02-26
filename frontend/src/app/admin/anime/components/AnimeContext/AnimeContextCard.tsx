import Link from 'next/link'
import { FormEvent, RefObject } from 'react'

import { AnimeDetail } from '@/types/anime'
import { FansubGroup } from '@/types/fansub'

import { resolveCoverUrl, handleCoverImgError } from '../../utils/anime-helpers'
import { AnimeContextFansubs } from './AnimeContextFansubs'
import styles from '../../../admin.module.css'

interface AnimeContextCardProps {
  anime: AnimeDetail | null
  fansubs: FansubGroup[]
  isLoading: boolean
  isLoadingFansubs: boolean
  contextAnimeIDInput: string
  onContextAnimeIDInputChange: (value: string) => void
  onSubmitContext: (event: FormEvent<HTMLFormElement>) => void
  onJumpToPatch: () => void
  onJumpToEpisodes: () => void
  contextAnchorRef: RefObject<HTMLDivElement>
}

export function AnimeContextCard({
  anime,
  fansubs,
  isLoading,
  isLoadingFansubs,
  contextAnimeIDInput,
  onContextAnimeIDInputChange,
  onSubmitContext,
  onJumpToPatch,
  onJumpToEpisodes,
  contextAnchorRef,
}: AnimeContextCardProps) {
  return (
    <section className={`${styles.panel} ${styles.contextPanel} ${styles.contextColumn}`}>
      <h2>Arbeitskontext (Anime)</h2>
      <p className={styles.hint}>Lade einen Anime, damit Episoden im selben Kontext erstellt und bearbeitet werden koennen.</p>
      <form className={styles.form} onSubmit={onSubmitContext}>
        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label htmlFor="context-anime-id">Anime ID</label>
            <input
              id="context-anime-id"
              value={contextAnimeIDInput}
              onChange={(event) => onContextAnimeIDInputChange(event.target.value)}
              disabled={isLoading}
              placeholder="z. B. 13394"
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={isLoading}>
            {isLoading ? 'Lade...' : 'Anime-Kontext laden'}
          </button>
          <Link href="/admin/episodes" className={styles.buttonSecondary}>
            Separater Episoden-Modus
          </Link>
          <Link href="/admin/anime/create" className={styles.buttonSecondary}>
            Neuen Anime erstellen
          </Link>
        </div>
      </form>

      {anime ? (
        <div className={styles.contextCard}>
          <div ref={contextAnchorRef} />
          <p className={styles.contextTitle}>
            Kontext aktiv: #{anime.id} {anime.title}
          </p>
          <p className={styles.hint}>
            Typ: {anime.type} | Status: {anime.status} | Episoden im Datensatz: {anime.episodes.length}
          </p>
          <p className={styles.contextDescription}>{anime.description?.trim() || 'Keine Beschreibung hinterlegt.'}</p>
          <div className={styles.actions}>
            <button className={styles.buttonSecondary} type="button" onClick={onJumpToPatch}>
              Zu Anime Patch
            </button>
            <button className={styles.buttonSecondary} type="button" onClick={onJumpToEpisodes}>
              Zu Episoden
            </button>
            <Link href={`/admin/anime/${anime.id}/versions`} className={styles.buttonSecondary}>
              Zu Versionen
            </Link>
            <a href={`/anime/${anime.id}`} className={styles.buttonSecondary} target="_blank" rel="noreferrer">
              Anime oeffnen
            </a>
          </div>
          <div className={styles.coverRow}>
            <img
              className={styles.coverPreview}
              src={resolveCoverUrl(anime.cover_image)}
              alt={`Cover ${anime.title}`}
              loading="lazy"
              onError={handleCoverImgError}
            />
            <div className={styles.coverMeta}>
              <p className={styles.hint}>cover_image: {anime.cover_image || '(leer)'}</p>
              <p className={styles.hint}>
                Tipp: lokale Covers liegen unter <code>/covers/&lt;datei&gt;</code> (z. B. <code>5bc0ef2c.jpg</code>).
              </p>
            </div>
          </div>
          <AnimeContextFansubs fansubs={fansubs} isLoading={isLoadingFansubs} />
        </div>
      ) : null}
    </section>
  )
}
