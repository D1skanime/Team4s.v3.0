import styles from './page.module.css'

/**
 * Ladezustand fuer die Anime-Listenseite.
 * Wird von Next.js automatisch angezeigt, waehrend die Seite serverseitig geladen wird.
 */
export default function LoadingAnimePage() {
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
