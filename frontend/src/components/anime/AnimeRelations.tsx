import Link from 'next/link'
import Image from 'next/image'
import styles from './AnimeRelations.module.css'

interface AnimeRelation {
  anime_id: number
  title: string
  relation_type: string
  cover_image: string | null
  year: number | null
  type: string
}

interface AnimeRelationsProps {
  relations: AnimeRelation[]
  /** 'default' shows section title, 'compact' hides it (for embedded use) */
  variant?: 'default' | 'compact'
}

const relationTypeLabels: Record<string, string> = {
  related: 'Related',
  sequel: 'Sequel',
  prequel: 'Prequel',
  alternative: 'Alternative Version',
  side_story: 'Side Story',
  spin_off: 'Spin-Off',
  summary: 'Summary',
  parent: 'Parent Story',
  other: 'Other',
}

const animeTypeLabels: Record<string, string> = {
  tv: 'TV',
  movie: 'Movie',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Special',
  music: 'Music',
}

export function AnimeRelations({ relations, variant = 'default' }: AnimeRelationsProps) {
  if (!relations || relations.length === 0) {
    return null
  }

  const isCompact = variant === 'compact'

  return (
    <section className={`${styles.relationsSection} ${isCompact ? styles.compact : ''}`}>
      {!isCompact && <h2 className={styles.title}>Related</h2>}
      <div className={styles.relationsSlider}>
        {relations.map((rel) => (
          <Link
            key={rel.anime_id}
            href={`/anime/${rel.anime_id}`}
            className={styles.relationCard}
            prefetch={false}
          >
            <div className={styles.coverWrapper}>
              {rel.cover_image ? (
                <Image
                  src={`/covers/${rel.cover_image}`}
                  alt={rel.title}
                  fill
                  sizes="160px"
                  className={styles.coverImage}
                />
              ) : (
                <div className={styles.coverPlaceholder} />
              )}
              <div className={styles.cardOverlay}>
                <span className={styles.relationType}>
                  {relationTypeLabels[rel.relation_type] || rel.relation_type}
                </span>
                <div className={styles.cardInfo}>
                  <span className={styles.animeTitle}>{rel.title}</span>
                  <span className={styles.animeMeta}>
                    {animeTypeLabels[rel.type] || rel.type}
                    {rel.year && ` | ${rel.year}`}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
