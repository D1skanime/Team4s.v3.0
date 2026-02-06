'use client';

import styles from './StarRating.module.css';

interface StarRatingProps {
  value: number;       // 0-10 scale
  maxStars?: number;   // Number of stars to show (default: 5)
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  value,
  maxStars = 5,
  size = 'md',
  showValue = false,
  className = '',
}: StarRatingProps) {
  // Convert 0-10 scale to 0-maxStars scale
  const normalizedValue = (value / 10) * maxStars;

  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    const fillPercent = Math.min(Math.max(normalizedValue - (i - 1), 0), 1) * 100;
    stars.push(
      <span key={i} className={styles.starWrapper}>
        <svg
          className={`${styles.star} ${styles[size]}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Background star (empty) */}
          <path
            className={styles.starEmpty}
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
          {/* Filled star with clip */}
          <defs>
            <clipPath id={`star-clip-${i}`}>
              <rect x="0" y="0" width={`${fillPercent}%`} height="100%" />
            </clipPath>
          </defs>
          <path
            className={styles.starFilled}
            clipPath={`url(#star-clip-${i})`}
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      </span>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.stars} role="img" aria-label={`Bewertung: ${value.toFixed(1)} von 10`}>
        {stars}
      </div>
      {showValue && (
        <span className={`${styles.value} ${styles[size]}`}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
