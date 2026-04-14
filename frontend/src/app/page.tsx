import Link from 'next/link'

/**
 * Startseite der Anwendung.
 * Rendert die Einstiegsnavigation mit Links zu Anime-Liste, Watchlist, Auth und Admin.
 */
export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Team4s v3.0</p>
        <h1>Anime Portal</h1>
        <p>Neues Fullstack-Fundament steht. Starte mit der Anime-Liste.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/anime" className="primary-link">
            Zur Anime-Liste
          </Link>
          <Link href="/watchlist" className="primary-link">
            Zur Watchlist
          </Link>
          <Link href="/auth" className="primary-link">
            Zu Auth
          </Link>
          <Link href="/admin" className="primary-link">
            Zu Admin
          </Link>
        </div>
      </section>
    </main>
  )
}
