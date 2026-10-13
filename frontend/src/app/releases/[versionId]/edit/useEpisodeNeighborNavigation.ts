import { useCallback, useState } from "react";

import { getGroupedEpisodes } from "@/lib/api";
import { useCancellableSlugState } from "@/hooks/useCancellableSlugState";
import type { GroupedEpisodesResponse } from "@/types/episodeVersion";

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

  const [error, setError] = useState<string | null>(null);
  const [navigation, setNavigation] =
    useState<NeighborNavigationResult>(EMPTY_TARGETS);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);

  const canFetch = animeId != null && currentVersionId != null;
  const requestKey = canFetch
    ? `${animeId}:${currentVersionId}:${groupId ?? ""}:${releaseVersion}`
    : "";
  const fetcher = useCallback(
    () => getGroupedEpisodes(animeId as number),
    [animeId],
  );
  const { state } = useCancellableSlugState<GroupedEpisodesResponse>({
    requestKey,
    enabled: canFetch,
    fetcher,
  });

  // Adjust state during render (React-empfohlenes Muster statt Effect, siehe
  // GroupMemberFormModals.tsx-Praezedenzfall): behaelt das vorherige erfolgreiche Ergebnis
  // sichtbar, waehrend ein neuer Schluessel laedt (Class-C-Anforderung).
  if (!canFetch) {
    if (appliedKey !== null) {
      setAppliedKey(null);
      setNavigation(EMPTY_TARGETS);
      setError(null);
    }
  } else if (state.key === requestKey && state.key !== appliedKey) {
    if (state.status === "success") {
      setAppliedKey(state.key);
      const result = computeNeighborNavigation({
        episodes: state.data!.data.episodes,
        currentVersionId: currentVersionId as number,
        groupId,
        releaseVersion,
      });
      setNavigation(result);
      setError(null);
    } else if (state.status === "error") {
      setAppliedKey(state.key);
      const message =
        state.error instanceof Error
          ? state.error.message
          : "Nachbar-Folgen konnten nicht geladen werden.";
      setError(message);
      setNavigation(EMPTY_TARGETS);
    }
  }

  const isLoading =
    canFetch && (state.key !== requestKey || state.status === "loading");

  return {
    isLoading,
    error,
    ...navigation,
  };
}
