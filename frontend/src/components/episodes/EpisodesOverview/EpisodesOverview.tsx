'use client'

import { useState } from 'react'
import { GroupedEpisode } from '@/types/episodeVersion'
import { EpisodeAccordion } from './EpisodeAccordion'
import styles from './EpisodesOverview.module.css'

interface EpisodesOverviewProps {
  episodes: GroupedEpisode[]
  isLoading?: boolean
  error?: string | null
  onPlayVersion?: (versionId: number) => void
}

export function EpisodesOverview({
  episodes,
  isLoading = false,
  error = null,
  onPlayVersion,
}: EpisodesOverviewProps) {
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<number>>(new Set())

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
      <div className={styles.episodeList}>
        {episodes.map((episode) => (
          <EpisodeAccordion
            key={episode.episode_number}
            episode={episode}
            isExpanded={expandedEpisodes.has(episode.episode_number)}
            onToggle={() => toggleExpanded(episode.episode_number)}
            onPlayVersion={onPlayVersion}
          />
        ))}
      </div>
    </div>
  )
}
