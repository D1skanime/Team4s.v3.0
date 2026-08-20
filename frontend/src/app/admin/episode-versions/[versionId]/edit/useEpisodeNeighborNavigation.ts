import { useEffect, useState } from "react";

import { getGroupedEpisodes } from "@/lib/api";

import {
  computeNeighborNavigation,
  type NeighborNavigationResult,
} from "./episodeNeighborNavigation";

export interface UseEpisodeNeighborNavigationParams {
  animeId: number | null;
  currentVersionId: number | null;
  groupId: number | null;
  releaseVersion: string;
}

export interface UseEpisodeNeighborNavigationResult
  extends NeighborNavigationResult {
  isLoading: boolean;
  error: string | null;
}

const EMPTY_TARGETS: NeighborNavigationResult = {
  currentIndex: -1,
  totalCount: 0,
  prevVersionId: null,
  prevEpisodeNumber: null,
  nextVersionId: null,
  nextEpisodeNumber: null,
};

export function useEpisodeNeighborNavigation(
  params: UseEpisodeNeighborNavigationParams,
): UseEpisodeNeighborNavigationResult {
  const { animeId, currentVersionId, groupId, releaseVersion } = params;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigation, setNavigation] =
    useState<NeighborNavigationResult>(EMPTY_TARGETS);

  useEffect(() => {
    if (animeId == null || currentVersionId == null) {
      setIsLoading(false);
      setError(null);
      setNavigation(EMPTY_TARGETS);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void getGroupedEpisodes(animeId)
      .then((response) => {
        if (cancelled) return;
        const result = computeNeighborNavigation({
          episodes: response.data.episodes,
          currentVersionId,
          groupId,
          releaseVersion,
        });
        setNavigation(result);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (cancelled) return;
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Nachbar-Folgen konnten nicht geladen werden.";
        setError(message);
        setNavigation(EMPTY_TARGETS);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [animeId, currentVersionId, groupId, releaseVersion]);

  return {
    isLoading,
    error,
    ...navigation,
  };
}
