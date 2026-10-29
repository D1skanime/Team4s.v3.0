import { EpisodeStatus } from '@/types/anime'
import { AdminJellyfinSeriesSearchItem, AdminAnimeJellyfinPreviewResult, AdminAnimeJellyfinSyncResult } from '@/types/admin'

import styles from './JellyfinSyncPanel.module.css'

/**
 * Geteilte Typen, Konstanten und kleine, zustandslose Render-Helfer für die vier
 * JellyfinSyncPanel-Assistentenschritte. Ausgelagert, damit JellyfinSyncPanel.tsx und die
 * einzelnen Schritt-Komponenten (JellyfinSyncStep*.tsx) dieselben Bausteine nutzen, statt sie
 * mehrfach zu definieren.
 */

export const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']
export const WIZARD_STEPS = ['Suchen', 'Treffer', 'Preview', 'Sync'] as const

export type StepFeedback = { tone: 'success' | 'error'; message: string; details?: string } | null

export interface JellyfinSyncModel {
  searchQuery: string
  seriesOptions: AdminJellyfinSeriesSearchItem[]
  selectedSeriesID: string
  seasonInput: string
  episodeStatus: EpisodeStatus
  cleanupVersions: boolean
  allowMismatch: boolean
  previewResult: AdminAnimeJellyfinPreviewResult | null
  lastSyncResult: AdminAnimeJellyfinSyncResult | null
  isSearching: boolean
  isLoadingPreview: boolean
  isSyncing: boolean
  isBulkSyncing: boolean
  searchFeedback: StepFeedback
  previewFeedback: StepFeedback
  syncFeedback: StepFeedback
  setSearchQuery: (q: string) => void
  selectSeries: (id: string) => void
  setSeasonInput: (value: string) => void
  setEpisodeStatus: (value: EpisodeStatus) => void
  setCleanupVersions: (value: boolean) => void
  setAllowMismatch: (value: boolean) => void
  search: () => Promise<void>
  preview: (animeID: number) => Promise<void>
  sync: (animeID: number, options?: { requireFreshPreview?: boolean }) => Promise<boolean>
  reset: () => void
}

export function renderStepFeedback(feedback: StepFeedback) {
  if (!feedback) {
    return null
  }

  const className = feedback.tone === 'error' ? styles.errorState : styles.successState
  return <div className={className}>{feedback.details ? `${feedback.message} ${feedback.details}` : feedback.message}</div>
}

export function formatSeriesOption(item: AdminJellyfinSeriesSearchItem): string {
  const year = item.production_year ? ` (${item.production_year})` : ''
  const path = item.path?.trim() || '(ohne Pfad)'
  return `${item.name}${year} - ${path}`
}
