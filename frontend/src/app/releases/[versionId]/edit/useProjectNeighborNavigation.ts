import { useEffect, useState } from 'react'

import { getMyProjectDetail } from '@/lib/api'
import type { MeProjectReleaseVersion } from '@/types/contributions'

export interface UseProjectNeighborNavigationParams {
  animeId: number | null
  selectedGroupId: number | null
  currentReleaseVersionId: number | null
  enabled: boolean
}

export interface UseProjectNeighborNavigationResult {
  previous: MeProjectReleaseVersion | null
  next: MeProjectReleaseVersion | null
  isLoading: boolean
  error: string | null
}

type NavigationState = {
  key: string
  status: 'ready' | 'error'
  adjacent: { previous: MeProjectReleaseVersion | null; next: MeProjectReleaseVersion | null } | null
}

const EMPTY_RESULT: UseProjectNeighborNavigationResult = {
  previous: null,
  next: null,
  isLoading: false,
  error: null,
}

/**
 * Projekt-Kontext-Nachbar-Navigation (D-03), extrahiert aus dem
 * `useEffect` in `app/me/releases/[versionId]/workspace/page.tsx:189-229`. Im Unterschied zum
 * Original nimmt dieser Hook seine Eingaben als explizite Params statt direkt aus `context` zu
 * lesen und ueberspringt den `getMyProjectDetail`-Aufruf vollstaendig, wenn `enabled` false ist --
 * neu hinzugefuegtes Gating, damit `useReleaseEditorNavigation`s Episoden-Kontext-Zweig niemals
 * einen Projekt-Detail-Fetch ausloest (D-03/T-181-08).
 */
export function useProjectNeighborNavigation(
  params: UseProjectNeighborNavigationParams,
): UseProjectNeighborNavigationResult {
  const { animeId, selectedGroupId, currentReleaseVersionId, enabled } = params
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null)

  const navigationKey =
    enabled && animeId != null && selectedGroupId != null && currentReleaseVersionId != null
      ? `${animeId}:${selectedGroupId}:${currentReleaseVersionId}`
      : null

  useEffect(() => {
    if (!enabled || !animeId || !selectedGroupId || !currentReleaseVersionId) return

    let cancelled = false
    const key = `${animeId}:${selectedGroupId}:${currentReleaseVersionId}`

    void getMyProjectDetail(animeId, selectedGroupId)
      .then((response) => {
        if (cancelled) return
        const project = response.data
        if (project.anime_id !== animeId || project.fansub_group_id !== selectedGroupId) {
          setNavigationState({ key, status: 'ready', adjacent: null })
          return
        }
        const currentIndex = project.release_versions.findIndex(
          (release) => release.release_version_id === currentReleaseVersionId,
        )
        if (currentIndex < 0) {
          setNavigationState({ key, status: 'ready', adjacent: null })
          return
        }
        setNavigationState({
          key,
          status: 'ready',
          adjacent: {
            previous: project.release_versions[currentIndex - 1] ?? null,
            next: project.release_versions[currentIndex + 1] ?? null,
          },
        })
      })
      .catch(() => {
        if (!cancelled) setNavigationState({ key, status: 'error', adjacent: null })
      })

    return () => {
      cancelled = true
    }
  }, [enabled, animeId, selectedGroupId, currentReleaseVersionId])

  if (!enabled || navigationKey == null) {
    return EMPTY_RESULT
  }

  const isLoading = navigationState?.key !== navigationKey
  const hasError = navigationState?.key === navigationKey && navigationState.status === 'error'
  const adjacent =
    navigationState?.key === navigationKey && navigationState.status === 'ready' ? navigationState.adjacent : null

  return {
    previous: adjacent?.previous ?? null,
    next: adjacent?.next ?? null,
    isLoading,
    error: hasError ? 'Nachbar-Releases konnten nicht geladen werden.' : null,
  }
}
