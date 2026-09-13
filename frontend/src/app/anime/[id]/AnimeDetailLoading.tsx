import styles from './page.module.css'

/**
 * Ladezustand für die Anime-Detailseite.
 * Wird nach erfolgreicher Anime-Validierung für die weiteren Detaildaten angezeigt.
 */
export default function AnimeDetailLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.errorBox}>Anime-Details werden geladen...</div>
    </main>
  )
}
