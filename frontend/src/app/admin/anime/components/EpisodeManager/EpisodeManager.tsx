import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { AnimeDetail, EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { useEpisodeManager } from '../../hooks/useEpisodeManager'
import { parsePositiveInt } from '../../utils/anime-helpers'
import { suggestNextEpisodeNumber } from '../../utils/episode-helpers'
import { EpisodeFilters } from './EpisodeFilters'
import { EpisodeBulkBar } from './EpisodeBulkBar'
import { EpisodeList } from './EpisodeList'
import { EpisodeCreateForm } from './EpisodeCreateForm'
import { EpisodeEditor } from './EpisodeEditor'
import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']

interface EpisodeManagerProps {
  anime: AnimeDetail
  authToken: string
  onRefresh: () => Promise<void>
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRequest?: (request: string | null) => void
  onResponse?: (response: string | null) => void
  onEditorStateChange?: (state: { selectedEpisodeId: number | null; hasUnsavedChanges: boolean; isSaving: boolean }) => void
  onRegisterSaveAction?: (saveAction: (() => void) | null) => void
}

export function EpisodeManager({
  anime,
  authToken,
  onRefresh,
  onSuccess,
  onError,
  onRequest,
  onResponse,
  onEditorStateChange,
  onRegisterSaveAction,
}: EpisodeManagerProps) {
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

  useEffect(() => {
    onEditorStateChange?.({
      selectedEpisodeId: manager.selectedID,
      hasUnsavedChanges: manager.hasEditChanges,
      isSaving: manager.isUpdating,
    })
  }, [manager.hasEditChanges, manager.isUpdating, manager.selectedID, onEditorStateChange])

  useEffect(() => {
    onRegisterSaveAction?.(() => {
      void manager.submitEdit()
    })
    return () => onRegisterSaveAction?.(null)
  }, [manager, onRegisterSaveAction])

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
      const confirmed = window.confirm(`Episode ${episodeNumber} wirklich entfernen?`)
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
      const confirmed = window.confirm(`${manager.selectedCount} ausgewaehlte Episoden wirklich entfernen?`)
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

  const handleSelectEpisode = (episode: EpisodeListItem) => {
    if (manager.selectedID && manager.selectedID !== episode.id && manager.hasEditChanges && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Es gibt ungespeicherte Aenderungen an der aktuellen Episode. Trotzdem wechseln und Aenderungen verwerfen?',
      )
      if (!confirmed) return
    }
    manager.selectEpisode(episode)
  }

  return (
    <section id="admin-anime-episodes" className={`${styles.panel} ${styles.editPanel} ${styles.episodePanel}`}>
      <header className={styles.episodeHeaderZone}>
        <h2 className={styles.episodeHeaderTitle}>Episoden verwalten</h2>
        <p className={styles.episodeHeaderSubtitle}>Anime: {anime.title}</p>
        <p className={styles.episodeHeaderMeta}>{anime.episodes.length} Episoden</p>
        <p className={styles.episodeHeaderSelection}>{manager.selectedCount} ausgewaehlt</p>
      </header>

      <div className={styles.episodeManager}>
        <div className={styles.episodeManagerLeft}>
          <EpisodeCreateForm
            values={manager.createFormValues}
            statuses={EPISODE_STATUSES}
            nextEpisodeNumberSuggestion={nextEpisodeNumberSuggestion}
            isCreating={manager.isCreating}
            onFieldChange={manager.setCreateField}
            onSubmit={handleCreateSubmit}
          />

          <EpisodeFilters
            inputRef={episodeFilterInputRef}
            query={manager.query}
            statusFilter={manager.statusFilter}
            density={manager.density}
            statusCounts={manager.statusCounts}
            visibleCount={manager.visibleEpisodes.length}
            allVisibleSelected={manager.allVisibleSelected}
            disabled={manager.isUpdating || manager.isCreating || manager.isApplyingBulk}
            onQueryChange={manager.setQuery}
            onStatusFilterChange={manager.setStatusFilter}
            onDensityChange={manager.setDensity}
            onToggleAllVisible={() => manager.toggleAllVisible(manager.visibleEpisodes.map((episode) => episode.id))}
          />

          {manager.selectedCount > 0 ? (
            <EpisodeBulkBar
              statuses={EPISODE_STATUSES}
              selectedCount={manager.selectedCount}
              bulkStatus={bulkStatus}
              isApplyingBulk={manager.isApplyingBulk}
              isUpdating={manager.isUpdating}
              bulkProgress={manager.bulkProgress}
              onClearSelection={manager.clearSelection}
              onBulkStatusChange={setBulkStatus}
              onApplyBulkStatus={handleBulkStatusApply}
              onRemoveSelected={handleRemoveSelected}
            />
          ) : null}

          <section className={styles.episodeListZone}>
            <div className={styles.episodeListZoneHeader}>
              <h3>Episodenliste</h3>
              <p className={styles.hint}>{manager.visibleEpisodes.length} sichtbar</p>
            </div>
            <EpisodeList
              episodes={manager.visibleEpisodes}
              density={manager.density}
              selectedID={manager.selectedID}
              inlineEditID={manager.inlineEditID}
              inlineEditValues={manager.inlineEditValues}
              removingIDs={manager.removingIDs}
              isUpdating={manager.isUpdating}
              isApplyingBulk={manager.isApplyingBulk}
              statuses={EPISODE_STATUSES}
              onSelectEpisode={handleSelectEpisode}
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
          </section>
        </div>

        <div className={styles.episodeManagerRight}>
          <div ref={episodeEditAnchorRef} />

          <EpisodeEditor
            episodeOpenID={episodeOpenID}
            selectedEpisode={manager.selectedEpisode}
            values={manager.editFormValues}
            clearFlags={manager.editFormClearFlags}
            hasUnsavedChanges={manager.hasEditChanges}
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
