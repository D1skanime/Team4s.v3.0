'use client'

import type { MeProjectReleaseVersion } from '@/types/contributions'

import { formatEpisodeNumber, type NavigationContext } from './releaseEditorRouting'
import { useEpisodeNeighborNavigation } from './useEpisodeNeighborNavigation'
import { useProjectNeighborNavigation } from './useProjectNeighborNavigation'

export interface UseReleaseEditorNavigationParams {
  animeId: number | null
  selectedGroupId: number | null
  currentReleaseVersionId: number | null
  episodeVersion: string
  activeTab: string
  projectReturnHref: string | null
}

export interface UseReleaseEditorNavigationResult {
  isLoading: boolean
  error: string | null
  centerLabel: string | undefined
  previousHref: string | null
  previousLabel: string | null
  nextHref: string | null
  nextLabel: string | null
}

/** Verbatim aus workspaceHelpers.ts' `formatAdjacentReleaseLabel`, lokal gehalten statt in
 * `releaseEditorRouting.ts` ergaenzt zu werden -- diese Datei ist nicht Teil von Plan 05's
 * `files_modified`, der Helfer gehoert daher ausschliesslich zur Navigations-Fassade. */
function formatProjectReleaseLabel(release: MeProjectReleaseVersion): string {
  return release.episode_title?.trim() || release.title?.trim() || `Episode ${release.episode_number}`
}

function buildProjectReleaseHref(releaseVersionId: number, projectReturnHref: string | null): string {
  const path = `/releases/${releaseVersionId}/edit`
  if (!projectReturnHref) return path
  const query = new URLSearchParams({ return_to: projectReturnHref })
  return `${path}?${query.toString()}`
}

/**
 * D-03-Fassade: aktiviert zur Laufzeit GENAU EINE der zwei bestehenden, unveraenderten
 * Nachbar-Navigationsquellen (episodenuebergreifend vs. projektbezogen) -- niemals beide,
 * niemals eine vermischte Datenstruktur (RESEARCH.md "Don't Hand-Roll", T-181-08).
 *
 * Beide Unterhooks werden IMMER aufgerufen (React rules-of-hooks-Pflicht), aber nur der aktive
 * Kontext loest tatsaechlich einen Request aus: der episodenseitige Hook wird durch
 * `animeId: null`/`currentVersionId: null` inert gehalten, wenn `context !== 'episode'`
 * (`useEpisodeNeighborNavigation`s eigenes `canFetch`-Gate greift dann), der projektseitige Hook
 * hat dafuer ein explizites `enabled`-Flag.
 */
export function useReleaseEditorNavigation(
  context: NavigationContext,
  params: UseReleaseEditorNavigationParams,
): UseReleaseEditorNavigationResult {
  const { animeId, selectedGroupId, currentReleaseVersionId, episodeVersion, activeTab, projectReturnHref } = params

  const episode = useEpisodeNeighborNavigation({
    animeId: context === 'episode' ? animeId : null,
    currentVersionId: context === 'episode' ? currentReleaseVersionId : null,
    groupId: selectedGroupId,
    releaseVersion: episodeVersion,
  })

  const project = useProjectNeighborNavigation({
    animeId,
    selectedGroupId,
    currentReleaseVersionId,
    enabled: context === 'project',
  })

  if (context === 'episode') {
    const centerLabel =
      episode.currentIndex >= 0 && episode.totalCount > 0
        ? `Folge ${episode.currentIndex + 1} / ${episode.totalCount}`
        : undefined

    return {
      isLoading: episode.isLoading,
      error: episode.error,
      centerLabel,
      previousHref: episode.prevVersionId != null ? `/releases/${episode.prevVersionId}/edit?tab=${activeTab}` : null,
      previousLabel: episode.prevVersionId != null ? formatEpisodeNumber(episode.prevEpisodeNumber) : null,
      nextHref: episode.nextVersionId != null ? `/releases/${episode.nextVersionId}/edit?tab=${activeTab}` : null,
      nextLabel: episode.nextVersionId != null ? formatEpisodeNumber(episode.nextEpisodeNumber) : null,
    }
  }

  return {
    isLoading: project.isLoading,
    error: project.error,
    centerLabel: undefined,
    previousHref: project.previous ? buildProjectReleaseHref(project.previous.release_version_id, projectReturnHref) : null,
    previousLabel: project.previous ? formatProjectReleaseLabel(project.previous) : null,
    nextHref: project.next ? buildProjectReleaseHref(project.next.release_version_id, projectReturnHref) : null,
    nextLabel: project.next ? formatProjectReleaseLabel(project.next) : null,
  }
}
