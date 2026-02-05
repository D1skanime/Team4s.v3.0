import Link from 'next/link';
import Image from 'next/image';
import type { AnimeListItem } from '@/types';
import { getCoverUrl, getStatusColor, getStatusLabel, getTypeLabel } from '@/lib/utils';
import styles from './AnimeCard.module.css';

interface AnimeCardProps {
  anime: AnimeListItem;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.id}`} className={styles.card}>
      <div className={styles.coverWrapper}>
        <Image
          src={getCoverUrl(anime.cover_image)}
          alt={anime.title}
          width={200}
          height={280}
          className={styles.cover}
          unoptimized
        />
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: getStatusColor(anime.status) }}
        >
          {getStatusLabel(anime.status)}
        </span>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{anime.title}</h3>
        <div className={styles.meta}>
          <span>{getTypeLabel(anime.type)}</span>
          {anime.year && <span>{anime.year}</span>}
          <span>{anime.max_episodes} Ep.</span>
        </div>
      </div>
    </Link>
  );
}
