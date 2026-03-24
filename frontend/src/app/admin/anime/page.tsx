import Link from 'next/link'
import styles from './AdminStudio.module.css'

export default function AdminAnimePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <span>Anime</span>
      </nav>

      <header className={styles.headerCard}>
        <div>
          <p className={styles.eyebrow}>Schritt 1</p>
          <h1 className={styles.pageTitle}>Anime anlegen</h1>
          <p className={styles.pageSubtitle}>
            Waehle den Einstieg fuer den neuen Anime. Phase 2 startet mit einem klaren manuellen Flow und reserviert
            Jellyfin sichtbar fuer den naechsten Ausbau.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/anime/create" className={`${styles.button} ${styles.buttonPrimary}`}>
            Neu manuell
          </Link>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Manuell starten</h2>
            <p className={styles.sectionMeta}>
              Titel und Cover reichen fuer den ersten Anime-Eintrag. Alles Weitere kann nach dem ersten Speichern im
              Studio gepflegt werden.
            </p>
          </div>
        </div>
        <div className={styles.actionsRow}>
          <Link href="/admin/anime/create" className={`${styles.button} ${styles.buttonPrimary}`}>
            Neu manuell
          </Link>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Jellyfin</h2>
            <p className={styles.sectionMeta}>
              Diese Option bleibt fuer Phase 3 reserviert. In diesem Schritt erscheint bewusst keine Suche, keine
              Vorschau und keine Herkunftssteuerung.
            </p>
          </div>
        </div>
        <div className={styles.noticeBox}>
          Jellyfin-gestuetzte Auswahl folgt in der naechsten Phase. Dieser Einstieg bleibt sichtbar, fuehrt aber noch
          nicht in eine Such- oder Preview-Oberflaeche.
        </div>
      </section>
    </main>
  )
}
