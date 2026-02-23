import { AnimeListItem } from '@/types/anime'

import { AnimeCard } from './AnimeCard'
import styles from './AnimeGrid.module.css'

interface AnimeGridProps {
  anime: AnimeListItem[]
  gridQuery: string
}

export function AnimeGrid({ anime, gridQuery }: AnimeGridProps) {
  if (anime.length === 0) {
    return (
      <section className={styles.emptyState}>
        <h2>Keine Eintraege gefunden</h2>
        <p>Bitte einen anderen Buchstaben oder Filter ausprobieren.</p>
      </section>
    )
  }

  return (
    <section className={styles.grid}>
      {anime.map((item) => (
        <AnimeCard key={item.id} anime={item} gridQuery={gridQuery} />
      ))}
    </section>
  )
}
