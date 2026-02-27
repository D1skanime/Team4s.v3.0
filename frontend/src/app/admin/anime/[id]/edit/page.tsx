'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import { getAnimeByID, getRuntimeAuthToken } from '@/lib/api'
import { AnimeDetail } from '@/types/anime'

import { AnimeEditWorkspace } from '../../components/AnimeEditPage/AnimeEditWorkspace'
import { JellyfinSyncPanel } from '../../components/JellyfinSync/JellyfinSyncPanel'
import { useJellyfinSync } from '../../hooks/useJellyfinSync'
import styles from '../../AdminStudio.module.css'
import { parsePositiveInt, resolveCoverUrl } from '../../utils/anime-helpers'
import { formatAdminError } from '../../utils/studio-helpers'

function formatAnimeLabel(anime: AnimeDetail): string {
  return `${String(anime.id).padStart(3, '0')} ${anime.title}`
}

export default function AdminAnimeEditPage() {
  const params = useParams<{ id: string }>()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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

  useEffect(() => {
    async function loadAnime() {
      if (!animeID) {
        setErrorMessage('Ungueltige Anime-ID.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getAnimeByID(animeID, { include_disabled: true })
        setAnime(response.data)
      } catch (error) {
        setAnime(null)
        setErrorMessage(formatAdminError(error, 'Anime konnte nicht geladen werden.'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadAnime()
  }, [animeID])

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
            Allgemeiner Kontext fuer den ausgewaehlten Anime: Cover, Beschreibung, Metadaten und Status. Episoden und
            Versionen bleiben aus dieser Route bewusst ausgelagert.
          </p>
        </div>
        {anime ? (
          <div className={styles.headerActions}>
            <Link href={`/admin/anime/${anime.id}/episodes`} className={`${styles.button} ${styles.buttonPrimary}`}>
              Zu Episoden wechseln
            </Link>
            <Link href={`/anime/${anime.id}`} className={`${styles.button} ${styles.buttonSecondary}`} target="_blank" rel="noreferrer">
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
            <img className={styles.cover} src={resolveCoverUrl(anime.cover_image)} alt="" />
          </div>
        ) : null}
      </header>

      {isLoading ? <div className={styles.noticeBox}>Anime-Daten werden geladen...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {anime ? (
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
            <details className={styles.developerPanel}>
              <summary>Provider Sync (Jellyfin)</summary>
              <div className={styles.developerPanelContent}>
                <JellyfinSyncPanel
                  anime={anime}
                  model={jellyfin}
                  onBeforeAction={() => {
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                  onSynced={async () => {
                    const refreshed = await getAnimeByID(anime.id, { include_disabled: true })
                    setAnime(refreshed.data)
                    setSuccessMessage('Jellyfin Sync abgeschlossen.')
                  }}
                />
              </div>
            </details>
          </section>

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
