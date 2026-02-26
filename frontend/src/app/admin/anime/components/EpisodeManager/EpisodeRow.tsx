import Link from 'next/link'

import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel, resolveEpisodeStatusClass } from '../../utils/anime-helpers'
import { EpisodeInlineEdit } from './EpisodeInlineEdit'
import styles from '../../../admin.module.css'

interface EpisodeRowProps {
  episode: EpisodeListItem
  isSelected: boolean
  isInlineEditing: boolean
  inlineValues: { number: string; title: string; status: EpisodeStatus; clearTitle: boolean }
  isUpdating: boolean
  isApplyingBulk: boolean
  isRemoving: boolean
  statuses: EpisodeStatus[]
  onSelect: () => void
  onToggleSelected: () => void
  onBeginInlineEdit: () => void
  onInlineFieldChange: (field: 'number' | 'title' | 'status' | 'clearTitle', value: string | boolean) => void
  onSaveInlineEdit: () => void
  onCancelInlineEdit: () => void
  onRemove: () => void
}

export function EpisodeRow({
  episode,
  isSelected,
  isInlineEditing,
  inlineValues,
  isUpdating,
  isApplyingBulk,
  isRemoving,
  statuses,
  onSelect,
  onToggleSelected,
  onBeginInlineEdit,
  onInlineFieldChange,
  onSaveInlineEdit,
  onCancelInlineEdit,
  onRemove,
}: EpisodeRowProps) {
  const rowDisabled = isUpdating || isApplyingBulk

  return (
    <div
      className={`${styles.episodeTableRow} ${isSelected ? styles.episodeTableRowSelected : ''} ${isInlineEditing ? '' : styles.episodeTableRowClickable}`}
      role={isInlineEditing ? undefined : 'button'}
      tabIndex={isInlineEditing ? undefined : 0}
      onKeyDown={
        isInlineEditing
          ? undefined
          : (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onSelect()
            }
      }
      onClick={
        isInlineEditing
          ? undefined
          : (event) => {
              if (rowDisabled) return
              const target = event.target as HTMLElement | null
              if (!target) return
              if (target.closest('input,button,a,select,label')) return
              onSelect()
            }
      }
    >
      <div className={styles.episodeSelect}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelected}
          disabled={rowDisabled || isRemoving}
          aria-label={`Episode ${episode.episode_number} markieren`}
        />
      </div>

      {isInlineEditing ? (
        <input
          className={styles.episodeFieldInput}
          value={inlineValues.number}
          onChange={(event) => onInlineFieldChange('number', event.target.value)}
          disabled={rowDisabled}
          aria-label="Episode Nummer"
        />
      ) : (
        <button className={styles.episodeMiniButton} type="button" disabled={isUpdating || isRemoving} onClick={onSelect} title="In Editor laden">
          {episode.episode_number}
        </button>
      )}

      {isInlineEditing ? (
        <input
          className={styles.episodeFieldInput}
          value={inlineValues.title}
          onChange={(event) => onInlineFieldChange('title', event.target.value)}
          disabled={rowDisabled || inlineValues.clearTitle}
          placeholder="(ohne Titel)"
          aria-label="Episode Titel"
        />
      ) : (
        <span className={styles.episodeTitleCell} title={episode.title || '(ohne Titel)'}>
          {episode.title || '(ohne Titel)'}
        </span>
      )}

      {isInlineEditing ? (
        <select
          className={styles.episodeFieldInput}
          value={inlineValues.status}
          onChange={(event) => onInlineFieldChange('status', event.target.value)}
          disabled={rowDisabled}
          aria-label="Episode Status"
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      ) : (
        <span className={`${styles.statusBadge} ${styles[resolveEpisodeStatusClass(episode.status)]}`}>{formatEpisodeStatusLabel(episode.status)}</span>
      )}

      <span className={styles.episodeIDCell}>#{episode.id}</span>

      {isInlineEditing ? (
        <EpisodeInlineEdit
          clearTitle={inlineValues.clearTitle}
          disabled={rowDisabled}
          onToggleClearTitle={(value) => onInlineFieldChange('clearTitle', value)}
          onSave={onSaveInlineEdit}
          onCancel={onCancelInlineEdit}
        />
      ) : (
        <div className={styles.episodeActionsCell}>
          <button className={styles.episodeMiniButton} type="button" disabled={rowDisabled || isRemoving} onClick={onBeginInlineEdit}>
            Edit
          </button>
          <button
            className={`${styles.episodeMiniButton} ${styles.episodeDangerButton}`}
            type="button"
            disabled={rowDisabled || isRemoving}
            onClick={onRemove}
          >
            Entfernen
          </button>
          <Link href={`/episodes/${episode.id}`} className={styles.episodeOpenLink} target="_blank" rel="noreferrer">
            Oeffnen
          </Link>
        </div>
      )}
    </div>
  )
}