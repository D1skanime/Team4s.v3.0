import Image from 'next/image';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Shield, EyeOff, Eye, Calendar, Film, Layers, ArrowLeft } from 'lucide-react';
import type { Anime, AnimeRating } from '@/types';
import { getCoverUrl, getStatusColor, getStatusLabel, getTypeLabel } from '@/lib/utils';
import { WatchlistButton } from './WatchlistButton';
import { RatingSection } from './RatingSection';
import styles from './AnimeDetail.module.css';

interface AnimeDetailProps {
  anime: Anime;
  rating?: AnimeRating | null;
  children?: React.ReactNode;
}

const statusIcons: Record<string, typeof Clock> = {
  ongoing: Clock,
  done: CheckCircle,
  aborted: XCircle,
  licensed: Shield,
  disabled: EyeOff,
};

export function AnimeDetail({ anime, rating, children }: AnimeDetailProps) {
  const StatusIcon = statusIcons[anime.status] || Clock;

  return (
    <article className={styles.container}>
      <Link href="/anime" className={styles.backLink}>
        <ArrowLeft size={18} />
        <span>Zurück zur Liste</span>
      </Link>

      <div className={styles.hero}>
        <div className={styles.coverWrapper}>
          <Image
            src={getCoverUrl(anime.cover_image)}
            alt={anime.title}
            width={300}
            height={420}
            className={styles.cover}
            priority
            unoptimized
          />
        </div>

        <div className={styles.info}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{anime.title}</h1>
              <WatchlistButton animeId={anime.id} className={styles.watchlistButton} />
            </div>
            {anime.title_de && anime.title_de !== anime.title && (
              <p className={styles.altTitle}>{anime.title_de}</p>
            )}
            {anime.title_en && anime.title_en !== anime.title && anime.title_en !== anime.title_de && (
              <p className={styles.altTitle}>{anime.title_en}</p>
            )}
          </div>

          <div className={styles.badges}>
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(anime.status) }}
            >
              <StatusIcon size={14} />
              {getStatusLabel(anime.status)}
            </span>
            <span className={styles.typeBadge}>
              <Film size={14} />
              {getTypeLabel(anime.type)}
            </span>
          </div>

          {rating !== undefined && (
            <div className={styles.ratingSection}>
              <RatingSection animeId={anime.id} initialRating={rating} />
            </div>
          )}

          <div className={styles.meta}>
            {anime.year && (
              <div className={styles.metaItem}>
                <Calendar size={16} />
                <span>{anime.year}</span>
              </div>
            )}
            <div className={styles.metaItem}>
              <Layers size={16} />
              <span>{anime.max_episodes} Episoden</span>
            </div>
            <div className={styles.metaItem}>
              <Eye size={16} />
              <span>{anime.view_count.toLocaleString('de-DE')} Views</span>
            </div>
          </div>

          {anime.genre && (
            <div className={styles.genres}>
              {anime.genre.split(',').map((genre) => (
                <span key={genre.trim()} className={styles.genreTag}>
                  {genre.trim()}
                </span>
              ))}
            </div>
          )}

          {anime.description && (
            <div className={styles.description}>
              <h2 className={styles.sectionTitle}>Beschreibung</h2>
              <p>{anime.description}</p>
            </div>
          )}

          {anime.source && (
            <div className={styles.source}>
              <span className={styles.sourceLabel}>Quelle:</span>
              <span>{anime.source}</span>
            </div>
          )}
        </div>
      </div>

      {(anime.sub_comment || anime.stream_comment) && (
        <div className={styles.comments}>
          {anime.sub_comment && (
            <div className={styles.commentBox}>
              <h3>Sub-Kommentar</h3>
              <p>{anime.sub_comment}</p>
            </div>
          )}
          {anime.stream_comment && (
            <div className={styles.commentBox}>
              <h3>Stream-Kommentar</h3>
              <p>{anime.stream_comment}</p>
            </div>
          )}
        </div>
      )}

      <section className={styles.episodesSection}>
        <h2 className={styles.sectionTitle}>Episoden</h2>
        {children}
      </section>
    </article>
  );
}
