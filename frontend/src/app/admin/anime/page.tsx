'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { getRuntimeAuthToken } from '@/lib/api'
import { AnimeStatus } from '@/types/anime'

import { useAnimeBrowser } from './hooks/useAnimeBrowser'
import styles from './AdminStudio.module.css'
import { handleCoverImgError, resolveCoverUrl } from './utils/anime-helpers'

function formatAnimeStatus(status: AnimeStatus): string {
  switch (status) {
    case 'ongoing':
      return 'laufend'
    case 'done':
      return 'abgeschlossen'
    case 'aborted':
      return 'abgebrochen'
    case 'licensed':
      return 'lizenziert'
    case 'disabled':
    default:
      return 'deaktiviert'
  }
}

function resolveStatusBadgeClass(status: AnimeStatus): string {
  switch (status) {
    case 'ongoing':
      return styles.badgeSuccess
    case 'done':
      return styles.badgePrimary
    case 'aborted':
      return styles.badgeDanger
    case 'licensed':
      return styles.badgeWarning
    case 'disabled':
    default:
      return styles.badgeMuted
  }
}

export default function AdminAnimePage() {
  const browser = useAnimeBrowser()
  const [queryInput, setQueryInput] = useState('')
  const [authToken] = useState(() => getRuntimeAuthToken())

  const hasAuthToken = authToken.trim().length > 0

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <span>Anime</span>
      </nav>

      <header className={styles.headerCard}>
        <div>
          <p className={styles.eyebrow}>Schritt 1</p>
          <h1 className={styles.pageTitle}>Anime auswaehlen</h1>
          <p className={styles.pageSubtitle}>
            Reine Auswahlansicht fuer den Einstieg in den Admin-Flow. Keine Episoden, keine Inline-Editoren, kein
            Kontext-Overload.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/anime/create" className={`${styles.button} ${styles.buttonSecondary}`}>
            Neuen Anime anlegen
          </Link>
        </div>
      </header>

      {!hasAuthToken ? (
        <div className={styles.noticeBox}>
          Kein Access-Token gefunden. Bearbeiten ist nur mit gueltiger Anmeldung sinnvoll. Die Auswahlansicht bleibt
          trotzdem nutzbar.
        </div>
      ) : null}

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Suche und Filter</h2>
            <p className={styles.sectionMeta}>Suchfeld, Anfangsbuchstabe und Cover-Status bestimmen die Liste.</p>
          </div>
          <p className={styles.sectionMeta}>
            {browser.total} Treffer, Seite {browser.page} von {browser.totalPages}
          </p>
        </div>

        <div className={styles.filterGrid}>
          <label className={styles.field}>
            <span>Suche</span>
            <input
              className={styles.input}
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Titel suchen..."
            />
          </label>

          <label className={styles.field}>
            <span>Buchstabe</span>
            <select
              className={styles.select}
              value={browser.letter}
              onChange={(event) => browser.setLetter(event.target.value)}
            >
              <option value="">alle</option>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Cover</span>
            <select
              className={styles.select}
              value={browser.hasCover}
              onChange={(event) => browser.setHasCover(event.target.value as 'all' | 'missing' | 'present')}
            >
              <option value="all">alle</option>
              <option value="present">mit Cover</option>
              <option value="missing">ohne Cover</option>
            </select>
          </label>
        </div>

        <div className={styles.actionsRow}>
          <button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={() => browser.setQuery(queryInput)}>
            Suche anwenden
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            type="button"
            onClick={() => {
              setQueryInput('')
              browser.setQuery('')
              browser.setLetter('')
              browser.setHasCover('all')
            }}
          >
            Filter zuruecksetzen
          </button>
          <button
            className={`${styles.button} ${styles.buttonGhost}`}
            type="button"
            onClick={() => {
              void browser.refresh()
            }}
          >
            Liste neu laden
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Anime-Liste</h2>
            <p className={styles.sectionMeta}>Card-Layout mit klarer Primaeraktion fuer den naechsten Bearbeitungsschritt.</p>
          </div>
          {browser.totalPages > 1 ? (
            <div className={styles.sectionActions}>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={() => browser.setPage(browser.page - 1)}
                disabled={browser.page <= 1 || browser.isLoading}
              >
                Vorherige
              </button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={() => browser.setPage(browser.page + 1)}
                disabled={browser.page >= browser.totalPages || browser.isLoading}
              >
                Naechste
              </button>
            </div>
          ) : null}
        </div>

        {browser.isLoading ? <p className={styles.emptyState}>Anime-Liste wird geladen...</p> : null}
        {!browser.isLoading && browser.items.length === 0 ? (
          <p className={styles.emptyState}>Keine Treffer fuer die aktuelle Filterkombination.</p>
        ) : null}

        {!browser.isLoading && browser.items.length > 0 ? (
          <div className={styles.listGrid}>
            {browser.items.map((anime) => (
              <article key={anime.id} className={styles.animeCard}>
                <Image
                  className={styles.cover}
                  src={resolveCoverUrl(anime.cover_image)}
                  alt=""
                  width={96}
                  height={136}
                  unoptimized
                  onError={(event) => {
                    browser.markCoverFailure(anime.id)
                    handleCoverImgError(event)
                  }}
                />
                <div className={styles.itemBody}>
                  <div className={styles.stack}>
                    <h3 className={styles.itemTitle}>{anime.title}</h3>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${styles.badgePrimary}`}>{anime.type}</span>
                      <span className={`${styles.badge} ${resolveStatusBadgeClass(anime.status)}`}>
                        {formatAnimeStatus(anime.status)}
                      </span>
                    </div>
                    <p className={styles.metaText}>
                      ID #{anime.id}
                      {anime.year ? ` | Jahr ${anime.year}` : ''}
                      {typeof anime.max_episodes === 'number' ? ` | max. ${anime.max_episodes} Episoden` : ''}
                    </p>
                  </div>
                  <div className={styles.actionsRow}>
                    <Link href={`/admin/anime/${anime.id}/edit`} className={`${styles.button} ${styles.buttonPrimary}`}>
                      Anime bearbeiten
                    </Link>
                    <Link href={`/anime/${anime.id}`} className={`${styles.button} ${styles.buttonGhost}`} target="_blank" rel="noreferrer">
                      Public ansehen
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}
