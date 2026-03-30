import Link from 'next/link'

import { ApiError, getAnimeList } from '@/lib/api'
import { AdminAnimeOverviewClient } from './components/AdminAnimeOverviewClient'

import styles from './AdminStudio.module.css'

export const dynamic = 'force-dynamic'

interface AdminAnimePageProps {
  searchParams?: Promise<{
    created?: string
  }>
}

export default async function AdminAnimePage({ searchParams }: AdminAnimePageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const createdID = Number.parseInt(resolvedSearchParams?.created || '', 10)
  let animeItems: Awaited<ReturnType<typeof getAnimeList>>['data'] = []
  let listError: string | null = null

  try {
    const response = await getAnimeList({ page: 1, per_page: 24, include_disabled: true }, { cache: 'no-store' })
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
          <h1 className={styles.pageTitle}>Anime</h1>
          <p className={styles.pageSubtitle}>Neue Eintraege anlegen und bestehende Anime verwalten.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/anime/create" className={`${styles.button} ${styles.buttonPrimary}`}>
            Anime erstellen
          </Link>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Vorhandene Anime</h2>
            <p className={styles.sectionMeta}>Bearbeiten, ansehen oder direkt wieder entfernen.</p>
          </div>
        </div>
        <AdminAnimeOverviewClient
          initialItems={animeItems}
          initialError={listError}
          createdID={Number.isFinite(createdID) && createdID > 0 ? createdID : null}
        />
      </section>
    </main>
  )
}
