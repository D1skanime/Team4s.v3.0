import styles from './page.module.css'

/**
 * Ladezustand für die Anime-Listenseite.
 * Wird während des asynchronen Listeninhalts in einer expliziten Suspense angezeigt.
 */
export default function AnimeListLoading() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>P0 MVP</p>
        <h1 className={styles.title}>Anime Liste</h1>
        <p className={styles.subtitle}>Lade Daten...</p>
      </header>
      <div className={styles.errorBox}>
        <p>Inhalt wird geladen.</p>
      </div>
    </main>
  )
}
