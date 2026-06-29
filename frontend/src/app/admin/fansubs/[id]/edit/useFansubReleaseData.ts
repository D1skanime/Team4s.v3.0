"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";

import {
  getAdminAnimeThemes,
  getAdminAnimeThemeSegments,
  getAdminFansubAnime,
  getAdminFansubAnimeReleases,
  getAdminReleaseThemeAssets,
  getAnimeCoverage,
  type AnimeCoverage,
} from "@/lib/api";
import type { AdminFansubRelease } from "@/types/fansub";
import type { CockpitFilter } from "./AnimeReleasesFilterBar";
import { errMessage } from "./fansubEditFormatters";
import {
  animeFansubReleaseContextKey,
  buildAnimeCoverageMap,
  mapReleaseSegmentCards,
} from "./fansubEditReleaseHelpers";
import type {
  FansubReleaseGroup,
  ReleasePaginationState,
  ReleaseSegmentCard,
  SelectedReleaseSegment,
} from "./fansubEditTypes";

const RELEASE_PAGE_SIZE = 30;

type UseFansubReleaseDataArgs = {
  fansubID: number;
  hasAuthSession: boolean;
  // Domänen-übergreifender Reset/Invalidate (Drawer + Contributions + Daten),
  // vom Orchestrator komponiert und beim Gruppenwechsel ausgeführt.
  resetReleaseWorkspaceState: () => void;
  invalidateReleaseWorkspaceRequests: () => void;
};

export type FansubReleaseData = ReturnType<typeof useFansubReleaseData>;

export function useFansubReleaseData({
  fansubID,
  hasAuthSession,
  resetReleaseWorkspaceState,
  invalidateReleaseWorkspaceRequests,
}: UseFansubReleaseDataArgs) {
  const [releaseGroups, setReleaseGroups] = useState<FansubReleaseGroup[]>([]);
  const [releaseGroupsLoading, setReleaseGroupsLoading] = useState(false);
  const [releaseGroupsError, setReleaseGroupsError] = useState<string | null>(
    null,
  );
  // Gap-82-07: Coverage-Aggregat: null = noch nicht geladen (D-12: kein falsches "fehlt")
  const [animeCoverageMap, setAnimeCoverageMap] = useState<Map<
    number,
    AnimeCoverage
  > | null>(null);
  const [releasesByAnimeFansubGroupId, setReleasesByAnimeFansubGroupId] =
    useState<Record<string, AdminFansubRelease[]>>({});
  const [
    releasesLoadingByAnimeFansubGroupId,
    setReleasesLoadingByAnimeFansubGroupId,
  ] = useState<Record<string, boolean>>({});
  const [
    releasesErrorsByAnimeFansubGroupId,
    setReleasesErrorsByAnimeFansubGroupId,
  ] = useState<Record<string, string | null>>({});
  const [
    releasePaginationByAnimeFansubGroupId,
    setReleasePaginationByAnimeFansubGroupId,
  ] = useState<Record<string, ReleasePaginationState>>({});
  const [expandedAnimeKeys, setExpandedAnimeKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedReleaseIds, setExpandedReleaseIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [releaseSegmentCards, setReleaseSegmentCards] = useState<
    Record<number, ReleaseSegmentCard[]>
  >({});
  const [releaseSegmentLoading, setReleaseSegmentLoading] = useState<
    Record<number, boolean>
  >({});
  const [releaseSegmentErrors, setReleaseSegmentErrors] = useState<
    Record<number, string | null>
  >({});
  const [selectedReleaseSegment, setSelectedReleaseSegment] =
    useState<SelectedReleaseSegment | null>(null);
  const [cockpitFilter, setCockpitFilter] = useState<CockpitFilter>("all");

  const releaseRequestSeqRef = useRef(0);
  const releaseRequestByContextRef = useRef<Record<string, number>>({});
  const releaseSegmentRequestSeqRef = useRef(0);
  const releaseSegmentRequestByReleaseRef = useRef<Record<number, number>>({});

  const visibleReleaseGroups = useMemo(() => {
    if (cockpitFilter === "all" || animeCoverageMap === null) {
      return releaseGroups;
    }

    return releaseGroups.filter((releaseGroup) => {
      const coverage = animeCoverageMap.get(releaseGroup.anime.id);
      if (cockpitFilter === "no-contributions") {
        return (coverage?.member_count ?? 0) === 0;
      }
      if (cockpitFilter === "no-note") {
        return !coverage?.has_project_note;
      }
      return true;
    });
  }, [animeCoverageMap, cockpitFilter, releaseGroups]);

  const loadReleaseSegmentCards = useCallback(
    async (
      release: AdminFansubRelease,
      force = false,
    ): Promise<ReleaseSegmentCard[] | null> => {
      if (!hasAuthSession) return null;
      const releaseID = release.release_id;
      if (
        !force &&
        (releaseSegmentCards[releaseID] || releaseSegmentLoading[releaseID])
      )
        return null;

      const requestID = releaseSegmentRequestSeqRef.current + 1;
      releaseSegmentRequestSeqRef.current = requestID;
      releaseSegmentRequestByReleaseRef.current[releaseID] = requestID;
      const isCurrentRequest = () =>
        releaseSegmentRequestByReleaseRef.current[releaseID] === requestID;

      setReleaseSegmentLoading((current) => ({ ...current, [releaseID]: true }));
      setReleaseSegmentErrors((current) => ({ ...current, [releaseID]: null }));
      try {
        const [themesResponse, assetsResponse] = await Promise.all([
          getAdminAnimeThemes(release.anime_id),
          getAdminReleaseThemeAssets(releaseID),
        ]);
        const segmentEntries = await Promise.all(
          themesResponse.data.map(async (theme) => {
            const response = await getAdminAnimeThemeSegments(
              release.anime_id,
              theme.id,
            );
            return [theme.id, response.data] as const;
          }),
        );
        const nextCards = mapReleaseSegmentCards(
          release,
          themesResponse.data,
          assetsResponse.data,
          new Map(segmentEntries),
        );
        if (!isCurrentRequest()) return null;
        setReleaseSegmentCards((current) => ({
          ...current,
          [releaseID]: nextCards,
        }));
        return nextCards;
      } catch (nextError) {
        if (isCurrentRequest()) {
          setReleaseSegmentErrors((current) => ({
            ...current,
            [releaseID]: errMessage(nextError),
          }));
        }
        return null;
      } finally {
        if (isCurrentRequest()) {
          setReleaseSegmentLoading((current) => ({
            ...current,
            [releaseID]: false,
          }));
        }
      }
    },
    [hasAuthSession, releaseSegmentCards, releaseSegmentLoading],
  );

  const loadAnimeReleases = useCallback(
    async (
      releaseGroup: FansubReleaseGroup,
      force = false,
      page = 1,
      append = false,
    ) => {
      if (!Number.isFinite(fansubID) || fansubID <= 0 || !hasAuthSession) return;
      const contextKey = releaseGroup.key;
      if (
        !force &&
        !append &&
        (releasesByAnimeFansubGroupId[contextKey] ||
          releasesLoadingByAnimeFansubGroupId[contextKey])
      )
        return;
      if (append && releasesLoadingByAnimeFansubGroupId[contextKey]) return;

      const requestID = releaseRequestSeqRef.current + 1;
      releaseRequestSeqRef.current = requestID;
      releaseRequestByContextRef.current[contextKey] = requestID;

      setReleasesLoadingByAnimeFansubGroupId((current) => ({
        ...current,
        [contextKey]: true,
      }));
      setReleasesErrorsByAnimeFansubGroupId((current) => ({
        ...current,
        [contextKey]: null,
      }));

      try {
        const response = await getAdminFansubAnimeReleases(
          fansubID,
          releaseGroup.anime.id,
          { page, per_page: RELEASE_PAGE_SIZE },
        );
        if (releaseRequestByContextRef.current[contextKey] !== requestID) return;
        setReleasesByAnimeFansubGroupId((current) => ({
          ...current,
          [contextKey]: append
            ? [
                ...(current[contextKey] ?? []),
                ...response.data.filter(
                  (release) =>
                    !(current[contextKey] ?? []).some(
                      (existing) => existing.release_id === release.release_id,
                    ),
                ),
              ]
            : response.data,
        }));
        setReleasePaginationByAnimeFansubGroupId((current) => ({
          ...current,
          [contextKey]: {
            page: response.meta.page,
            perPage: response.meta.per_page,
            total: response.meta.total,
            totalPages: response.meta.total_pages,
          },
        }));
      } catch (nextError) {
        if (releaseRequestByContextRef.current[contextKey] !== requestID) return;
        setReleasesErrorsByAnimeFansubGroupId((current) => ({
          ...current,
          [contextKey]: errMessage(nextError),
        }));
      } finally {
        if (releaseRequestByContextRef.current[contextKey] === requestID) {
          setReleasesLoadingByAnimeFansubGroupId((current) => ({
            ...current,
            [contextKey]: false,
          }));
        }
      }
    },
    [
      fansubID,
      hasAuthSession,
      releasesByAnimeFansubGroupId,
      releasesLoadingByAnimeFansubGroupId,
    ],
  );

  const toggleRelease = useCallback(
    (release: AdminFansubRelease) => {
      setExpandedReleaseIds((current) => {
        if (current.has(release.release_id)) {
          return new Set();
        }
        void loadReleaseSegmentCards(release);
        return new Set([release.release_id]);
      });
    },
    [loadReleaseSegmentCards],
  );

  const handleReleaseRowsScroll = useCallback(
    (releaseGroup: FansubReleaseGroup, event: UIEvent<HTMLDivElement>) => {
      const contextKey = releaseGroup.key;
      const target = event.currentTarget;
      if (target.scrollTop + target.clientHeight < target.scrollHeight - 40)
        return;

      const pagination = releasePaginationByAnimeFansubGroupId[contextKey];
      const isLoading = Boolean(
        releasesLoadingByAnimeFansubGroupId[contextKey],
      );
      if (!pagination || isLoading || pagination.page >= pagination.totalPages)
        return;

      void loadAnimeReleases(releaseGroup, true, pagination.page + 1, true);
    },
    [
      loadAnimeReleases,
      releasePaginationByAnimeFansubGroupId,
      releasesLoadingByAnimeFansubGroupId,
    ],
  );

  const refreshAnimeCoverage = useCallback(async () => {
    try {
      const response = await getAnimeCoverage(fansubID);
      setAnimeCoverageMap(buildAnimeCoverageMap(response.data));
    } catch {
      // Ein Coverage-Refresh ist nur eine Anzeigeaktualisierung; Speichern bleibt erfolgreich.
    }
  }, [fansubID]);

  const expandAnimeKey = useCallback((key: string) => {
    setExpandedAnimeKeys((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }, []);

  const invalidateReleaseDataRequests = useCallback(() => {
    releaseRequestSeqRef.current += 1;
    releaseSegmentRequestSeqRef.current += 1;
    releaseRequestByContextRef.current = {};
    releaseSegmentRequestByReleaseRef.current = {};
  }, []);

  const resetReleaseDataState = useCallback(() => {
    setReleasesByAnimeFansubGroupId({});
    setReleasesLoadingByAnimeFansubGroupId({});
    setReleasesErrorsByAnimeFansubGroupId({});
    setReleasePaginationByAnimeFansubGroupId({});
    setExpandedAnimeKeys(new Set());
    setExpandedReleaseIds(new Set());
    setReleaseSegmentCards({});
    setReleaseSegmentLoading({});
    setReleaseSegmentErrors({});
    setSelectedReleaseSegment(null);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0 || !hasAuthSession) {
      setReleaseGroups([]);
      setReleaseGroupsError(null);
      setReleaseGroupsLoading(false);
      resetReleaseWorkspaceState();
      return;
    }

    let active = true;
    setReleaseGroupsLoading(true);
    setReleaseGroupsError(null);
    setAnimeCoverageMap(null);
    resetReleaseWorkspaceState();

    Promise.all([
      getAdminFansubAnime(fansubID),
      getAnimeCoverage(fansubID).catch(() => null),
    ])
      .then(([animeResponse, coverageResponse]) => {
        if (!active) return;
        setReleaseGroups(
          animeResponse.data.map((anime) => ({
            key: animeFansubReleaseContextKey(fansubID, anime.id),
            anime,
          })),
        );
        if (coverageResponse) {
          setAnimeCoverageMap(buildAnimeCoverageMap(coverageResponse.data));
        }
      })
      .catch((nextError) => {
        if (!active) return;
        setReleaseGroups([]);
        setReleaseGroupsError(errMessage(nextError));
      })
      .finally(() => {
        if (active) setReleaseGroupsLoading(false);
      });

    return () => {
      active = false;
      invalidateReleaseWorkspaceRequests();
    };
  }, [
    hasAuthSession,
    fansubID,
    resetReleaseWorkspaceState,
    invalidateReleaseWorkspaceRequests,
  ]);

  return {
    // State
    releaseGroups,
    setReleaseGroups,
    releaseGroupsLoading,
    setReleaseGroupsLoading,
    releaseGroupsError,
    setReleaseGroupsError,
    animeCoverageMap,
    setAnimeCoverageMap,
    releasesByAnimeFansubGroupId,
    releasesLoadingByAnimeFansubGroupId,
    releasesErrorsByAnimeFansubGroupId,
    releasePaginationByAnimeFansubGroupId,
    expandedAnimeKeys,
    setExpandedAnimeKeys,
    expandedReleaseIds,
    setExpandedReleaseIds,
    releaseSegmentCards,
    setReleaseSegmentCards,
    releaseSegmentLoading,
    releaseSegmentErrors,
    setReleaseSegmentErrors,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
    cockpitFilter,
    setCockpitFilter,
    visibleReleaseGroups,
    // Loaders / handlers
    loadReleaseSegmentCards,
    loadAnimeReleases,
    toggleRelease,
    handleReleaseRowsScroll,
    refreshAnimeCoverage,
    expandAnimeKey,
    // Reset / invalidate
    invalidateReleaseDataRequests,
    resetReleaseDataState,
  };
}
