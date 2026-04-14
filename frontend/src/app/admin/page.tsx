import Link from 'next/link'

import styles from './admin.module.css'

/**
 * Einstiegsseite des Admin-Bereichs.
 * Rendert Navigationskarten zu den wichtigsten Admin-Bereichen:
 * Studio (Anime + Episoden), separater Episoden-Modus und Fansubs.
 */
export default function AdminOverviewPage() {
  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/">Start</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
        <span> | </span>
        <Link href="/auth">Auth</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Admin Content</h1>
        <p className={styles.subtitle}>Anime und Episoden in einem zusammenhaengenden Studio-Workflow verwalten.</p>
      </header>

      <section className={styles.panel}>
        <h2>Bereiche</h2>
        <p className={styles.hint}>Empfohlen: zuerst Anime-Kontext waehlen, dann Episoden direkt darin pflegen.</p>
        <div className={styles.actions}>
          <Link href="/admin/anime" className={styles.button}>
            Studio (Anime + Episoden)
          </Link>
          <Link href="/admin/episodes" className={styles.buttonSecondary}>
            Separater Episoden-Modus
          </Link>
          <Link href="/admin/fansubs" className={styles.buttonSecondary}>
            Fansubs
          </Link>
        </div>
      </section>
    </main>
  )
}
