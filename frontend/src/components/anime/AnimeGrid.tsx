import type { AnimeListItem } from '@/types';
import { AnimeCard } from './AnimeCard';
import styles from './AnimeGrid.module.css';

interface AnimeGridProps {
  anime: AnimeListItem[];
}

export function AnimeGrid({ anime }: AnimeGridProps) {
  if (anime.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Keine Anime gefunden</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {anime.map((item) => (
        <AnimeCard key={item.id} anime={item} />
      ))}
    </div>
  );
}
