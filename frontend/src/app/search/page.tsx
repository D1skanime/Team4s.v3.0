'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { SearchBar } from '@/components/ui/SearchBar';
import type { AnimeListItem } from '@/types';
import styles from './page.module.css';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<AnimeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.searchAnime({ q: query, limit: 50 });
        setResults(response.data);
        setTotal(response.meta.total);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Ein Fehler ist aufgetreten');
        }
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <main className="container">
      <div className={styles.searchPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>Suche</h1>
          <div className={styles.searchBarWrapper}>
            <SearchBar
              initialValue={query}
              autoFocus={!query}
              placeholder="Anime suchen..."
            />
          </div>
        </div>

        {query.length < 2 && (
          <div className={styles.emptyState}>
            <Search size={48} className={styles.emptyIcon} />
            <h2>Suche nach Anime</h2>
            <p>Gib mindestens 2 Zeichen ein, um die Suche zu starten.</p>
          </div>
        )}

        {query.length >= 2 && isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Suche nach &quot;{query}&quot;...</p>
          </div>
        )}

        {query.length >= 2 && error && (
          <div className={styles.errorState}>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h2>Fehler bei der Suche</h2>
            <p>{error}</p>
          </div>
        )}

        {query.length >= 2 && !isLoading && !error && results.length === 0 && (
          <div className={styles.emptyState}>
            <Search size={48} className={styles.emptyIcon} />
            <h2>Keine Ergebnisse</h2>
            <p>Keine Anime gefunden fuer &quot;{query}&quot;.</p>
            <p className={styles.hint}>Versuche einen anderen Suchbegriff.</p>
          </div>
        )}

        {query.length >= 2 && !isLoading && !error && results.length > 0 && (
          <>
            <div className={styles.resultInfo}>
              <p>
                {total} Ergebnis{total !== 1 ? 'se' : ''} fuer &quot;{query}&quot;
                {results.length < total && ` (zeige ${results.length})`}
              </p>
            </div>
            <AnimeGrid anime={results} />
          </>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <main className="container">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Lade...</p>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
