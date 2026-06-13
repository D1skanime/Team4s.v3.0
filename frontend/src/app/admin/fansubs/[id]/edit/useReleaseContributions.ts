"use client";

import { useCallback, useState } from "react";

import {
  listAnimeContributions,
  listUnifiedGroupMembers,
} from "@/lib/api";
import type { AdminFansubAnimeEntry } from "@/types/admin";
import type {
  AnimeContribution,
  UnifiedGroupMember,
} from "@/types/fansub";
import { errMessage } from "./fansubEditFormatters";
import type { ContributionModalAnime } from "./fansubEditTypes";

type UseReleaseContributionsArgs = {
  fansubID: number;
  refreshAnimeCoverage: () => Promise<void>;
};

export type ReleaseContributions = ReturnType<typeof useReleaseContributions>;

export function useReleaseContributions({
  fansubID,
  refreshAnimeCoverage,
}: UseReleaseContributionsArgs) {
  const [contributionModalAnime, setContributionModalAnime] =
    useState<ContributionModalAnime | null>(null);
  const [contributionMembers, setContributionMembers] = useState<
    UnifiedGroupMember[]
  >([]);
  const [contributionModalRows, setContributionModalRows] = useState<
    AnimeContribution[]
  >([]);
  const [animeContributionRowsByAnimeId, setAnimeContributionRowsByAnimeId] =
    useState<Record<number, AnimeContribution[]>>({});
  const [contributionModalLoadingAnimeId, setContributionModalLoadingAnimeId] =
    useState<number | null>(null);
  const [contributionModalError, setContributionModalError] = useState<
    string | null
  >(null);

  const [contributionDrawerOpen, setContributionDrawerOpen] = useState(false);
  const [contributionDrawerVersionId, setContributionDrawerVersionId] =
    useState<number | null>(null);
  const [contributionDrawerAnimeId, setContributionDrawerAnimeId] = useState<
    number | null
  >(null);
  const [contributionDrawerTitle, setContributionDrawerTitle] =
    useState<string>("");

  const rememberAnimeContributionRows = useCallback(
    (animeID: number, rows: AnimeContribution[]) => {
      setAnimeContributionRowsByAnimeId((current) => ({
        ...current,
        [animeID]: rows,
      }));
    },
    [],
  );

  const loadAnimeContributionRows = useCallback(
    async (animeID: number) => {
      try {
        const response = await listAnimeContributions(fansubID, animeID);
        const rows = response.data ?? [];
        rememberAnimeContributionRows(animeID, rows);
        return rows;
      } catch {
        return animeContributionRowsByAnimeId[animeID] ?? [];
      }
    },
    [animeContributionRowsByAnimeId, fansubID, rememberAnimeContributionRows],
  );

  const openAnimeContributions = useCallback(
    async (
      anime: AdminFansubAnimeEntry,
      focusedRoleCode: string | null = null,
    ) => {
      setContributionModalLoadingAnimeId(anime.id);
      setContributionModalError(null);
      try {
        const [membersResult, contributionsResponse] = await Promise.all([
          listUnifiedGroupMembers(fansubID),
          listAnimeContributions(fansubID, anime.id),
        ]);
        const contributionRows = contributionsResponse.data ?? [];
        setContributionMembers(membersResult ?? []);
        setContributionModalRows(contributionRows);
        rememberAnimeContributionRows(anime.id, contributionRows);
        setContributionModalAnime({
          id: anime.id,
          title: anime.title,
          focusedRoleCode,
        });
      } catch (nextError) {
        setContributionModalError(errMessage(nextError));
      } finally {
        setContributionModalLoadingAnimeId(null);
      }
    },
    [fansubID, rememberAnimeContributionRows],
  );

  const openContributionDrawer = useCallback(
    (versionId: number, animeId: number, title: string) => {
      setContributionDrawerVersionId(versionId);
      setContributionDrawerAnimeId(animeId);
      setContributionDrawerTitle(title);
      setContributionDrawerOpen(true);
    },
    [],
  );

  const refreshAnimeContributions = useCallback(
    async (animeID: number) => {
      try {
        const response = await listAnimeContributions(fansubID, animeID);
        const rows = response.data ?? [];
        setContributionModalRows(rows);
        rememberAnimeContributionRows(animeID, rows);
      } catch {
        // Der Speichervorgang selbst war erfolgreich; ein Refresh-Fehler ist nicht kritisch.
      }
      void refreshAnimeCoverage();
    },
    [fansubID, refreshAnimeCoverage, rememberAnimeContributionRows],
  );

  const resetContributionsState = useCallback(() => {
    setContributionModalAnime(null);
    setContributionMembers([]);
    setContributionModalRows([]);
    setAnimeContributionRowsByAnimeId({});
    setContributionModalLoadingAnimeId(null);
    setContributionModalError(null);
  }, []);

  return {
    // Modal state
    contributionModalAnime,
    setContributionModalAnime,
    contributionMembers,
    contributionModalRows,
    animeContributionRowsByAnimeId,
    contributionModalLoadingAnimeId,
    contributionModalError,
    // Phase-83 drawer state
    contributionDrawerOpen,
    setContributionDrawerOpen,
    contributionDrawerVersionId,
    contributionDrawerAnimeId,
    contributionDrawerTitle,
    // Handlers
    loadAnimeContributionRows,
    openAnimeContributions,
    openContributionDrawer,
    refreshAnimeContributions,
    // Reset
    resetContributionsState,
  };
}
