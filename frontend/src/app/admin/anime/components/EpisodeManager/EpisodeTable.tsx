import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeRow } from './EpisodeRow'
import styles from '../../../admin.module.css'

interface EpisodeTableProps {
  episodes: EpisodeListItem[]
  density: 'compact' | 'comfortable'
  selectedID: number | null
  inlineEditID: number | null
  inlineEditValues: { number: string; title: string; status: EpisodeStatus; clearTitle: boolean }
  removingIDs: Record<number, true>
  isUpdating: boolean
  isApplyingBulk: boolean
  statuses: EpisodeStatus[]
  onSelectEpisode: (episode: EpisodeListItem) => void
  onToggleSelected: (id: number) => void
  onBeginInlineEdit: (episode: EpisodeListItem) => void
  onInlineFieldChange: (field: 'number' | 'title' | 'status' | 'clearTitle', value: string | boolean) => void
  onSaveInlineEdit: () => void
  onCancelInlineEdit: () => void
  onRemoveEpisode: (episode: EpisodeListItem) => void
}

export function EpisodeTable({
  episodes,
  density,
  selectedID,
  inlineEditID,
  inlineEditValues,
  removingIDs,
  isUpdating,
  isApplyingBulk,
  statuses,
  onSelectEpisode,
  onToggleSelected,
  onBeginInlineEdit,
  onInlineFieldChange,
  onSaveInlineEdit,
  onCancelInlineEdit,
  onRemoveEpisode,
}: EpisodeTableProps) {
  if (episodes.length === 0) {
    return <p className={styles.hint}>Noch keine Episoden vorhanden.</p>
  }

  return (
    <div className={`${styles.episodeTable} ${density === 'compact' ? styles.episodeTableCompact : styles.episodeTableComfortable}`}>
      <div className={styles.episodeTableHeader} role="row">
        <span className={styles.episodeHeaderCell} aria-hidden="true" />
        <span className={styles.episodeHeaderCell}>Nr</span>
        <span className={styles.episodeHeaderCell}>Titel</span>
        <span className={styles.episodeHeaderCell}>Status</span>
        <span className={styles.episodeHeaderCell}>ID</span>
        <span className={styles.episodeHeaderCell}>Aktion</span>
      </div>
      {episodes.map((episode) => (
        <EpisodeRow
          key={episode.id}
          episode={episode}
          isSelected={selectedID === episode.id}
          isInlineEditing={inlineEditID === episode.id}
          inlineValues={inlineEditValues}
          isUpdating={isUpdating}
          isApplyingBulk={isApplyingBulk}
          isRemoving={Boolean(removingIDs[episode.id])}
          statuses={statuses}
          onSelect={() => onSelectEpisode(episode)}
          onToggleSelected={() => onToggleSelected(episode.id)}
          onBeginInlineEdit={() => onBeginInlineEdit(episode)}
          onInlineFieldChange={onInlineFieldChange}
          onSaveInlineEdit={onSaveInlineEdit}
          onCancelInlineEdit={onCancelInlineEdit}
          onRemove={() => onRemoveEpisode(episode)}
        />
      ))}
    </div>
  )
}
