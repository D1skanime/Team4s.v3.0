'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { buildBulkFansubGroupAssignments } from '@/app/admin/anime/utils/episode-bulk-fansub-group'
import { updateEpisodeVersion } from '@/lib/api'
import { EpisodeListItem } from '@/types/anime'
import { GroupedEpisode } from '@/types/episodeVersion'
import { FansubGroup } from '@/types/fansub'

import { EpisodeAccordion } from './EpisodeAccordion'
import styles from './EpisodesOverview.module.css'

interface EpisodesOverviewProps {
  episodes: GroupedEpisode[]
  episodeItems: EpisodeListItem[]
  fansubs: FansubGroup[]
  isLoading?: boolean
  error?: string | null
  onRefresh: () => Promise<void>
}

export function EpisodesOverview({
  episodes,
  episodeItems,
  fansubs,
  isLoading = false,
  error = null,
  onRefresh,
}: EpisodesOverviewProps) {
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<number>>(new Set())
  const [selectedEpisodeIDs, setSelectedEpisodeIDs] = useState<Set<number>>(new Set())
  const [fansubGroupID, setFansubGroupID] = useState<number | ''>('')
  const [isApplyingBulk, setIsApplyingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const episodeIDByNumber = new Map(
    episodeItems.map((episode) => [Number.parseInt(episode.episode_number, 10), episode.id]),
  )
  const selectableEpisodeIDs = episodes
    .map((episode) => episodeIDByNumber.get(episode.episode_number))
    .filter((episodeID): episodeID is number => episodeID !== undefined)
  const selectedCount = selectableEpisodeIDs.filter((episodeID) => selectedEpisodeIDs.has(episodeID)).length
  const allEpisodesSelected = selectableEpisodeIDs.length > 0 && selectedCount === selectableEpisodeIDs.length

  const toggleExpanded = (episodeNumber: number) => {
    setExpandedEpisodes((prev) => {
      const next = new Set(prev)
      if (next.has(episodeNumber)) {
        next.delete(episodeNumber)
      } else {
        next.add(episodeNumber)
      }
      return next
    })
  }

  const toggleSelected = (episodeID: number) => {
    setSelectedEpisodeIDs((previous) => {
      const next = new Set(previous)
      if (next.has(episodeID)) {
        next.delete(episodeID)
      } else {
        next.add(episodeID)
      }
      return next
    })
  }

  const toggleAllEpisodes = () => {
    setSelectedEpisodeIDs((previous) => {
      if (allEpisodesSelected) {
        return new Set([...previous].filter((episodeID) => !selectableEpisodeIDs.includes(episodeID)))
      }
      return new Set([...previous, ...selectableEpisodeIDs])
    })
  }

  const handleBulkFansubGroupApply = async () => {
    if (!fansubGroupID || selectedCount === 0) return

    const selectedIDs = Object.fromEntries(
      [...selectedEpisodeIDs].map((episodeID) => [episodeID, true]),
    ) as Record<number, true>
    const { assignments, skippedEpisodeIDs } = buildBulkFansubGroupAssignments({
      selectedEpisodeIDs: selectedIDs,
      episodes: episodeItems,
      groupedEpisodes: episodes,
      fansubGroupID,
    })

    setBulkError(null)
    setBulkMessage(null)
    if (assignments.length === 0) {
      setBulkMessage(
        `${skippedEpisodeIDs.length} ausgewählte Episode${skippedEpisodeIDs.length === 1 ? '' : 'n'} ohne Release-Version übersprungen.`,
      )
      return
    }

    setIsApplyingBulk(true)
    setBulkProgress({ done: 0, total: assignments.length })
    try {
      for (let index = 0; index < assignments.length; index += 1) {
        const assignment = assignments[index]
        await updateEpisodeVersion(assignment.versionID, {
          fansub_groups: assignment.fansubGroups,
        })
        setBulkProgress({ done: index + 1, total: assignments.length })
      }
      await onRefresh()
      const skippedMessage = skippedEpisodeIDs.length
        ? ` ${skippedEpisodeIDs.length} Episode${skippedEpisodeIDs.length === 1 ? '' : 'n'} ohne Release-Version übersprungen.`
        : ''
      setBulkMessage(`Fansub-Gruppe für ${assignments.length} Release-Version${assignments.length === 1 ? '' : 'en'} ergänzt.${skippedMessage}`)
    } catch (mutationError) {
      setBulkError(
        mutationError instanceof Error && mutationError.message
          ? mutationError.message
          : 'Fansub-Gruppe konnte nicht ergänzt werden.',
      )
    } finally {
      setIsApplyingBulk(false)
      setBulkProgress(null)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.stateContainer}>
        <div className={styles.spinner} aria-label="Loading episodes" />
        <p className={styles.stateText}>Episoden werden geladen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.errorText}>{error}</p>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.stateText}>Keine Episoden vorhanden.</p>
      </div>
    )
  }

  return (
    <div className={styles.episodesOverview}>
      <div className={styles.selectionToolbar}>
        <label className={styles.selectAllLabel}>
          <Input
            type="checkbox"
            checked={allEpisodesSelected}
            onChange={toggleAllEpisodes}
            disabled={isApplyingBulk || selectableEpisodeIDs.length === 0}
          />
          Alle Episoden auswählen
        </label>
      </div>

      {selectedCount > 0 ? (
        <div className={styles.bulkActionBar} role="region" aria-label="Mehrfachaktionen für Episoden">
          <strong>{selectedCount} ausgewählt</strong>
          <Select
            className={styles.bulkSelect}
            value={fansubGroupID}
            onChange={(event) => setFansubGroupID(event.target.value ? Number.parseInt(event.target.value, 10) : '')}
            disabled={isApplyingBulk}
            aria-label="Fansub-Gruppe für ausgewählte Episoden"
          >
            <option value="">Bestehende Gruppe wählen</option>
            {fansubs.map((fansub) => (
              <option key={fansub.id} value={fansub.id}>
                {fansub.name}
              </option>
            ))}
          </Select>
          <button
            className={styles.bulkApplyButton}
            type="button"
            disabled={isApplyingBulk || fansubGroupID === ''}
            onClick={() => void handleBulkFansubGroupApply()}
          >
            {isApplyingBulk && bulkProgress
              ? `Ergänze ${bulkProgress.done}/${bulkProgress.total}`
              : 'Gruppe ergänzen'}
          </button>
          <button
            className={styles.clearSelectionButton}
            type="button"
            disabled={isApplyingBulk}
            onClick={() => setSelectedEpisodeIDs(new Set())}
          >
            Auswahl aufheben
          </button>
        </div>
      ) : null}

      {bulkMessage ? <p className={styles.bulkMessage}>{bulkMessage}</p> : null}
      {bulkError ? <p className={styles.bulkError}>{bulkError}</p> : null}

      <div className={styles.episodeList}>
        {episodes.map((episode) => {
          const episodeID = episodeIDByNumber.get(episode.episode_number)
          return (
            <EpisodeAccordion
              key={episode.episode_number}
              episode={episode}
              isExpanded={expandedEpisodes.has(episode.episode_number)}
              onToggle={() => toggleExpanded(episode.episode_number)}
              isSelected={episodeID !== undefined && selectedEpisodeIDs.has(episodeID)}
              onSelectionChange={episodeID !== undefined ? () => toggleSelected(episodeID) : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}