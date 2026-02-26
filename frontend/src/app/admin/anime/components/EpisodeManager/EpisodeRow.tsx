import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel, resolveEpisodeStatusClass } from '../../utils/anime-helpers'
import { EpisodeInlineEdit } from './EpisodeInlineEdit'
import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

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
              if (rowDisabled) return
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
              if (target.closest('input,button,a,select,label,summary')) return
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
        <div className={styles.episodeInlineShell}>
          <div className={styles.episodeInlineGrid}>
            <input
              className={styles.episodeFieldInput}
              value={inlineValues.number}
              onChange={(event) => onInlineFieldChange('number', event.target.value)}
              disabled={rowDisabled}
              aria-label="Episode Nummer"
            />
            <input
              className={styles.episodeFieldInput}
              value={inlineValues.title}
              onChange={(event) => onInlineFieldChange('title', event.target.value)}
              disabled={rowDisabled || inlineValues.clearTitle}
              placeholder="(ohne Titel)"
              aria-label="Episode Titel"
            />
            <select
              className={styles.episodeFieldInput}
              value={inlineValues.status}
              onChange={(event) => onInlineFieldChange('status', event.target.value)}
              disabled={rowDisabled}
              aria-label="Episode Status"
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {formatEpisodeStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <EpisodeInlineEdit
            clearTitle={inlineValues.clearTitle}
            disabled={rowDisabled}
            onToggleClearTitle={(value) => onInlineFieldChange('clearTitle', value)}
            onSave={onSaveInlineEdit}
            onCancel={onCancelInlineEdit}
          />
        </div>
      ) : (
        <>
          <div className={styles.episodeRowMain}>
            <span className={styles.episodeNumberBadge}>Episode {episode.episode_number}</span>
            <div className={styles.episodeTitleWrap}>
              <span className={styles.episodeTitleCell} title={episode.title || '(ohne Titel)'}>
                {episode.title || '(ohne Titel)'}
              </span>
              <span className={styles.episodeIDCell}>ID #{episode.id}</span>
            </div>
          </div>

          <span className={`${styles.episodeStatusBadge} ${styles[resolveEpisodeStatusClass(episode.status)]}`}>
            {formatEpisodeStatusLabel(episode.status)}
          </span>

          <div className={styles.episodeActionsCell}>
            <details className={styles.rowContextMenu}>
              <summary className={styles.episodeContextTrigger} aria-label={`Aktionen fuer Episode ${episode.episode_number}`}>
                <MoreHorizontal size={16} />
              </summary>
              <div className={styles.rowContextMenuBody}>
                <button className={styles.episodeContextButton} type="button" disabled={rowDisabled || isRemoving} onClick={onSelect}>
                  Im Editor oeffnen
                </button>
                <button className={styles.episodeContextButton} type="button" disabled={rowDisabled || isRemoving} onClick={onBeginInlineEdit}>
                  Schnell bearbeiten
                </button>
                <Link href={`/episodes/${episode.id}`} className={styles.episodeOpenLink} target="_blank" rel="noreferrer">
                  Oeffnen
                </Link>
                <button className={`${styles.episodeContextButton} ${styles.episodeDangerButton}`} type="button" disabled={rowDisabled || isRemoving} onClick={onRemove}>
                  Entfernen
                </button>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  )
}
