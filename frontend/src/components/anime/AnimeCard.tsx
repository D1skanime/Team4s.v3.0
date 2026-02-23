'use client'

import Link from 'next/link'
import Image from 'next/image'

import { buildAnimeDetailHref, getGridScrollStorageKey } from '@/lib/animeGridContext'
import { getCoverUrl } from '@/lib/utils'
import { AnimeListItem } from '@/types/anime'

import { StatusBadge } from './StatusBadge'
import styles from './AnimeCard.module.css'

interface AnimeCardProps {
  anime: AnimeListItem
  gridQuery: string
}

export function AnimeCard({ anime, gridQuery }: AnimeCardProps) {
  const detailHref = buildAnimeDetailHref(anime.id, gridQuery)

  function handleOpenDetail() {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(getGridScrollStorageKey(gridQuery), String(window.scrollY))
  }

  return (
    <article className={styles.card}>
      <Link href={detailHref} className={styles.link} onClick={handleOpenDetail}>
        <div className={styles.coverWrap}>
          <Image
            src={getCoverUrl(anime.cover_image)}
            alt={anime.title}
            width={300}
            height={400}
            className={styles.cover}
          />
        </div>
        <div className={styles.content}>
          <h3 className={styles.title}>{anime.title}</h3>
          <p className={styles.meta}>
            <span>{anime.type.toUpperCase()}</span>
            <span>&bull;</span>
            <span>{anime.year ?? 'n/a'}</span>
            <span>&bull;</span>
            <span>{anime.max_episodes ?? 'n/a'} Ep.</span>
          </p>
          <StatusBadge status={anime.status} />
        </div>
      </Link>
    </article>
  )
}
