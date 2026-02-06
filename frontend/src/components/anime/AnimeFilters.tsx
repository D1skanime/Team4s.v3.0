'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import styles from './AnimeFilters.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle Status' },
  { value: 'ongoing', label: 'Laufend' },
  { value: 'done', label: 'Abgeschlossen' },
  { value: 'aborted', label: 'Abgebrochen' },
  { value: 'licensed', label: 'Lizenziert' },
] as const;

const TYPE_OPTIONS = [
  { value: '', label: 'Alle Typen' },
  { value: 'tv', label: 'TV-Serie' },
  { value: 'ova', label: 'OVA' },
  { value: 'film', label: 'Film' },
  { value: 'special', label: 'Special' },
  { value: 'ona', label: 'ONA' },
] as const;

interface AnimeFiltersProps {
  currentStatus?: string;
  currentType?: string;
}

export function AnimeFilters({ currentStatus = '', currentType = '' }: AnimeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // Reset to page 1 when filter changes
      params.delete('page');

      const queryString = params.toString();
      router.push(queryString ? `/anime?${queryString}` : '/anime');
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('status');
    params.delete('type');
    params.delete('page');

    const queryString = params.toString();
    router.push(queryString ? `/anime?${queryString}` : '/anime');
  }, [router, searchParams]);

  const hasActiveFilters = currentStatus || currentType;

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            className={`${styles.select} ${currentStatus ? styles.active : ''}`}
            value={currentStatus}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="type-filter">
            Typ
          </label>
          <select
            id="type-filter"
            className={`${styles.select} ${currentType ? styles.active : ''}`}
            value={currentType}
            onChange={(e) => updateFilter('type', e.target.value)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
          >
            Filter loeschen
          </button>
        )}
      </div>
    </div>
  );
}
