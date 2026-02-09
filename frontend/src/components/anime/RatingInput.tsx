'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authClient, AuthError } from '@/lib/auth';
import type { AnimeRating, UserRating } from '@/types';
import styles from './RatingInput.module.css';

interface RatingInputProps {
  animeId: number;
  initialRating?: AnimeRating | null;
  onRatingChange?: (newAnimeRating: AnimeRating) => void;
  className?: string;
}

export function RatingInput({
  animeId,
  initialRating,
  onRatingChange,
  className = '',
}: RatingInputProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [userRating, setUserRating] = useState<UserRating | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's existing rating
  const fetchUserRating = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsFetching(true);
    try {
      const rating = await authClient.getUserRating(animeId);
      setUserRating(rating);
    } catch (err) {
      // Silently fail - user just hasn't rated yet
      console.error('Error fetching user rating:', err);
    } finally {
      setIsFetching(false);
    }
  }, [animeId, isAuthenticated]);

  useEffect(() => {
    fetchUserRating();
  }, [fetchUserRating]);

  // Handle rating submission
  const handleRatingClick = async (rating: number) => {
    if (!isAuthenticated || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.submitRating(animeId, rating);
      setUserRating(response.rating);
      onRatingChange?.(response.anime_rating);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Bewertung fehlgeschlagen');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle rating deletion
  const handleDeleteRating = async () => {
    if (!isAuthenticated || isLoading || !userRating) return;

    setIsLoading(true);
    setError(null);

    try {
      await authClient.deleteRating(animeId);
      setUserRating(null);
      // Refetch anime rating to update stats
      // For now, we just clear the user rating
      // The parent component should refetch the anime rating
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Loeschen fehlgeschlagen');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not authenticated
  if (authLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <Loader2 className={styles.spinner} size={16} />
          <span>Lade...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loginPrompt}>
          <Star size={16} />
          <span>Melde dich an, um zu bewerten</span>
        </div>
      </div>
    );
  }

  const displayRating = hoveredRating ?? userRating?.rating ?? 0;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <span className={styles.label}>Deine Bewertung:</span>
        {userRating && (
          <span className={styles.currentRating}>
            {userRating.rating}/10
          </span>
        )}
      </div>

      <div className={styles.ratingRow}>
        <div
          className={styles.stars}
          onMouseLeave={() => setHoveredRating(null)}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.starButton} ${value <= displayRating ? styles.filled : ''} ${isLoading ? styles.disabled : ''}`}
              onClick={() => handleRatingClick(value)}
              onMouseEnter={() => setHoveredRating(value)}
              disabled={isLoading || isFetching}
              aria-label={`${value} Sterne`}
            >
              <Star
                size={20}
                className={styles.starIcon}
                fill={value <= displayRating ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>

        {userRating && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDeleteRating}
            disabled={isLoading}
            aria-label="Bewertung loeschen"
            title="Bewertung loeschen"
          >
            <Trash2 size={16} />
          </button>
        )}

        {isLoading && (
          <Loader2 className={styles.spinner} size={16} />
        )}
      </div>

      {hoveredRating !== null && (
        <div className={styles.hoverLabel}>
          {getRatingLabel(hoveredRating)}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}

// Rating labels in German
function getRatingLabel(rating: number): string {
  const labels: Record<number, string> = {
    1: 'Katastrophal',
    2: 'Sehr schlecht',
    3: 'Schlecht',
    4: 'Unterdurchschnittlich',
    5: 'Durchschnittlich',
    6: 'Ueberdurchschnittlich',
    7: 'Gut',
    8: 'Sehr gut',
    9: 'Herausragend',
    10: 'Meisterwerk',
  };
  return labels[rating] || '';
}
