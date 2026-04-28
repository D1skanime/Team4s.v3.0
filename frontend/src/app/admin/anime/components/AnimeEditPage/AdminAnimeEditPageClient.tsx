'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { getAnimeByID, getRuntimeAuthToken } from '@/lib/api'
import { AnimeDetail } from '@/types/anime'

import { useJellyfinSync } from '../../hooks/useJellyfinSync'
import styles from '../../AdminStudio.module.css'
import { resolveCoverUrl } from '../../utils/anime-helpers'
import { JellyfinSyncPanel } from '../JellyfinSync/JellyfinSyncPanel'
import { AnimeEditWorkspace } from './AnimeEditWorkspace'
import { AnimeThemesSection } from './AnimeThemesSection'

/**
 * Props der AdminAnimeEditPageClient-Komponente.
 * Enthalten die ID des Anime, den serverseitig vorgeladenen
 * Anime-Datensatz sowie einen optionalen initialen Ladefehler.
 */
interface AdminAnimeEditPageClientProps {
  animeID: number | null
  initialAnime: AnimeDetail | null
  initialError: string | null
}

/**
 * Erstellt ein kurzes Anzeigelabel fuer einen Anime (ID + Titel).
 */
function formatAnimeLabel(anime: AnimeDetail): string {
  return `${String(anime.id).padStart(3, '0')} ${anime.title}`
}

/**
 * Client-Hauptkomponente der Anime-Bearbeitungsseite.
 * Rendert Breadcrumb, Header, Fehler-/Erfolgsmeldungen,
 * das Bearbeitungsformular (AnimeEditWorkspace) sowie
 * das Jellyfin-Sync-Panel und das Developer-Panel.
 */
export function AdminAnimeEditPageClient({
  animeID,
  initialAnime,
  initialError,
}: AdminAnimeEditPageClientProps) {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [anime, setAnime] = useState<AnimeDetail | null>(initialAnime)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const jellyfin = useJellyfinSync(
    authToken,
    (message) => {
      setErrorMessage(null)
      setSuccessMessage(message)
    },
    (message) => {
      setSuccessMessage(null)
      setErrorMessage(message)
    },
  )

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        {anime ? (
          <>
            <span>{formatAnimeLabel(anime)}</span>
            <span>/</span>
          </>
        ) : null}
        <span>Bearbeiten</span>
      </nav>

      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.pageTitle}>Anime bearbeiten</h1>
          <p className={styles.pageSubtitle}>
            Die Route nutzt jetzt dieselbe vierteilige Editor-Grundlage wie `/admin/anime/create`: Quelle,
            Assets, Details und abschliessendes Speichern. Episoden und Versionen bleiben bewusst ausgelagert.
          </p>
        </div>
        {anime ? (
          <div className={styles.headerActions}>
            <Link href={`/admin/anime/${anime.id}/episodes`} className={`${styles.button} ${styles.buttonPrimary}`}>
              Zu Episoden wechseln
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
        ) : null}
        {anime ? (
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.itemTitle}>{anime.title}</p>
              <p className={styles.sectionMeta}>
                #{String(anime.id).padStart(3, '0')} | Typ {anime.type} | Status {anime.status}
              </p>
            </div>
            <Image className={styles.cover} src={resolveCoverUrl(anime.cover_image)} alt="" width={96} height={136} unoptimized />
          </div>
        ) : null}
      </header>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {anime && animeID ? (
        <>
          <AnimeEditWorkspace
            anime={anime}
            authToken={authToken}
            onSaved={(nextAnime, message) => {
              setAnime(nextAnime)
              setErrorMessage(null)
              setSuccessMessage(message)
            }}
            onError={(message) => {
              setSuccessMessage(null)
              setErrorMessage(message)
            }}
            onRequest={setLastRequest}
            onResponse={setLastResponse}
          />

          <section className={styles.card}>
            <JellyfinSyncPanel
              anime={anime}
              model={jellyfin}
              onBeforeAction={() => {
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              onSynced={async () => {
                const refreshed = await getAnimeByID(animeID, { include_disabled: true })
                setAnime(refreshed.data)
                setSuccessMessage('Jellyfin Sync abgeschlossen.')
              }}
            />
          </section>

          <AnimeThemesSection
            animeID={animeID}
            authToken={authToken}
            onSuccess={(message) => { setErrorMessage(null); setSuccessMessage(message) }}
            onError={(message) => { setSuccessMessage(null); setErrorMessage(message) }}
          />

          {(lastRequest || lastResponse) ? (
            <section className={styles.card}>
              <details className={styles.developerPanel}>
                <summary>Developer Panel</summary>
                <div className={styles.developerPanelContent}>
                  {lastRequest ? <pre className={styles.codeBlock}>{lastRequest}</pre> : null}
                  {lastResponse ? <pre className={styles.codeBlock}>{lastResponse}</pre> : null}
                </div>
              </details>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
