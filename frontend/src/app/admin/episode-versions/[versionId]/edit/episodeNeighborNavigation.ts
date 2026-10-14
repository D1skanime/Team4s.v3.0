import type { EpisodeVersion, GroupedEpisode } from "@/types/episodeVersion";

/**
 * Normalisiert eine Release-Version fuer Vergleiche: trimmt Whitespace und
 * faellt bei leerem Wert auf "v1" zurueck.
 */
export function normalizeVersion(value: string | null | undefined): string {
  return value?.trim() || "v1";
}

/**
 * Findet den Index der Episode, deren `versions[]` eine Version mit
 * `id === currentVersionId` enthaelt. Gibt -1 zurueck, wenn keine Episode passt.
 */
export function resolveCurrentEpisodeIndex(
  episodes: GroupedEpisode[],
  currentVersionId: number,
): number {
  return episodes.findIndex((episode) =>
    episode.versions.some((version) => version.id === currentVersionId),
  );
}

/**
 * Sucht innerhalb einer Episode die Version, die zur gewuenschten Gruppe
 * (falls angegeben) und Release-Version passt.
 */
export function findMatchingVersionForEpisode(
  episode: GroupedEpisode,
  groupId: number | null,
  releaseVersion: string,
): EpisodeVersion | null {
  const normalizedTarget = normalizeVersion(releaseVersion);

  const match = episode.versions.find((version) => {
    const versionMatches =
      normalizeVersion(version.release_version) === normalizedTarget;
    if (!versionMatches) return false;

    if (groupId != null) {
      return version.fansub_groups?.some((group) => group.id === groupId) ?? false;
    }

    return true;
  });

  return match ?? null;
}

export interface NeighborNavigationResult {
  currentIndex: number;
  totalCount: number;
  prevVersionId: number | null;
  prevEpisodeNumber: number | null;
  nextVersionId: number | null;
  nextEpisodeNumber: number | null;
}

/**
 * Berechnet die passenden Vorgaenger-/Nachfolger-Ziele fuer die Nachbar-Episode-
 * Navigation, ausgehend von der aktuellen Version, Gruppe und Release-Version.
 */
export function computeNeighborNavigation(input: {
  episodes: GroupedEpisode[];
  currentVersionId: number;
  groupId: number | null;
  releaseVersion: string;
}): NeighborNavigationResult {
  const { currentVersionId, groupId, releaseVersion } = input;
  const sortedEpisodes = [...input.episodes].sort(
    (a, b) => a.episode_number - b.episode_number,
  );

  const currentIndex = resolveCurrentEpisodeIndex(
    sortedEpisodes,
    currentVersionId,
  );
  const totalCount = sortedEpisodes.length;

  if (currentIndex === -1) {
    return {
      currentIndex,
      totalCount,
      prevVersionId: null,
      prevEpisodeNumber: null,
      nextVersionId: null,
      nextEpisodeNumber: null,
    };
  }

  const prevEpisode =
    currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex < sortedEpisodes.length - 1
      ? sortedEpisodes[currentIndex + 1]
      : null;

  const prevVersion = prevEpisode
    ? findMatchingVersionForEpisode(prevEpisode, groupId, releaseVersion)
    : null;
  const nextVersion = nextEpisode
    ? findMatchingVersionForEpisode(nextEpisode, groupId, releaseVersion)
    : null;

  return {
    currentIndex,
    totalCount,
    prevVersionId: prevVersion?.id ?? null,
    prevEpisodeNumber: prevVersion ? prevEpisode!.episode_number : null,
    nextVersionId: nextVersion?.id ?? null,
    nextEpisodeNumber: nextVersion ? nextEpisode!.episode_number : null,
  };
}
