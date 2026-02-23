'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

import { ApiError, deleteFansubGroup, getFansubList, getRuntimeAuthToken } from '@/lib/api'
import { FansubGroup, FansubStatus } from '@/types/fansub'

import styles from '../admin.module.css'

const statusOptions: Array<FansubStatus | 'all'> = ['all', 'active', 'inactive', 'dissolved']

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

export default function AdminFansubsPage() {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<FansubGroup[]>([])
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FansubStatus | 'all'>('all')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function loadList() {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await getFansubList({
        q: query || undefined,
        status: status === 'all' ? undefined : status,
        page: 1,
        per_page: 100,
      })
      setItems(response.data)
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status])

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(queryInput.trim())
  }

  async function onDelete(item: FansubGroup) {
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const ok = window.confirm(
      `Fansub "${item.name}" wirklich loeschen?\n\nEpisoden bleiben erhalten; fansub_group_id wird entkoppelt.`,
    )
    if (!ok) return

    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      await deleteFansubGroup(item.id, authToken)
      setSuccessMessage(`Fansub "${item.name}" geloescht.`)
      await loadList()
    } catch (error) {
      setErrorMessage(formatError(error))
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Fansub Verwaltung</h1>
        <p className={styles.subtitle}>Gruppen suchen, filtern, bearbeiten und loeschen.</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.actions}>
          <Link href="/admin/fansubs/create" className={styles.button}>
            Neue Fansubgruppe
          </Link>
        </div>

        <form className={styles.form} onSubmit={onSearchSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="fansub-query">Suche (Name/Slug)</label>
              <input
                id="fansub-query"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="z. B. gax"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="fansub-status">Status</label>
              <select
                id="fansub-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as FansubStatus | 'all')}
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.buttonSecondary} disabled={isLoading}>
              Suchen
            </button>
          </div>
        </form>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
        {isLoading ? <p className={styles.hint}>Lade...</p> : null}

        {!isLoading && items.length === 0 ? <p className={styles.hint}>Keine Fansubgruppen gefunden.</p> : null}

        {!isLoading && items.length > 0 ? (
          <div className={styles.episodeTable}>
            <div className={styles.episodeTableHeader}>
              <span className={styles.episodeHeaderCell}>Name</span>
              <span className={styles.episodeHeaderCell}>Slug</span>
              <span className={styles.episodeHeaderCell}>Status</span>
              <span className={styles.episodeHeaderCell}>Zeitraum</span>
              <span className={styles.episodeHeaderCell}>Aktionen</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className={styles.episodeTableRow}>
                <span className={styles.episodeTitleCell}>{item.name}</span>
                <span className={styles.episodeIDCell}>{item.slug}</span>
                <span className={`${styles.statusBadge} ${styles.statusPublic}`}>{item.status}</span>
                <span className={styles.episodeIDCell}>
                  {(item.founded_year || 'n/a').toString()} - {(item.dissolved_year || 'heute').toString()}
                </span>
                <div className={styles.episodeActionsCell}>
                  <Link href={`/admin/fansubs/${item.id}/edit`} className={styles.episodeOpenLink}>
                    Edit
                  </Link>
                  <Link href={`/admin/fansubs/${item.id}/members`} className={styles.episodeOpenLink}>
                    Members
                  </Link>
                  <button type="button" className={styles.episodeMiniButton} onClick={() => onDelete(item)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}
