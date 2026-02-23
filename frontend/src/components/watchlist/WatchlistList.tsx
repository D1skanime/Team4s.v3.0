'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { StatusBadge } from '@/components/anime/StatusBadge'
import { ApiError, removeWatchlistEntry } from '@/lib/api'
import { PaginationMeta } from '@/types/anime'
import { getCoverUrl } from '@/lib/utils'
import { WatchlistItem } from '@/types/watchlist'

import styles from './WatchlistList.module.css'

interface WatchlistListProps {
  items: WatchlistItem[]
  meta: PaginationMeta
  page: number
  perPage: number
}

function buildWatchlistHref(page: number, perPage: number): string {
  return `/watchlist?page=${page}&per_page=${perPage}`
}

export function WatchlistList({ items, meta, page, perPage }: WatchlistListProps) {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()

  const [entries, setEntries] = useState(items)
  const [busyAnimeID, setBusyAnimeID] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const totalEntries = useMemo(() => Math.max(meta.total - (items.length - entries.length), 0), [entries.length, items.length, meta.total])
  const countLabel = useMemo(() => `${totalEntries.toLocaleString('de-DE')} Eintraege`, [totalEntries])
  const currentPage = Math.max(meta.page || page, 1)
  const totalPages = Math.max(meta.total_pages, 1)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  useEffect(() => {
    if (!isRefreshing && message === 'Watchlist wird aktualisiert...') {
      setMessage('Watchlist aktualisiert.')
    }
  }, [isRefreshing, message])

  async function handleRemove(animeID: number) {
    if (busyAnimeID !== null) {
      return
    }

    try {
      setBusyAnimeID(animeID)
      setMessage(null)
      await removeWatchlistEntry(animeID)
      setEntries((current) => current.filter((entry) => entry.anime_id !== animeID))
      setMessage('Aus Watchlist entfernt.')
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message)
      } else {
        setMessage('Watchlist-Eintrag konnte nicht entfernt werden.')
      }
    } finally {
      setBusyAnimeID(null)
    }
  }

  function handleRefresh() {
    setMessage('Watchlist wird aktualisiert...')
    startRefreshTransition(() => {
      router.refresh()
    })
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.topBar}>
        <p className={styles.subtitle}>{countLabel}</p>
        <div className={styles.topActions}>
          <button type="button" className={styles.refreshButton} onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Aktualisiere...' : 'Neu laden'}
          </button>
        </div>
      </div>
      <div className={styles.paginationRow}>
        <span className={styles.pageInfo}>
          Seite {currentPage} von {totalPages}
        </span>
        <div className={styles.paginationActions}>
          {hasPreviousPage ? (
            <Link className={styles.pageLink} href={buildWatchlistHref(currentPage - 1, perPage)}>
              Zurueck
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled}>Zurueck</span>
          )}
          {hasNextPage ? (
            <Link className={styles.pageLink} href={buildWatchlistHref(currentPage + 1, perPage)}>
              Weiter
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled}>Weiter</span>
          )}
        </div>
      </div>

      {message ? <p className={styles.message}>{message}</p> : null}

      {entries.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Auf dieser Seite gibt es aktuell keine Watchlist-Eintraege.</p>
          {currentPage > 1 ? (
            <p>
              <Link href={buildWatchlistHref(currentPage - 1, perPage)}>Zur vorherigen Seite wechseln</Link>
            </p>
          ) : (
            <p>
              Fuege in der <Link href="/anime">Anime-Liste</Link> neue Titel hinzu.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {entries.map((entry) => (
            <article key={entry.anime_id} className={styles.card}>
              <Link href={`/anime/${entry.anime_id}`} className={styles.link}>
                <div className={styles.coverWrap}>
                  <Image
                    src={getCoverUrl(entry.cover_image)}
                    alt={entry.title}
                    width={300}
                    height={400}
                    className={styles.cover}
                  />
                </div>
                <div className={styles.content}>
                  <h3 className={styles.title}>{entry.title}</h3>
                  <p className={styles.meta}>
                    <span>{entry.type.toUpperCase()}</span>
                    <span>&bull;</span>
                    <span>{entry.year ?? 'n/a'}</span>
                    <span>&bull;</span>
                    <span>{entry.max_episodes ?? 'n/a'} Ep.</span>
                  </p>
                  <StatusBadge status={entry.status} />
                </div>
              </Link>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => void handleRemove(entry.anime_id)}
                  disabled={busyAnimeID === entry.anime_id}
                >
                  {busyAnimeID === entry.anime_id ? 'Entfernen...' : 'Entfernen'}
                </button>
                <span className={styles.addedAt}>
                  Hinzugefuegt: {new Date(entry.added_at).toLocaleDateString('de-DE')}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
