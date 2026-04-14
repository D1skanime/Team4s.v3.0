import styles from './page.module.css'

/**
 * Ladezustand fuer die Anime-Detailseite.
 * Wird von Next.js automatisch angezeigt, solange die Detaildaten geladen werden.
 */
export default function LoadingAnimeDetailPage() {
  return (
    <main className={styles.page}>
      <div className={styles.errorBox}>Anime-Details werden geladen...</div>
    </main>
  )
}
