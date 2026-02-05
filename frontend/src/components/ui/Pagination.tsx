import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/types';
import styles from './Pagination.module.css';

interface PaginationProps {
  meta: PaginationMeta;
  basePath: string;
  currentParams?: Record<string, string>;
}

export function Pagination({ meta, basePath, currentParams = {} }: PaginationProps) {
  const { page, total_pages } = meta;

  if (total_pages <= 1) return null;

  function buildUrl(pageNum: number): string {
    const params = new URLSearchParams(currentParams);
    params.set('page', String(pageNum));
    return `${basePath}?${params.toString()}`;
  }

  // Generate page numbers to show
  const pages: (number | 'ellipsis')[] = [];
  const showPages = 5;
  let start = Math.max(1, page - Math.floor(showPages / 2));
  const end = Math.min(total_pages, start + showPages - 1);

  if (end - start < showPages - 1) {
    start = Math.max(1, end - showPages + 1);
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total_pages) {
    if (end < total_pages - 1) pages.push('ellipsis');
    pages.push(total_pages);
  }

  return (
    <nav className={styles.pagination}>
      {page > 1 ? (
        <Link href={buildUrl(page - 1)} className={styles.arrow}>
          <ChevronLeft size={20} />
        </Link>
      ) : (
        <span className={`${styles.arrow} ${styles.disabled}`}>
          <ChevronLeft size={20} />
        </span>
      )}

      <div className={styles.pages}>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`${styles.page} ${p === page ? styles.active : ''}`}
            >
              {p}
            </Link>
          )
        )}
      </div>

      {page < total_pages ? (
        <Link href={buildUrl(page + 1)} className={styles.arrow}>
          <ChevronRight size={20} />
        </Link>
      ) : (
        <span className={`${styles.arrow} ${styles.disabled}`}>
          <ChevronRight size={20} />
        </span>
      )}

      <span className={styles.info}>
        Seite {page} von {total_pages} ({meta.total} Einträge)
      </span>
    </nav>
  );
}
