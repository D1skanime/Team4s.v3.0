'use client'

import Image from 'next/image'
import Link from 'next/link'

import studioStyles from '../../AdminStudio.module.css'
import { resolveCoverUrl } from '../../utils/anime-helpers'

/**
 * Task 2 (quick-261018-l5r), reiner Umbau ohne Verhaltensänderung: ausgelagerter Seitenkopf der
 * Anime-Bearbeitung (Titel, Schnellzugriffe, Cover-Vorschau), extrahiert aus
 * AnimeEditWorkspace.tsx (CLAUDE.md 450-Zeilen-Regel).
 */
interface AnimeEditHeaderBannerProps {
  animeID: number
  animeTitle: string
  coverImage?: string | null
}

export function AnimeEditHeaderBanner({ animeID, animeTitle, coverImage }: AnimeEditHeaderBannerProps) {
  return (
    <div className={studioStyles.editHeaderContent}>
      <div className={studioStyles.headerTop}>
        <div>
          <h1 className={studioStyles.pageTitle}>Anime bearbeiten</h1>
          <p className={studioStyles.itemTitle}>{animeTitle}</p>
          <div className={studioStyles.headerActions}>
            <Link href={`/admin/anime/${animeID}/episodes`} className={`${studioStyles.button} ${studioStyles.buttonPrimary}`}>
              Zu Episoden wechseln
            </Link>
            <Link href={`/anime/${animeID}`} className={`${studioStyles.button} ${studioStyles.buttonSecondary}`} target="_blank" rel="noreferrer">
              Public ansehen
            </Link>
          </div>
        </div>
        <Link href={`/anime/${animeID}`} target="_blank" rel="noreferrer" aria-label={`${animeTitle} öffentlich ansehen`}>
          <Image
            className={studioStyles.cover}
            src={resolveCoverUrl(coverImage ?? undefined)}
            alt=""
            width={96}
            height={136}
            unoptimized
          />
        </Link>
      </div>
    </div>
  )
}
