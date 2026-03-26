import Image from 'next/image'
import Link from 'next/link'

import { ApiError, getAnimeList } from '@/lib/api'
import { getCoverUrl } from '@/lib/utils'

import styles from './AdminStudio.module.css'

export const dynamic = 'force-dynamic'

function resolveStatusTone(status: string): string {
  switch (status) {
    case 'ongoing':
      return styles.badgeSuccess
    case 'done':
      return styles.badgePrimary
    case 'disabled':
    case 'aborted':
      return styles.badgeDanger
    case 'licensed':
      return styles.badgeWarning
    default:
      return styles.badgeMuted
  }
}

export default async function AdminAnimePage() {
  let animeItems: Awaited<ReturnType<typeof getAnimeList>>['data'] = []
  let listError: string | null = null

  try {
    const response = await getAnimeList({ page: 1, per_page: 24, include_disabled: true })
    animeItems = response.data
  } catch (error) {
    listError =
      error instanceof ApiError
        ? `Anime-Liste konnte nicht geladen werden. (${error.status}) ${error.message}`
        : 'Anime-Liste konnte nicht geladen werden.'
  }

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
          <h1 className={styles.pageTitle}>Anime anlegen</h1>
          <p className={styles.pageSubtitle}>
            Waehle den Einstieg fuer den neuen Anime. Nach dem Speichern muss der Eintrag direkt in der Uebersicht
            erscheinen, damit du ihn sauber pruefen und wieder oeffnen kannst.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/anime/create" className={`${styles.button} ${styles.buttonPrimary}`}>
            Neu manuell
          </Link>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Manuell starten</h2>
            <p className={styles.sectionMeta}>
              Titel und Cover reichen fuer den ersten Anime-Eintrag. Alles Weitere kann nach dem ersten Speichern im
              Studio gepflegt werden.
            </p>
          </div>
        </div>
        <div className={styles.actionsRow}>
          <Link href="/admin/anime/create" className={`${styles.button} ${styles.buttonPrimary}`}>
            Neu manuell
          </Link>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Jellyfin</h2>
            <p className={styles.sectionMeta}>
              Diese Option bleibt fuer Phase 3 reserviert. In diesem Schritt erscheint bewusst keine Suche, keine
              Vorschau und keine Herkunftssteuerung.
            </p>
          </div>
        </div>
        <div className={styles.noticeBox}>
          Jellyfin-gestuetzte Auswahl folgt in der naechsten Phase. Dieser Einstieg bleibt sichtbar, fuehrt aber noch
          nicht in eine Such- oder Preview-Oberflaeche.
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Vorhandene Anime</h2>
            <p className={styles.sectionMeta}>
              Neu angelegte Anime muessen hier sofort sichtbar sein. Von hier aus kommst du zur Bearbeitung oder in die
              Public-Ansicht.
            </p>
          </div>
        </div>

        {listError ? <div className={styles.errorBox}>{listError}</div> : null}

        {!listError && animeItems.length === 0 ? <p className={styles.emptyState}>Noch keine Anime vorhanden.</p> : null}

        {!listError && animeItems.length > 0 ? (
          <div className={styles.stack}>
            {animeItems.map((anime) => (
              <article key={anime.id} className={styles.animeCard}>
                <Image
                  className={styles.cover}
                  src={getCoverUrl(anime.cover_image)}
                  alt={anime.title}
                  width={96}
                  height={136}
                  unoptimized
                />
                <div className={styles.itemBody}>
                  <div>
                    <h3 className={styles.itemTitle}>{anime.title}</h3>
                    <p className={styles.metaText}>
                      #{String(anime.id).padStart(3, '0')} | {anime.type.toUpperCase()}
                      {anime.year ? ` | ${anime.year}` : ''}
                      {anime.max_episodes ? ` | ${anime.max_episodes} Episoden` : ''}
                    </p>
                  </div>
                  <div className={styles.badgeRow}>
                    <span className={`${styles.badge} ${resolveStatusTone(anime.status)}`}>{anime.status}</span>
                  </div>
                  <div className={styles.actionsRow}>
                    <Link href={`/admin/anime/${anime.id}/edit`} className={`${styles.button} ${styles.buttonPrimary}`}>
                      Bearbeiten
                    </Link>
                    <Link
                      href={`/anime/${anime.id}`}
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      target="_blank"
                      rel="noreferrer"
                    >
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
