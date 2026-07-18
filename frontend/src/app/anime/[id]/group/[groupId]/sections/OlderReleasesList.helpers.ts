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
