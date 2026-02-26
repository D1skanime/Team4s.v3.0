import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { AnimeDetail, EpisodeStatus } from '@/types/anime'

import { useEpisodeManager } from '../../hooks/useEpisodeManager'
import { parsePositiveInt } from '../../utils/anime-helpers'
import { suggestNextEpisodeNumber } from '../../utils/episode-helpers'
import { EpisodeFilters } from './EpisodeFilters'
import { EpisodeBulkBar } from './EpisodeBulkBar'
import { EpisodeTable } from './EpisodeTable'
import { EpisodeCreateForm } from './EpisodeCreateForm'
import { EpisodeEditForm } from './EpisodeEditForm'
import styles from '../../../admin.module.css'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']

interface EpisodeManagerProps {
  anime: AnimeDetail
  authToken: string
  onRefresh: () => Promise<void>
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRequest?: (request: string | null) => void
  onResponse?: (response: string | null) => void
}

export function EpisodeManager({ anime, authToken, onRefresh, onSuccess, onError, onRequest, onResponse }: EpisodeManagerProps) {
  const [bulkStatus, setBulkStatus] = useState<EpisodeStatus | ''>('')
  const episodeFilterInputRef = useRef<HTMLInputElement>(null)
  const episodeEditAnchorRef = useRef<HTMLDivElement>(null)

  const manager = useEpisodeManager(authToken, anime.episodes, onRefresh, onSuccess, onError, {
    onRequest,
    onResponse,
  })

  const nextEpisodeNumberSuggestion = useMemo(() => suggestNextEpisodeNumber(anime.episodes), [anime.episodes])
  const episodeOpenID = useMemo(() => manager.selectedID ?? parsePositiveInt(manager.editFormValues.id) ?? null, [manager.editFormValues.id, manager.selectedID])

  useEffect(() => {
    if (!manager.selectedID) return
    if (typeof window === 'undefined') return
    if (window.matchMedia && window.matchMedia('(max-width: 979px)').matches) {
      episodeEditAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [manager.selectedID])

  const resetPayloadPreview = () => {
    onRequest?.(null)
    onResponse?.(null)
  }

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetPayloadPreview()
    void manager.submitCreate(anime.id)
  }

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetPayloadPreview()
    void manager.submitEdit()
  }

  const handleRemoveEpisode = (episodeID: number, episodeNumber: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Episode ${episodeNumber} aus Anime #${anime.id} entfernen?\nDas entfernt nur lokale Zuordnungen (DB), nicht die Datei in Jellyfin/Emby.`,
      )
      if (!confirmed) return
    }

    const episode = anime.episodes.find((item) => item.id === episodeID)
    if (!episode) return

    resetPayloadPreview()
    void manager.removeEpisode(episode, anime.id)
  }

  const handleRemoveSelected = () => {
    if (manager.selectedCount === 0) return
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `${manager.selectedCount} markierte Episoden aus Anime #${anime.id} entfernen?\nDas entfernt nur lokale Zuordnungen (DB), nicht die Datei in Jellyfin/Emby.`,
      )
      if (!confirmed) return
    }

    resetPayloadPreview()
    void manager.removeSelected(anime.id)
  }

  const handleBulkStatusApply = () => {
    if (!bulkStatus) return
    resetPayloadPreview()
    void manager.applyBulkStatus(bulkStatus)
  }

  return (
    <section id="admin-anime-episodes" className={`${styles.panel} ${styles.editPanel}`}>
      <h2>Episoden verwalten</h2>
      <p className={styles.hint}>
        Anime #{anime.id}: {anime.title} | Episoden: {anime.episodes.length}
      </p>

      <div className={styles.episodeManager}>
        <div className={styles.episodeManagerLeft}>
          <EpisodeFilters
            inputRef={episodeFilterInputRef}
            query={manager.query}
            statusFilter={manager.statusFilter}
            density={manager.density}
            statusCounts={manager.statusCounts}
            totalCount={anime.episodes.length}
            visibleCount={manager.visibleEpisodes.length}
            selectedVisibleCount={manager.selectedVisibleCount}
            selectedCount={manager.selectedCount}
            statuses={EPISODE_STATUSES}
            disabled={manager.isUpdating || manager.isCreating || manager.isApplyingBulk}
            onQueryChange={manager.setQuery}
            onStatusFilterChange={manager.setStatusFilter}
            onDensityChange={manager.setDensity}
          />

          <EpisodeBulkBar
            statuses={EPISODE_STATUSES}
            visibleCount={manager.visibleEpisodes.length}
            selectedCount={manager.selectedCount}
            allVisibleSelected={manager.allVisibleSelected}
            bulkStatus={bulkStatus}
            isApplyingBulk={manager.isApplyingBulk}
            isUpdating={manager.isUpdating}
            bulkProgress={manager.bulkProgress}
            onToggleAllVisible={() => manager.toggleAllVisible(manager.visibleEpisodes.map((episode) => episode.id))}
            onClearSelection={manager.clearSelection}
            onBulkStatusChange={setBulkStatus}
            onApplyBulkStatus={handleBulkStatusApply}
            onRemoveSelected={handleRemoveSelected}
          />

          <EpisodeTable
            episodes={manager.visibleEpisodes}
            density={manager.density}
            selectedID={manager.selectedID}
            inlineEditID={manager.inlineEditID}
            inlineEditValues={manager.inlineEditValues}
            removingIDs={manager.removingIDs}
            isUpdating={manager.isUpdating}
            isApplyingBulk={manager.isApplyingBulk}
            statuses={EPISODE_STATUSES}
            onSelectEpisode={manager.selectEpisode}
            onToggleSelected={manager.toggleSelected}
            onBeginInlineEdit={manager.beginInlineEdit}
            onInlineFieldChange={manager.setInlineField}
            onSaveInlineEdit={() => {
              resetPayloadPreview()
              void manager.saveInlineEdit()
            }}
            onCancelInlineEdit={manager.cancelInlineEdit}
            onRemoveEpisode={(episode) => handleRemoveEpisode(episode.id, episode.episode_number)}
          />
        </div>

        <div className={styles.episodeManagerRight}>
          <EpisodeCreateForm
            animeID={anime.id}
            values={manager.createFormValues}
            statuses={EPISODE_STATUSES}
            nextEpisodeNumberSuggestion={nextEpisodeNumberSuggestion}
            isCreating={manager.isCreating}
            onFieldChange={manager.setCreateField}
            onSubmit={handleCreateSubmit}
          />

          <div className={styles.sectionDivider} />
          <div ref={episodeEditAnchorRef} />

          <EpisodeEditForm
            episodeOpenID={episodeOpenID}
            values={manager.editFormValues}
            clearFlags={manager.editFormClearFlags}
            statuses={EPISODE_STATUSES}
            isUpdating={manager.isUpdating}
            onFieldChange={manager.setEditField}
            onClearFlagChange={manager.setEditClearFlag}
            onSubmit={handleEditSubmit}
          />
        </div>
      </div>
    </section>
  )
}
