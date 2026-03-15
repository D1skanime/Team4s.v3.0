import Link from 'next/link'
import styles from './AnimeRelations.module.css'

interface AnimeRelation {
  anime_id: number
  title: string
  relation_type: string
}

interface AnimeRelationsProps {
  relations: AnimeRelation[]
}

export function AnimeRelations({ relations }: AnimeRelationsProps) {
  if (!relations || relations.length === 0) {
    return null
  }

  return (
    <p className={styles.relationsLine}>
      <span className={styles.label}>Verwandte Titel:</span>{' '}
      {relations.map((rel, index) => (
        <span key={rel.anime_id}>
          <Link href={`/anime/${rel.anime_id}`} prefetch={false}>
            {rel.title}
          </Link>
          {index < relations.length - 1 ? ', ' : ''}
        </span>
      ))}
    </p>
  )
}
