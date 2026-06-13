"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Users,
  X,
} from "lucide-react";

import {
  getAdminFansubAnime,
  getAdminFansubAnimeReleases,
  getAdminAnimeThemes,
  getAdminAnimeThemeSegments,
  getAdminReleaseThemeAssets,
  getAnimeCoverage,
  getFansubAliases,
  getFansubByID,
  listAnimeContributions,
  listUnifiedGroupMembers,
  type AnimeCoverage,
} from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  FansubGroupCapabilities,
  FansubGroup,
  AnimeContribution,
  UnifiedGroupMember,
  FANSUB_GROUP_ROLE_OPTIONS,
} from "@/types/fansub";
import { AdminFansubAnimeEntry } from "@/types/admin";
import { AdminFansubRelease } from "@/types/fansub";
import {
  buildFansubLogoFallback,
  buildMediaPreviewURL,
} from "@/components/admin/MediaUpload";
import {
  Badge,
  Button,
} from "@/components/ui";
import AnimeContributionModal from "./AnimeContributionModal";
import { AnimeReleasesFilterBar, type CockpitFilter } from "./AnimeReleasesFilterBar";
import { ProjectCockpitBadges } from "./ProjectCockpitBadges";
import { AnimeProjectNoteWorkspace } from "./AnimeProjectNoteWorkspace";
import {
  CoverageMatrix,
  type RoleDefinition,
  type ProjectCoverageRow,
} from "./CoverageMatrix";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { parseMainTab } from "./mainTabRouting";
import { ReadinessTab } from "./ReadinessTab";
import { ContributionsReviewSection } from "./ContributionsReviewSection";
import { UserSuggestionsInbox } from "./UserSuggestionsInbox";
import { ReleaseContributionDrawer } from "./ReleaseContributionDrawer";
import { FansubDetailsTab } from "./FansubDetailsTab";
import { useFansubDetailsForm } from "./useFansubDetailsForm";
import { ReleaseMediaDrawer } from "./ReleaseMediaDrawer";
import { useReleaseMediaDrawer } from "./useReleaseMediaDrawer";
import type {
  ContributionModalAnime,
  FansubReleaseGroup,
  MainTab,
  ReleasePaginationState,
  ReleaseSegmentCard,
  SectionKey,
  SelectedReleaseSegment,
} from "./fansubEditTypes";
import {
  compactThemeKind,
  errMessage,
  formatAnimeTypeLabel,
  labelForFansubStatus,
  parseClockSeconds,
  releaseTimelineMaxSeconds,
  resolveCoverUrl,
  timelineLabelFor,
  timelineStatusLabelFor,
} from "./fansubEditFormatters";
import {
  animeFansubReleaseContextKey,
  buildAnimeCoverageMap,
  groupContributionMembersByRole,
  mapReleaseSegmentCards,
} from "./fansubEditReleaseHelpers";
import {
  canEditReleaseNotes,
  canUploadReleaseMedia,
  canUseMainTab,
  canViewReleaseContributors,
  canViewReleaseMedia,
  readFansubIDFromParams,
  releaseVersionToolsTarget,
  resolveMainTabForAccess,
  visibleMainTabs,
} from "./fansubEditAccess";
import { FansubEditAccessGate } from "./FansubEditAccessGate";
import sharedStyles from "../../../admin.module.css";
import fansubEditStyles from "./FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

const RELEASE_PAGE_SIZE = 30;

// MAIN_TABS und parseMainTab werden aus mainTabRouting.ts importiert (testbar ohne page.tsx-Kontext)

function AdminFansubEditContent({
  fansubID,
  isPlatformAdmin,
  capabilities,
}: {
  fansubID: number;
  isPlatformAdmin: boolean;
  capabilities: FansubGroupCapabilities | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainTabFromQuery = parseMainTab(searchParams.get("tab"));
  const initialMainTab = resolveMainTabForAccess(
    mainTabFromQuery,
    isPlatformAdmin,
    capabilities,
  );
  const [group, setGroup] = useState<FansubGroup | null>(null);
  const [releaseGroups, setReleaseGroups] = useState<FansubReleaseGroup[]>([]);
  const [releaseGroupsLoading, setReleaseGroupsLoading] = useState(false);
  const [releaseGroupsError, setReleaseGroupsError] = useState<string | null>(
    null,
  );
  // Gap-82-07: Coverage-Aggregat: null = noch nicht geladen (D-12: kein falsches "fehlt")
  const [animeCoverageMap, setAnimeCoverageMap] = useState<Map<number, AnimeCoverage> | null>(null);
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
  const [releasePaginationByAnimeFansubGroupId, setReleasePaginationByAnimeFansubGroupId] =
    useState<Record<string, ReleasePaginationState>>({});
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialMainTab);
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
  const [cockpitFilter, setCockpitFilter] = useState<CockpitFilter>('all');
  const catalogRoles = useMemo<RoleDefinition[]>(
    () =>
      FANSUB_GROUP_ROLE_OPTIONS
        .filter((role) => role.code !== "fansub_lead")
        .map((role, index) => ({
          code: role.code,
          label: role.label,
          sort_order: index + 1,
        })),
    [],
  );
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
  const [contributionDrawerOpen, setContributionDrawerOpen] = useState(false);
  const [contributionDrawerVersionId, setContributionDrawerVersionId] = useState<number | null>(null);
  const [contributionDrawerAnimeId, setContributionDrawerAnimeId] = useState<number | null>(null);
  const [contributionDrawerTitle, setContributionDrawerTitle] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      basic: true,
      media: true,
      links: true,
      collaboration: true,
      releases: true,
      notes: true,
      mitglieder: true,
      claims: true,
      vorschlaege: true,
      readiness: true,
    },
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const releaseRequestSeqRef = useRef(0);
  const releaseRequestByContextRef = useRef<Record<string, number>>({});
  const releaseSegmentRequestSeqRef = useRef(0);
  const releaseSegmentRequestByReleaseRef = useRef<Record<number, number>>({});
  const { hasAccessToken, hasRefreshToken, isClientInitialized } =
    useAuthSession();
  const hasAuthSession = hasAccessToken || hasRefreshToken;
  const handleDetailsToast = useCallback((message: string) => {
    setToast(message);
  }, []);
  const handleDetailsError = useCallback((message: string | null) => {
    setError(message);
  }, []);
  const handleDetailsGroupUpdated = useCallback((nextGroup: FansubGroup) => {
    setGroup(nextGroup);
  }, []);
  const details = useFansubDetailsForm({
    fansubID,
    isPlatformAdmin,
    hasAuthSession,
    onGroupUpdated: handleDetailsGroupUpdated,
    onToast: handleDetailsToast,
    onError: handleDetailsError,
  });
  const { form, logoMedia, bannerMedia, applyGroup, setAliasesFromLoad } =
    details;
  const availableMainTabs = useMemo(
    () => visibleMainTabs(isPlatformAdmin, capabilities),
    [capabilities, isPlatformAdmin],
  );
  const canOpenReleaseContributors = canViewReleaseContributors(
    isPlatformAdmin,
    capabilities,
  );
  const canManageReleaseThemeAssets = canUploadReleaseMedia(
    isPlatformAdmin,
    capabilities,
  );
  const canUseReleaseMedia = canViewReleaseMedia(
    isPlatformAdmin,
    capabilities,
  );
  const canUseReleaseNotes = canEditReleaseNotes(
    isPlatformAdmin,
    capabilities,
  );
  const canUseProjectNotes = canUseMainTab("notes", isPlatformAdmin, capabilities);
  const canUseAdminReleaseDetails = isPlatformAdmin;
  const canOpenReleaseDrawer =
    canUseAdminReleaseDetails || canUseReleaseMedia;

  const loadReleaseSegmentCards = async (
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
  };

  const drawer = useReleaseMediaDrawer({
    hasAuthSession,
    canOpenReleaseDrawer,
    canUseAdminReleaseDetails,
    canManageReleaseThemeAssets,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
    releaseSegmentCards,
    setReleaseSegmentCards,
    setReleaseSegmentErrors,
    setExpandedReleaseIds,
    loadReleaseSegmentCards,
    onToast: handleDetailsToast,
  });
  const { openReleaseDrawer, openThemeDrawer } = drawer;

  useEffect(() => {
    const nextTab = resolveMainTabForAccess(
      mainTabFromQuery,
      isPlatformAdmin,
      capabilities,
    );
    setActiveMainTab((current) =>
      current === nextTab ? current : nextTab,
    );
  }, [capabilities, isPlatformAdmin, mainTabFromQuery]);

  const handleMainTabChange = useCallback(
    (tab: MainTab) => {
      if (!canUseMainTab(tab, isPlatformAdmin, capabilities)) return;
      setActiveMainTab(tab);

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (tab === "basic") {
        nextSearchParams.delete("tab");
      } else {
        nextSearchParams.set("tab", tab);
      }

      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [capabilities, isPlatformAdmin, pathname, router, searchParams],
  );

  const { resetDrawerState, invalidateDrawerRequests } = drawer;

  const invalidateReleaseWorkspaceRequests = useCallback(() => {
    releaseRequestSeqRef.current += 1;
    releaseSegmentRequestSeqRef.current += 1;
    releaseRequestByContextRef.current = {};
    releaseSegmentRequestByReleaseRef.current = {};
    invalidateDrawerRequests();
  }, [invalidateDrawerRequests]);

  const resetReleaseWorkspaceState = useCallback(() => {
    invalidateReleaseWorkspaceRequests();
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
    setContributionModalAnime(null);
    setContributionMembers([]);
    setContributionModalRows([]);
    setAnimeContributionRowsByAnimeId({});
    setContributionModalLoadingAnimeId(null);
    setContributionModalError(null);
    resetDrawerState();
  }, [invalidateReleaseWorkspaceRequests, resetDrawerState]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      setError("Ungültige Fansub-ID.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([getFansubByID(fansubID), getFansubAliases(fansubID)])
      .then(([groupResponse, aliasResponse]) => {
        if (!active) return;
        const nextGroup = groupResponse.data;
        setGroup(nextGroup);
        applyGroup(nextGroup);
        setAliasesFromLoad(aliasResponse.data);
      })
      .catch((nextError) => {
        if (active) setError(errMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fansubID, applyGroup, setAliasesFromLoad]);

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

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const isSectionOpen = (section: SectionKey): boolean =>
    isMobile ? openSections[section] : true;
  const onSectionToggle = (section: SectionKey, open: boolean) => {
    if (!isMobile) return;
    setOpenSections((current) => ({ ...current, [section]: open }));
  };

  const loadAnimeReleases = async (
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
  };

  const toggleRelease = (release: AdminFansubRelease) => {
    setExpandedReleaseIds((current) => {
      const next = new Set(current);
      if (next.has(release.release_id)) {
        next.delete(release.release_id);
      } else {
        next.add(release.release_id);
        void loadReleaseSegmentCards(release);
      }
      return next;
    });
  };

  const handleReleaseRowsScroll = (
    releaseGroup: FansubReleaseGroup,
    event: UIEvent<HTMLDivElement>,
  ) => {
    const contextKey = releaseGroup.key;
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight < target.scrollHeight - 40)
      return;

    const pagination = releasePaginationByAnimeFansubGroupId[contextKey];
    const isLoading = Boolean(releasesLoadingByAnimeFansubGroupId[contextKey]);
    if (!pagination || isLoading || pagination.page >= pagination.totalPages)
      return;

    void loadAnimeReleases(releaseGroup, true, pagination.page + 1, true);
  };

  const rememberAnimeContributionRows = (
    animeID: number,
    rows: AnimeContribution[],
  ) => {
    setAnimeContributionRowsByAnimeId((current) => ({
      ...current,
      [animeID]: rows,
    }));
  };

  const loadAnimeContributionRows = async (animeID: number) => {
    try {
      const response = await listAnimeContributions(fansubID, animeID);
      const rows = response.data ?? [];
      rememberAnimeContributionRows(animeID, rows);
      return rows;
    } catch {
      return animeContributionRowsByAnimeId[animeID] ?? [];
    }
  };

  const refreshAnimeCoverage = async () => {
    try {
      const response = await getAnimeCoverage(fansubID);
      setAnimeCoverageMap(buildAnimeCoverageMap(response.data));
    } catch {
      // Ein Coverage-Refresh ist nur eine Anzeigeaktualisierung; Speichern bleibt erfolgreich.
    }
  };

  const toggleAnime = (releaseGroup: FansubReleaseGroup) => {
    setExpandedAnimeKeys((current) => {
      const next = new Set(current);
      if (next.has(releaseGroup.key)) {
        next.delete(releaseGroup.key);
      } else {
        next.add(releaseGroup.key);
        void loadAnimeReleases(releaseGroup);
        void loadAnimeContributionRows(releaseGroup.anime.id);
      }
      return next;
    });
  };

  const openAnimeProjectNote = (releaseGroup: FansubReleaseGroup) => {
    setExpandedAnimeKeys((current) => {
      if (current.has(releaseGroup.key)) return current;
      const next = new Set(current);
      next.add(releaseGroup.key);
      return next;
    });
    void loadAnimeReleases(releaseGroup);
    void loadAnimeContributionRows(releaseGroup.anime.id);
  };

  const openAnimeContributions = async (
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
      setContributionModalAnime({ id: anime.id, title: anime.title, focusedRoleCode });
    } catch (nextError) {
      setContributionModalError(errMessage(nextError));
    } finally {
      setContributionModalLoadingAnimeId(null);
    }
  };

  const openContributionDrawer = (versionId: number, animeId: number, title: string) => {
    setContributionDrawerVersionId(versionId);
    setContributionDrawerAnimeId(animeId);
    setContributionDrawerTitle(title);
    setContributionDrawerOpen(true);
  };

  const refreshAnimeContributions = async (animeID: number) => {
    try {
      const response = await listAnimeContributions(fansubID, animeID);
      const rows = response.data ?? [];
      setContributionModalRows(rows);
      rememberAnimeContributionRows(animeID, rows);
    } catch {
      // Der Speichervorgang selbst war erfolgreich; ein Refresh-Fehler ist nicht kritisch.
    }
    void refreshAnimeCoverage();
  };

  const logoFallback = buildFansubLogoFallback(form.name);
  const bannerPreviewURL = buildMediaPreviewURL(bannerMedia);
  const logoPreviewURL = buildMediaPreviewURL(logoMedia);

  if (loading)
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p>Lade...</p>
        </section>
      </main>
    );

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        {isPlatformAdmin ? (
          <>
            <Link href="/admin">Admin</Link> /{" "}
            <Link href="/admin/fansubs">Fansubs</Link>
          </>
        ) : (
          <>
            <Link href="/manage/groups">Meine Gruppen</Link> /{" "}
            <span>{form.name.trim() || "Gruppe"}</span>
          </>
        )}
      </p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <section className={`${styles.panel} ${styles.fansubEditWorkspacePanel}`}>
        <header className={styles.fansubEditHeaderCard}>
          <div className={styles.fansubEditBannerShell}>
            {bannerPreviewURL ? (
              <div className={styles.fansubEditBannerImage}>
                <Image
                  src={bannerPreviewURL}
                  alt=""
                  className={styles.fansubEditBannerImageElement}
                  width={1200}
                  height={220}
                  unoptimized
                />
              </div>
            ) : (
              <div className={styles.fansubEditBannerPlaceholder}>
                Kein Banner vorhanden
              </div>
            )}
          </div>
          <div className={styles.fansubEditProfileRow}>
            <div className={styles.fansubEditLogoBadge}>
              {logoPreviewURL ? (
                <Image
                  src={logoPreviewURL}
                  alt={`${form.name.trim() || "Fansub"} Logo`}
                  className={styles.fansubEditLogoImage}
                  width={78}
                  height={78}
                  unoptimized
                />
              ) : (
                <span
                  style={{
                    backgroundColor: logoFallback.background,
                    color: logoFallback.color,
                  }}
                >
                  {logoFallback.initials}
                </span>
              )}
            </div>
            <div className={styles.fansubEditIdentity}>
              <div className={styles.fansubEditIdentityTop}>
                <h1 className={styles.title}>
                  {form.name.trim() || "Fansub bearbeiten"}
                </h1>
                <span
                  className={`${styles.fansubEditStatusBadge} ${form.status === "active" ? styles.fansubEditStatusActive : form.status === "inactive" ? styles.fansubEditStatusInactive : styles.fansubEditStatusDissolved}`}
                >
                  {labelForFansubStatus(form.status)}
                </span>
              </div>
              {isPlatformAdmin ? (
                <p className={styles.fansubEditUrlPreview}>
                  /fansubs/{form.slug.trim() || "slug"}
                </p>
              ) : null}
            </div>
          </div>
          <nav
            className={styles.fansubEditMainTabRow}
            aria-label="Fansub Bearbeitungsbereiche"
          >
            {availableMainTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.fansubEditMainTabButton} ${activeMainTab === tab.key ? styles.fansubEditMainTabButtonActive : ""}`}
                onClick={() => handleMainTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeMainTab !== "releases" &&
        activeMainTab !== "notes" &&
        activeMainTab !== "vorschlaege" &&
        activeMainTab !== "readiness" ? (
          <FansubDetailsTab
            styles={styles}
            details={details}
            fansubID={fansubID}
            group={group}
            capabilities={capabilities}
            isPlatformAdmin={isPlatformAdmin}
            hasAuthSession={hasAuthSession}
            isClientInitialized={isClientInitialized}
            activeMainTab={activeMainTab}
            error={error}
            onToast={handleDetailsToast}
            isSectionOpen={isSectionOpen}
            onSectionToggle={onSectionToggle}
          />
        ) : null}
        {activeMainTab === "releases" ? (
          <details
            className={styles.fansubEditSection}
            open={isSectionOpen("releases")}
            onToggle={(event) =>
              onSectionToggle("releases", event.currentTarget.open)
            }
          >
            <summary className={styles.fansubEditSectionSummary}>
              Anime & Veröffentlichungen
            </summary>
            <div className={styles.fansubEditSectionBody}>
              {releaseGroupsLoading ? (
                <div className={styles.fansubEditReleaseState}>
                  Anime werden geladen...
                </div>
              ) : null}
              {releaseGroupsError ? (
                <div className={styles.errorBox}>{releaseGroupsError}</div>
              ) : null}
              {contributionModalError ? (
                <div className={styles.errorBox}>{contributionModalError}</div>
              ) : null}
              {!releaseGroupsLoading && !releaseGroupsError ? (
                <AnimeReleasesFilterBar
                  activeFilter={cockpitFilter}
                  onFilterChange={setCockpitFilter}
                />
              ) : null}
              {!releaseGroupsLoading &&
              !releaseGroupsError &&
              releaseGroups.length === 0 ? (
                <div className={styles.fansubEditReleaseState}>
                  Noch keine Anime/Releases mit dieser Fansubgruppe verknüpft.
                </div>
              ) : null}
              {!releaseGroupsLoading &&
              !releaseGroupsError &&
              releaseGroups.length > 0 &&
              visibleReleaseGroups.length === 0 ? (
                <div className={styles.fansubEditReleaseState}>
                  Keine Projekte passen zum gewählten Filter.
                </div>
              ) : null}
              <div className={styles.fansubEditReleaseList}>
                {visibleReleaseGroups.map((releaseGroup) => {
                  const animeExpanded = expandedAnimeKeys.has(releaseGroup.key);
                  const releasesLoaded = Object.prototype.hasOwnProperty.call(
                    releasesByAnimeFansubGroupId,
                    releaseGroup.key,
                  );
                  const releases =
                    releasesByAnimeFansubGroupId[releaseGroup.key] ?? [];
                  const releasesLoading = Boolean(
                    releasesLoadingByAnimeFansubGroupId[releaseGroup.key],
                  );
                  const releasesError =
                    releasesErrorsByAnimeFansubGroupId[releaseGroup.key];
                  const releasePagination =
                    releasePaginationByAnimeFansubGroupId[releaseGroup.key];
                  const hasMoreReleases = Boolean(
                    releasePagination &&
                      releasePagination.page < releasePagination.totalPages,
                  );
                  const releaseCountLabel = releasesLoaded
                    ? releasePagination
                      ? `Releases: ${releases.length}/${releasePagination.total}`
                      : `Releases: ${releases.length}`
                    : "Releases";
                  const animeHeaderVisual = (
                    releaseGroup.anime.header_image || ""
                  ).trim();
                  const animeVisualUrl = resolveCoverUrl(
                    animeHeaderVisual || releaseGroup.anime.cover_image,
                  );
                  const useLandscapeVisual = Boolean(
                    (animeVisualUrl || "").trim(),
                  );
                  const animeTypeLabel = formatAnimeTypeLabel(
                    releaseGroup.anime.type,
                  );
                  const animeCoverage = animeCoverageMap?.get(
                    releaseGroup.anime.id,
                  );
                  const animeContributionRows =
                    animeContributionRowsByAnimeId[releaseGroup.anime.id] ??
                    [];
                  const roleMembersByCode =
                    groupContributionMembersByRole(animeContributionRows);
                  return (
                    <article
                      key={releaseGroup.key}
                      className={styles.fansubEditAnimeReleaseCard}
                    >
                      <div className={styles.fansubEditAnimeReleaseHeaderRow}>
                        <button
                          type="button"
                          className={styles.fansubEditAnimeReleaseHeader}
                          onClick={() => toggleAnime(releaseGroup)}
                          aria-expanded={animeExpanded}
                          aria-label={
                            animeExpanded
                              ? `${releaseGroup.anime.title} einklappen`
                              : `${releaseGroup.anime.title} ausklappen`
                          }
                        >
                          <Image
                            src={animeVisualUrl}
                            alt=""
                            className={
                              useLandscapeVisual
                                ? styles.fansubEditAnimeLandscape
                                : styles.fansubEditAnimePoster
                            }
                            width={useLandscapeVisual ? 176 : 108}
                            height={useLandscapeVisual ? 100 : 152}
                            unoptimized
                          />
                          <div className={styles.fansubEditAnimeReleaseBody}>
                            <h3>{releaseGroup.anime.title}</h3>
                            {animeTypeLabel ? (
                              <span className={styles.fansubEditAnimeReleaseType}>
                                {animeTypeLabel}
                              </span>
                            ) : null}
                            <span className={styles.fansubEditAnimeReleaseCount}>
                              {releaseCountLabel}
                            </span>
                            <ProjectCockpitBadges
                              contributionCount={animeCoverageMap === null
                                ? null
                                : (animeCoverage?.member_count ?? 0)}
                              hasProjectNote={animeCoverageMap === null
                                ? undefined
                                : Boolean(animeCoverage?.has_project_note)}
                            />
                          </div>
                          <span
                            className={styles.fansubEditAnimeToggle}
                            aria-hidden="true"
                          >
                            {animeExpanded ? (
                              <ChevronDown size={34} strokeWidth={2.6} />
                            ) : (
                              <ChevronRight size={34} strokeWidth={2.6} />
                            )}
                          </span>
                        </button>
                        <div className={styles.fansubEditAnimeReleaseActions}>
                          {canUseProjectNotes ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              leftIcon={<FileText size={16} />}
                              className={styles.fansubEditAnimeContributorsButton}
                              onClick={() => openAnimeProjectNote(releaseGroup)}
                            >
                              Einblick
                            </Button>
                          ) : null}
                          {canOpenReleaseContributors ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              leftIcon={<Users size={16} />}
                              className={styles.fansubEditAnimeContributorsButton}
                              loading={
                                contributionModalLoadingAnimeId ===
                                releaseGroup.anime.id
                              }
                              onClick={() =>
                                void openAnimeContributions(releaseGroup.anime)
                              }
                            >
                              Mitwirkende
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {animeExpanded && canUseProjectNotes ? (
                        <section className={styles.fansubEditProjectInsightPanel}>
                          <AnimeProjectNoteWorkspace
                            fansubId={fansubID}
                            animeId={releaseGroup.anime.id}
                            expanded={animeExpanded}
                          />
                        </section>
                      ) : null}
                      {animeExpanded ? (
                        <section className={styles.fansubEditProjectTeamPanel}>
                          <div className={styles.fansubEditProjectPanelHeader}>
                            <h4>Team & Rollen</h4>
                          </div>
                          <CoverageMatrix
                            roles={catalogRoles}
                            showProjectTitle={false}
                            rows={[
                              {
                                animeId: releaseGroup.anime.id,
                                animeTitle: releaseGroup.anime.title,
                                coveredRoleCodes:
                                  animeCoverage?.covered_role_codes ?? [],
                                roleMembersByCode,
                              } satisfies ProjectCoverageRow,
                            ]}
                            onCellClick={(_, roleCode) =>
                              void openAnimeContributions(releaseGroup.anime, roleCode)
                            }
                          />
                        </section>
                      ) : null}
                      {animeExpanded ? (
                        <div className={`${styles.fansubEditProjectPanelHeader} ${styles.fansubEditProjectReleasesHeader}`}>
                          <h4>Releases</h4>
                        </div>
                      ) : null}
                      {animeExpanded && releasesLoading ? (
                        <div className={styles.fansubEditReleaseState}>
                          Releases werden geladen...
                        </div>
                      ) : null}
                      {animeExpanded && releasesError ? (
                        <div className={styles.errorBox}>{releasesError}</div>
                      ) : null}
                      {animeExpanded &&
                      releasesLoaded &&
                      !releasesLoading &&
                      !releasesError &&
                      releases.length === 0 ? (
                        <p className={styles.fansubEditHint}>
                          Anime ist verknüpft, aber es gibt noch keine
                          Release-Version für diese Gruppe.
                        </p>
                      ) : null}
                      {animeExpanded &&
                      !releasesError &&
                      releases.length > 0 ? (
                        <div className={styles.fansubEditReleaseRows}>
                          <div
                            className={styles.fansubEditReleaseRowsScroller}
                            onScroll={(event) =>
                              handleReleaseRowsScroll(
                                releaseGroup,
                                event,
                              )
                            }
                          >
                            <div
                              className={styles.fansubEditReleaseTableHeader}
                            >
                              <span>Episode</span>
                              <span>Titel</span>
                              <span>Version</span>
                              <span>Themes</span>
                              <span>Aktionen</span>
                              <span />
                            </div>
                            {releases.map((release, releaseIndex) => {
                              const expanded = expandedReleaseIds.has(
                                release.release_id,
                              );
                              const releaseVersionTools =
                                releaseVersionToolsTarget(
                                  release.release_version_id,
                                  {
                                    canViewMedia: canUseReleaseMedia,
                                    canEditNotes: canUseReleaseNotes,
                                  },
                                );
                              const cards =
                                releaseSegmentCards[release.release_id] ?? [];
                              const cardsLoading =
                                releaseSegmentLoading[release.release_id];
                              const cardsError =
                                releaseSegmentErrors[release.release_id];
                              const timelineMaxSeconds =
                                releaseTimelineMaxSeconds(release, cards);

                              return (
                                <div
                                  key={`${releaseGroup.key}:${release.release_id}:${releaseIndex}`}
                                  className={styles.fansubEditReleaseItem}
                                >
                                  <div
                                    className={styles.fansubEditReleaseRow}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleRelease(release)}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        toggleRelease(release);
                                      }
                                    }}
                                    aria-expanded={expanded}
                                    aria-label={
                                      expanded
                                        ? `Release ${release.release_id} einklappen`
                                        : `Release ${release.release_id} ausklappen`
                                    }
                                  >
                                    <strong>
                                      {release.episode_number || "?"}
                                    </strong>
                                    <button
                                      type="button"
                                      className={
                                        styles.fansubEditReleaseTitleButton
                                      }
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleRelease(release);
                                      }}
                                      aria-expanded={expanded}
                                      aria-label={
                                        expanded
                                          ? `Release ${release.release_id} einklappen`
                                          : `Release ${release.release_id} ausklappen`
                                      }
                                    >
                                      <div
                                        className={
                                          styles.fansubEditReleaseTitleCell
                                        }
                                      >
                                        <span>
                                          {(
                                            release.episode_title || ""
                                          ).trim() || "Ohne Episodentitel"}
                                        </span>
                                      </div>
                                      <span
                                        className={
                                          styles.fansubEditReleaseTitleDisclosure
                                        }
                                        aria-hidden="true"
                                      >
                                        {expanded ? (
                                          <ChevronDown
                                            size={16}
                                            strokeWidth={2.2}
                                          />
                                        ) : (
                                          <ChevronRight
                                            size={16}
                                            strokeWidth={2.2}
                                          />
                                        )}
                                      </span>
                                    </button>
                                    <span>{release.version_count}</span>
                                    <span>
                                      {release.has_theme_assets ? (
                                        "Vorhanden"
                                      ) : (
                                        <span
                                          className={
                                            styles.fansubEditThemeMissingMark
                                          }
                                        >
                                          <X size={20} strokeWidth={3.2} />
                                        </span>
                                      )}
                                    </span>
                                    <div
                                      className={
                                        styles.fansubEditReleaseActions
                                      }
                                    >
                                      {releaseVersionTools ? (
                                        <Button
                                          href={releaseVersionTools.href}
                                          variant="secondary"
                                          size="sm"
                                          leftIcon={
                                            <ExternalLink size={15} />
                                          }
                                          onClick={(event) =>
                                            event.stopPropagation()
                                          }
                                        >
                                          {releaseVersionTools.label}
                                        </Button>
                                      ) : null}
                                      {canOpenReleaseDrawer ? (
                                        <button
                                          type="button"
                                          className={`${styles.button} ${styles.fansubEditReleaseEditButton}`}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openReleaseDrawer({
                                              release,
                                              animeID: releaseGroup.anime.id,
                                              fansubGroupID:
                                                release.fansub_group_id,
                                              contextKey: releaseGroup.key,
                                            });
                                          }}
                                        >
                                          {canUseAdminReleaseDetails
                                            ? "Editieren"
                                            : "Medien"}
                                        </button>
                                      ) : null}
                                      <Badge
                                        variant={
                                          release.has_override === true
                                            ? 'info'
                                            : release.has_override === false
                                              ? 'muted'
                                              : 'warning'
                                        }
                                      >
                                        {release.has_override === true
                                          ? 'Eigene Besetzung'
                                          : release.has_override === false
                                            ? 'Projektteam'
                                            : 'Mitwirkende fehlen'}
                                      </Badge>
                                      {canOpenReleaseContributors ? (
                                        <Button
                                          type="button"
                                          variant="subtle"
                                          size="sm"
                                          leftIcon={<Users size={15} />}
                                          aria-label={`Rollen und Personen für ${release.episode_title ?? `Release-Version ${release.release_version_id}`} bearbeiten`}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openContributionDrawer(
                                              release.release_version_id,
                                              releaseGroup.anime.id,
                                              release.episode_title ?? `Release-Version ${release.release_version_id}`,
                                            );
                                          }}
                                        >
                                          Rollen & Personen
                                        </Button>
                                      ) : null}
                                    </div>
                                    <span
                                      className={
                                        styles.fansubEditReleaseRowDisclosure
                                      }
                                      aria-hidden="true"
                                    >
                                      {expanded ? (
                                        <ChevronDown
                                          size={24}
                                          strokeWidth={2.4}
                                        />
                                      ) : (
                                        <ChevronRight
                                          size={24}
                                          strokeWidth={2.4}
                                        />
                                      )}
                                    </span>
                                  </div>
                                  {expanded ? (
                                    <div
                                      className={
                                        styles.fansubEditReleaseExpanded
                                      }
                                    >
                                      {canOpenReleaseContributors ? (
                                        <div className={styles.fansubEditReleaseAssignmentPanel}>
                                          <div className={styles.fansubEditReleaseAssignmentCopy}>
                                            <strong>Rollen & Personen dieser Folge</strong>
                                            <span>
                                              {release.has_override
                                                ? "Eigene Release-Besetzung aktiv"
                                                : "Aktuell wird das Projektteam verwendet"}
                                            </span>
                                          </div>
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            leftIcon={<Users size={16} />}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openContributionDrawer(
                                                release.release_version_id,
                                                releaseGroup.anime.id,
                                                release.episode_title ?? `Release-Version ${release.release_version_id}`,
                                              );
                                            }}
                                          >
                                            Rollen & Personen bearbeiten
                                          </Button>
                                        </div>
                                      ) : null}
                                      <div
                                        className={
                                          styles.fansubEditReleaseExpandedHeader
                                        }
                                      >
                                        <div>
                                          <h4>Theme-Segmente</h4>
                                        </div>
                                      </div>
                                      {cardsLoading ? (
                                        <div
                                          className={
                                            styles.fansubEditReleaseState
                                          }
                                        >
                                          Theme-Segmente werden geladen...
                                        </div>
                                      ) : null}
                                      {cardsError ? (
                                        <div className={styles.errorBox}>
                                          {cardsError}
                                        </div>
                                      ) : null}
                                      {!cardsLoading &&
                                      !cardsError &&
                                      cards.length === 0 ? (
                                        <div
                                          className={
                                            styles.fansubEditReleaseState
                                          }
                                        >
                                          Noch keine Theme-Definitionen für
                                          diesen Anime vorhanden.
                                        </div>
                                      ) : null}
                                      {cards.length > 0 ? (
                                        <div
                                          className={styles.fansubEditTimeline}
                                        >
                                          <div
                                            className={
                                              styles.fansubEditTimelineLegend
                                            }
                                            aria-label="Timeline Legende"
                                          >
                                            <span
                                              className={
                                                styles.fansubEditTimelineLegendItem
                                              }
                                            >
                                              <span
                                                className={`${styles.fansubEditTimelineLegendBadge} ${styles.fansubEditTimelineLegendBadgeGlobal}`}
                                              >
                                                Global
                                              </span>
                                            </span>
                                            <span
                                              className={
                                                styles.fansubEditTimelineLegendItem
                                              }
                                            >
                                              <span
                                                className={`${styles.fansubEditTimelineLegendBadge} ${styles.fansubEditTimelineLegendBadgeRelease}`}
                                              >
                                                Uploadet
                                              </span>
                                            </span>
                                            <span
                                              className={
                                                styles.fansubEditTimelineLegendItem
                                              }
                                            >
                                              <span
                                                className={`${styles.fansubEditTimelineLegendBadge} ${styles.fansubEditTimelineLegendBadgeMissing}`}
                                              >
                                                Fehlt
                                              </span>
                                            </span>
                                          </div>
                                          <div
                                            className={
                                              styles.fansubEditTimelineScale
                                            }
                                          >
                                            <span>
                                              Dauer{" "}
                                              {new Date(
                                                timelineMaxSeconds * 1000,
                                              )
                                                .toISOString()
                                                .slice(11, 19)}
                                            </span>
                                          </div>
                                          <div
                                            className={
                                              styles.fansubEditTimelineTrack
                                            }
                                          >
                                            <div
                                              className={
                                                styles.fansubEditTimelineMainContent
                                              }
                                            >
                                              Hauptinhalt
                                            </div>
                                            {cards.map((card, index) => {
                                              const segment = card.segments[0];
                                              const startSeconds =
                                                parseClockSeconds(
                                                  segment?.start_time,
                                                ) ??
                                                Math.max(
                                                  0,
                                                  Math.round(
                                                    (index /
                                                      Math.max(
                                                        cards.length,
                                                        1,
                                                      )) *
                                                      timelineMaxSeconds,
                                                  ),
                                                );
                                              const endSeconds =
                                                parseClockSeconds(
                                                  segment?.end_time,
                                                ) ??
                                                Math.min(
                                                  timelineMaxSeconds,
                                                  startSeconds +
                                                    Math.round(
                                                      timelineMaxSeconds /
                                                        Math.max(
                                                          cards.length + 2,
                                                          4,
                                                        ),
                                                    ),
                                                );
                                              const left = Math.max(
                                                0,
                                                Math.min(
                                                  94,
                                                  (startSeconds /
                                                    timelineMaxSeconds) *
                                                    100,
                                                ),
                                              );
                                              const width = Math.max(
                                                6,
                                                Math.min(
                                                  100 - left,
                                                  ((endSeconds - startSeconds) /
                                                    timelineMaxSeconds) *
                                                    100 || 10,
                                                ),
                                              );
                                              const lockedByJellyfin =
                                                card.segments.some(
                                                  (item) =>
                                                    item.source_type ===
                                                      "jellyfin_theme" ||
                                                    item.playback_source_kind ===
                                                      "jellyfin",
                                                );
                                              const selected =
                                                selectedReleaseSegment?.release
                                                  .release_id ===
                                                  release.release_id &&
                                                selectedReleaseSegment.card
                                                  .theme_id === card.theme_id;
                                              const themeKind =
                                                compactThemeKind(
                                                  card.theme_type_name,
                                                );
                                              return (
                                                <button
                                                  key={`${release.release_id}:${card.theme_id}:${index}`}
                                                  type="button"
                                                  className={`${styles.fansubEditTimelineSegment} ${styles[`fansubEditTimelineSegment${card.status}`]} ${themeKind === "op" ? styles.fansubEditTimelineSegmentOp : ""} ${themeKind === "ed" ? styles.fansubEditTimelineSegmentEd : ""} ${themeKind === "insert" ? styles.fansubEditTimelineSegmentIn : ""} ${selected ? styles.fansubEditTimelineSegmentActive : ""}`}
                                                  style={{
                                                    left: `${left}%`,
                                                    width: `${width}%`,
                                                  }}
                                                  aria-pressed={selected}
                                                  aria-label={`${timelineLabelFor(card.theme_type_name)} ${timelineStatusLabelFor(card.status)}${lockedByJellyfin ? " Jellyfin-Quelle" : ""}`}
                                                  onClick={() => {
                                                    openThemeDrawer(
                                                      release,
                                                      card,
                                                    );
                                                  }}
                                                  title={
                                                    lockedByJellyfin
                                                      ? "Jellyfin-Quelle gesetzt"
                                                      : card.source_label ||
                                                        "Segment"
                                                  }
                                                >
                                                  {timelineLabelFor(
                                                    card.theme_type_name,
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                            {hasMoreReleases ? (
                              <div className={styles.fansubEditReleaseLoadMore}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  loading={releasesLoading}
                                  onClick={() => {
                                    if (!releasePagination) return;
                                    void loadAnimeReleases(
                                      releaseGroup,
                                      true,
                                      releasePagination.page + 1,
                                      true,
                                    );
                                  }}
                                >
                                  Weitere Releases laden
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          </details>
        ) : null}
        {activeMainTab === "notes" ? (
          <>
            <NotesTab fansubId={fansubID} />
            <GroupHistorySection fansubGroupId={fansubID} />
            {capabilities ? (
              <UserSuggestionsInbox fansubId={fansubID} domain="notes" capabilities={capabilities} />
            ) : null}
          </>
        ) : null}
        {activeMainTab === "vorschlaege" && capabilities ? (
          <>
            <ContributionsReviewSection fansubId={fansubID} capabilities={capabilities} />
            <UserSuggestionsInbox fansubId={fansubID} domain="contribution" capabilities={capabilities} />
          </>
        ) : null}
        {activeMainTab === "readiness" && group ? (
          <ReadinessTab fansubId={fansubID} group={group} />
        ) : null}
      </section>
      {contributionModalAnime ? (
        <AnimeContributionModal
          fansubId={fansubID}
          animeId={contributionModalAnime.id}
          animeTitle={contributionModalAnime.title}
          members={contributionMembers}
          existingContributions={contributionModalRows}
          focusedRoleCode={contributionModalAnime.focusedRoleCode}
          onClose={() => setContributionModalAnime(null)}
          onSaved={() => void refreshAnimeContributions(contributionModalAnime.id)}
        />
      ) : null}
      <ReleaseMediaDrawer
        styles={styles}
        drawer={drawer}
        capabilities={capabilities}
        hasAuthSession={hasAuthSession}
        canUseAdminReleaseDetails={canUseAdminReleaseDetails}
        canUseReleaseMedia={canUseReleaseMedia}
        canManageReleaseThemeAssets={canManageReleaseThemeAssets}
        selectedReleaseSegment={selectedReleaseSegment}
        releaseSegmentCards={releaseSegmentCards}
      />
      {contributionDrawerOpen && contributionDrawerVersionId !== null && contributionDrawerAnimeId !== null ? (
        <ReleaseContributionDrawer
          open={contributionDrawerOpen}
          fansubId={fansubID}
          animeId={contributionDrawerAnimeId}
          releaseVersionId={contributionDrawerVersionId}
          releaseTitle={contributionDrawerTitle}
          onClose={() => setContributionDrawerOpen(false)}
          onSaved={() => {
            const group = releaseGroups.find((rg) => rg.anime.id === contributionDrawerAnimeId);
            if (group) void loadAnimeReleases(group, true);
          }}
        />
      ) : null}
    </main>
  );
}

export default function AdminFansubEditPage() {
  const params = useParams<{ id: string }>();
  const fansubID = readFansubIDFromParams(params);

  return (
    <FansubEditAccessGate fansubID={fansubID}>
      {({ isPlatformAdmin, capabilities }) => (
        <AdminFansubEditContent
          fansubID={fansubID}
          isPlatformAdmin={isPlatformAdmin}
          capabilities={capabilities}
        />
      )}
    </FansubEditAccessGate>
  );
}
