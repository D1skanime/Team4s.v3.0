import Image from 'next/image';
import Link from 'next/link';
import type { RelatedAnime as RelatedAnimeType } from '@/types';
import { getCoverUrl } from '@/lib/utils';
import styles from './RelatedAnime.module.css';

interface RelatedAnimeProps {
  relations: RelatedAnimeType[];
}

/**
 * Get display label for relation type
 */
function getRelationLabel(relationType: string): string {
  const labels: Record<string, string> = {
    'Sequel': 'Sequel',
    'Prequel': 'Prequel',
    'Side Story': 'Side Story',
    'Spin-off': 'Spin-off',
    'Alternative Setting': 'Alternative',
    'Alternative Version': 'Alternative',
    'Summary': 'Summary',
    'Full Story': 'Full Story',
    'Parent Story': 'Parent',
    'Other': 'Verwandt',
  };
  return labels[relationType] || relationType;
}

/**
 * Get badge color based on relation type
 */
function getRelationColor(relationType: string): string {
  const colors: Record<string, string> = {
    'Sequel': 'var(--status-ongoing)',
    'Prequel': 'var(--status-licensed)',
    'Side Story': 'var(--accent-secondary)',
    'Spin-off': 'var(--accent-secondary)',
    'Alternative Setting': 'var(--status-aborted)',
    'Alternative Version': 'var(--status-aborted)',
    'Summary': 'var(--text-muted)',
    'Full Story': 'var(--status-done)',
    'Parent Story': 'var(--status-licensed)',
  };
  return colors[relationType] || 'var(--bg-hover)';
}

export function RelatedAnime({ relations }: RelatedAnimeProps) {
  if (!relations || relations.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Verwandte Anime</h2>
        <p className={styles.emptyMessage}>Keine verwandten Anime vorhanden.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Verwandte Anime</h2>
      <div className={styles.scrollContainer}>
        <div className={styles.cardList}>
          {relations.map((relation) => (
            <Link
              key={`${relation.id}-${relation.relation_type}`}
              href={`/anime/${relation.id}`}
              className={styles.card}
            >
              <div className={styles.coverWrapper}>
                <Image
                  src={getCoverUrl(relation.cover_image)}
                  alt={relation.title}
                  width={150}
                  height={225}
                  className={styles.cover}
                  unoptimized
                />
                <span
                  className={styles.badge}
                  style={{ backgroundColor: getRelationColor(relation.relation_type) }}
                >
                  {getRelationLabel(relation.relation_type)}
                </span>
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>{relation.title}</h3>
                {relation.year && (
                  <span className={styles.cardYear}>{relation.year}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
