'use client';

import { useState } from 'react';
import type { AnimeRating } from '@/types';
import { RatingDisplay } from './RatingDisplay';
import { RatingInput } from './RatingInput';
import styles from './RatingSection.module.css';

interface RatingSectionProps {
  animeId: number;
  initialRating: AnimeRating | null;
  showDistribution?: boolean;
  className?: string;
}

/**
 * Client component that combines RatingDisplay and RatingInput.
 * Handles state updates when user submits a rating.
 */
export function RatingSection({
  animeId,
  initialRating,
  showDistribution = false,
  className = '',
}: RatingSectionProps) {
  const [animeRating, setAnimeRating] = useState<AnimeRating | null>(initialRating);

  // Called when user submits a rating
  const handleRatingChange = (newRating: AnimeRating) => {
    setAnimeRating(newRating);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <RatingDisplay
        rating={animeRating}
        showDistribution={showDistribution}
      />
      <RatingInput
        animeId={animeId}
        initialRating={animeRating}
        onRatingChange={handleRatingChange}
      />
    </div>
  );
}
