import { AnimeListItem } from '@/types/anime'

import { AnimeRow } from './AnimeRow'
import sharedStyles from '../../../admin.module.css'
import browserStyles from './AnimeBrowser.module.css'

const styles = { ...sharedStyles, ...browserStyles }

/**
 * Props der AnimeBrowserList-Komponente.
 * Enthalten die anzuzeigenden Anime-Eintraege, Lade- und Sync-Zustaende
 * sowie Callbacks fuer Auswahl, Sync und Cover-Fehler.
 */
interface AnimeBrowserListProps {
  items: AnimeListItem[]
  activeAnimeID: number | null
  isLoading: boolean
  isLoadingContext: boolean
  isSyncDisabled: boolean
  syncingAnimeIDs: Record<number, true>
  coverFailures: Record<number, true>
  onSelectAnime: (animeID: number) => void
  onSyncAnime: (anime: AnimeListItem) => void
  onCoverError: (animeID: number) => void
  hideNonEssential: boolean
}

/**
 * Liste aller Anime-Eintraege im Browser-Panel.
 * Rendert einen Ladezustand oder einen leeren Hinweis wenn keine
 * Eintraege vorhanden sind, ansonsten eine AnimeRow pro Eintrag.
 */
export function AnimeBrowserList({
  items,
  activeAnimeID,
  isLoading,
  isLoadingContext,
  isSyncDisabled,
  syncingAnimeIDs,
  coverFailures,
  onSelectAnime,
  onSyncAnime,
  onCoverError,
  hideNonEssential,
}: AnimeBrowserListProps) {
  if (isLoading) return <p className={styles.hint}>Anime-Liste wird geladen...</p>
  if (items.length === 0) return <p className={styles.hint}>Keine Anime gefunden.</p>

  return (
    <div className={styles.episodeList}>
      {items.map((anime) => (
        <AnimeRow
          key={anime.id}
          anime={anime}
          isActive={activeAnimeID === anime.id}
          isLoadingContext={isLoadingContext}
          isSyncing={Boolean(syncingAnimeIDs[anime.id])}
          isSyncDisabled={isSyncDisabled}
          hasCoverFailure={Boolean(coverFailures[anime.id])}
          onSelect={() => onSelectAnime(anime.id)}
          onSync={() => onSyncAnime(anime)}
          onCoverError={() => onCoverError(anime.id)}
          hideNonEssential={hideNonEssential}
        />
      ))}
    </div>
  )
}
