'use client';

import type { AnimeRating } from '@/types';
import { StarRating } from './StarRating';
import styles from './RatingDisplay.module.css';

interface RatingDisplayProps {
  rating: AnimeRating | null;
  showDistribution?: boolean;
  compact?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  showDistribution = false,
  compact = false,
  className = '',
}: RatingDisplayProps) {
  // No rating data
  if (!rating) {
    return (
      <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}>
        <span className={styles.noRating}>Keine Bewertung</span>
      </div>
    );
  }

  // No ratings yet
  if (rating.count === 0) {
    return (
      <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}>
        <StarRating value={0} size={compact ? 'sm' : 'md'} />
        <span className={styles.noRating}>Noch keine Bewertungen</span>
      </div>
    );
  }

  // Calculate max count for distribution bars
  const maxCount = Math.max(...Object.values(rating.distribution));

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}>
      <div className={styles.main}>
        <StarRating
          value={rating.average}
          size={compact ? 'sm' : 'md'}
          showValue={!compact}
        />
        <div className={styles.info}>
          <span className={styles.average}>
            {rating.average.toFixed(1)}
          </span>
          <span className={styles.count}>
            {rating.count === 1
              ? '1 Bewertung'
              : `${rating.count.toLocaleString('de-DE')} Bewertungen`}
          </span>
        </div>
      </div>

      {showDistribution && !compact && rating.count > 0 && (
        <div className={styles.distribution}>
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((star) => (
            <div key={star} className={styles.distributionRow}>
              <span className={styles.distributionLabel}>{star}</span>
              <div className={styles.distributionBarWrapper}>
                <div
                  className={styles.distributionBar}
                  style={{
                    width: maxCount > 0
                      ? `${(rating.distribution[star] / maxCount) * 100}%`
                      : '0%',
                  }}
                />
              </div>
              <span className={styles.distributionCount}>
                {rating.distribution[star] || 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for use in cards or inline
export function RatingBadge({
  rating,
  className = '',
}: {
  rating: AnimeRating | null;
  className?: string;
}) {
  if (!rating || rating.count === 0) {
    return null;
  }

  return (
    <div className={`${styles.badge} ${className}`}>
      <svg
        className={styles.badgeStar}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="#fbbf24"
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        />
      </svg>
      <span className={styles.badgeValue}>
        {rating.average.toFixed(1)}
      </span>
    </div>
  );
}
