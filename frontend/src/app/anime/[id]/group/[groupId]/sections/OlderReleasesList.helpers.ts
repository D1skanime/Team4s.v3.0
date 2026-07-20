import { useSyncExternalStore } from 'react'

import type { EpisodeReleaseSummary } from '@/types/group'

/**
 * AO4-Bugfix (260718-2w4): Der Cursor-Endpunkt (getGroupReleaseListCursor)
 * unterstuetzt nur sort: "activity" | "release_date" — es gibt keinen
 * episode_number-Sortmodus serverseitig. Die Liste "Releases zum Fansub"
 * muss deshalb clientseitig strikt aufsteigend nach episode_number sortiert
 * werden, unabhaengig von der API-Antwortreihenfolge. Liefert eine neue
 * Kopie; das Eingabe-Array wird nicht mutiert.
 */
export function sortReleasesByEpisodeNumberAscending(
  items: EpisodeReleaseSummary[],
): EpisodeReleaseSummary[] {
  return [...items].sort((a, b) => a.episode_number - b.episode_number)
}

export const MOBILE_LIST_BREAKPOINT_QUERY = '(max-width: 768px)'

function currentIsMobileReleasesList(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(MOBILE_LIST_BREAKPOINT_QUERY).matches
}

function subscribeToMobileReleasesListBreakpoint(onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined
  const query = window.matchMedia(MOBILE_LIST_BREAKPOINT_QUERY)
  query.addEventListener('change', onStoreChange)
  return () => query.removeEventListener('change', onStoreChange)
}

/**
 * AO4-Bugfix (260718-2w4): Verwendet einen einzigen responsiven Render-Zweig:
 * Nur EIN Wrapper (mobil ODER Desktop) befindet sich zu jedem Zeitpunkt
 * im DOM. Folgt exakt dem
 * useSyncExternalStore+matchMedia-Muster aus ProjectStats.tsx.
 */
export function useIsMobileReleasesList(): boolean {
  return useSyncExternalStore(subscribeToMobileReleasesListBreakpoint, currentIsMobileReleasesList, () => false)
}
