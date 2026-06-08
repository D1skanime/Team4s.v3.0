import { Button } from '@/components/ui'

/**
 * Startseite der Anwendung.
 * Rendert die Einstiegsnavigation mit Links zu Anime-Liste, Watchlist, Login und Admin.
 */
export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Team4s v3.0</p>
        <h1>Anime Portal</h1>
        <p>Neues Fullstack-Fundament steht. Starte mit der Anime-Liste.</p>
        <div className="hero-actions">
          <Button href="/anime">Zur Anime-Liste</Button>
          <Button href="/watchlist">Zur Watchlist</Button>
          <Button href="/login">Anmelden</Button>
          <Button href="/admin">Zu Admin</Button>
        </div>
      </section>
    </main>
  )
}
