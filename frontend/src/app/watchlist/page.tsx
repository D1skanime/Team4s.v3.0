import { Metadata } from 'next';
import { WatchlistGrid } from '@/components/watchlist';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Meine Watchlist | Team4s',
  description: 'Verwalte deine Anime-Watchlist - markiere was du schaust, gesehen hast oder noch sehen willst.',
};

export default function WatchlistPage() {
  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Meine Watchlist</h1>
          <p className={styles.subtitle}>
            Behalte den Ueberblick ueber deine Anime
          </p>
        </header>
        <WatchlistGrid />
      </div>
    </main>
  );
}
