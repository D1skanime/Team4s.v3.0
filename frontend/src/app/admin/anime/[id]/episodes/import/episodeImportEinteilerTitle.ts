import type { EpisodeImportCanonicalEpisode } from '../../../../../../types/episodeImport'
import { resolveEpisodeDisplayTitle } from './episodeImportMapping'

const PLACEHOLDER_EPISODE_TITLE_PATTERN = /^(?:episode|folge|ep\.?)\s*0*([0-9]*)$/i

/**
 * Mirrors the Go placeholder-episode-title detection
 * (backend/internal/repository/episode_placeholder_title.go
 * placeholderEpisodeTitlePattern) and the Postgres copy
 * (public_release_name.go episodeTitlePlaceholderSQL) for a third time --
 * this one purely for a display-side preview prefill in the frontend (no
 * persistence decision). If the shared rule ever changes, all three copies
 * must be kept in sync.
 */
export function isPlaceholderEpisodeTitle(title: string, episodeNumber: number): boolean {
  const trimmed = title.trim()
  if (!trimmed) {
    return false
  }
  const match = trimmed.match(PLACEHOLDER_EPISODE_TITLE_PATTERN)
  if (!match) {
    return false
  }
  const numberGroup = match[1]
  if (!numberGroup) {
    return true
  }
  return Number.parseInt(numberGroup, 10) === episodeNumber
}

/**
 * Prefill placeholder episode titles with the anime title for Einteiler
 * previews (GAP-10, 167-UAT.md). Pure preview-state transformation -- no
 * database write happens here; the admin can freely overwrite the prefilled
 * value before "Mapping anwenden", exactly like the existing setEpisodeTitle
 * edit path in useEpisodeImportBuilder.ts.
 */
export function applyEinteilerTitlePrefill(
  episodes: EpisodeImportCanonicalEpisode[],
  isEinteiler: boolean,
  animeTitle: string,
): EpisodeImportCanonicalEpisode[] {
  const trimmedAnimeTitle = animeTitle.trim()
  if (!isEinteiler || !trimmedAnimeTitle) {
    return episodes
  }

  return episodes.map((episode) => {
    const currentTitle = resolveEpisodeDisplayTitle(episode)
    if (!currentTitle || !isPlaceholderEpisodeTitle(currentTitle, episode.episode_number)) {
      return episode
    }
    return {
      ...episode,
      title: trimmedAnimeTitle,
      titles_by_language: { ...(episode.titles_by_language ?? {}), de: trimmedAnimeTitle },
    }
  })
}
