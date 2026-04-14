'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { ApiError, deleteAdminAnime, deleteUploadedCoverFile, getRuntimeAuthToken } from '@/lib/api'
import { getCoverUrl } from '@/lib/utils'
import type { AnimeListItem } from '@/types/anime'

import styles from '../AdminStudio.module.css'

/**
 * Props der AdminAnimeOverviewClient-Komponente.
 * Nimmt die server-seitig vorgeladene Anime-Liste, einen optionalen
 * Ladezeitfehler sowie die ID eines soeben erstellten Anime entgegen.
 */
interface AdminAnimeOverviewClientProps {
  initialItems: AnimeListItem[]
  initialError: string | null
  createdID: number | null
}

/**
 * Wandelt einen unbekannten Fehler in eine lesbare Fehlermeldung um.
 * Gibt bei API-Fehlern den HTTP-Status und die Meldung zurueck,
 * bei sonstigen Error-Objekten die Nachricht, sonst einen Fallback-Text.
 */
function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Anime konnte nicht geloescht werden.'
}

/**
 * Gibt die CSS-Klasse fuer den Status-Badge eines Anime zurueck.
 * Unterscheidet zwischen aktiv laufenden, abgeschlossenen, abgebrochenen,
 * lizenzierten und deaktivierten Eintraegen.
 */
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

/**
 * Client-Komponente fuer die Admin-Anime-Uebersicht.
 * Rendert die Liste aller Anime mit Cover, Metadaten und Aktionen
 * (Bearbeiten, Public ansehen, Loeschen). Verwaltet Loeschvorgang inkl.
 * Bestaetigungsdialog, Fehler- und Erfolgsmeldungen sowie den
 * Hinweis auf einen gerade neu erstellten Anime.
 */
export function AdminAnimeOverviewClient({
  initialItems,
  initialError,
  createdID,
}: AdminAnimeOverviewClientProps) {
  const router = useRouter()
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [items, setItems] = useState(initialItems)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingAnimeID, setDeletingAnimeID] = useState<number | null>(null)

  const createdAnime = useMemo(
    () => (createdID ? items.find((anime) => anime.id === createdID) ?? null : null),
    [createdID, items],
  )

  async function onDelete(anime: AnimeListItem) {
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const confirmed = window.confirm(
      `Anime "${anime.title}" wirklich loeschen?\n\nZugehoerige Episoden, Kommentare und Verknuepfungen werden ebenfalls entfernt.`,
    )
    if (!confirmed) return

    setDeletingAnimeID(anime.id)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const response = await deleteAdminAnime(anime.id, authToken)
      const orphanedCoverImage = response.data.orphaned_local_cover_image?.trim()
      if (orphanedCoverImage) {
        await deleteUploadedCoverFile(orphanedCoverImage)
      }
      setItems((current) => current.filter((item) => item.id !== anime.id))
      setSuccessMessage(`Anime "${response.data.title}" geloescht.`)
      router.refresh()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setDeletingAnimeID(null)
    }
  }

  return (
    <>
      {createdAnime ? (
        <div className={styles.successBox}>
          Anime #{String(createdAnime.id).padStart(3, '0')} {createdAnime.title} wurde erstellt und ist jetzt in der Uebersicht verankert.
        </div>
      ) : null}

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {!errorMessage && items.length === 0 ? <p className={styles.emptyState}>Noch keine Anime vorhanden.</p> : null}

      {items.length > 0 ? (
        <div className={styles.stack}>
          {items.map((anime) => (
            <article key={anime.id} id={`anime-${anime.id}`} className={styles.animeCard}>
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
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonDanger}`}
                    onClick={() => void onDelete(anime)}
                    disabled={deletingAnimeID === anime.id}
                  >
                    {deletingAnimeID === anime.id ? 'Loescht...' : 'Loeschen'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  )
}
