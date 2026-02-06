import { Suspense } from 'react';
import { api } from '@/lib/api';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { AlphabetNav } from '@/components/anime/AlphabetNav';
import { AnimeFilters } from '@/components/anime/AnimeFilters';
import { Pagination } from '@/components/ui/Pagination';
import styles from './page.module.css';

interface PageProps {
  searchParams: {
    letter?: string;
    page?: string;
    status?: string;
    type?: string;
  };
}

export default async function AnimePage({ searchParams }: PageProps) {
  const letter = searchParams.letter || '';
  const page = parseInt(searchParams.page || '1', 10);

  const response = await api.getAnimeList({
    letter,
    page,
    per_page: 24,
    content_type: 'anime',
    status: searchParams.status as any,
    type: searchParams.type as any,
  });

  // Build current params for pagination links
  const currentParams: Record<string, string> = {};
  if (letter) currentParams.letter = letter;
  if (searchParams.status) currentParams.status = searchParams.status;
  if (searchParams.type) currentParams.type = searchParams.type;

  return (
    <main className={styles.main}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Anime</h1>
          <p className={styles.subtitle}>
            {response.meta.total.toLocaleString('de-DE')} Anime in der Datenbank
          </p>
        </header>

        <AlphabetNav currentLetter={letter} preserveParams={currentParams} />

        <Suspense fallback={<div className={styles.filtersSkeleton}>Filter laden...</div>}>
          <AnimeFilters
            currentStatus={searchParams.status}
            currentType={searchParams.type}
          />
        </Suspense>

        <AnimeGrid anime={response.data} />

        <Pagination
          meta={response.meta}
          basePath="/anime"
          currentParams={currentParams}
        />
      </div>
    </main>
  );
}
