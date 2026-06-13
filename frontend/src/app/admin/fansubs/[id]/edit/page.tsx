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
  type FormEvent,
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
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  createFansubAlias,
  deleteFansubAlias,
  deleteAdminReleaseThemeAsset,
  getAdminFansubAnime,
  getAdminFansubAnimeReleases,
  getAdminAnimeThemes,
  getAdminAnimeThemeSegments,
  getAdminRelease,
  getAdminReleaseThemeAssets,
  getAnimeCoverage,
  getFansubAliases,
  getFansubByID,
  getFansubList,
  listAnimeContributions,
  listUnifiedGroupMembers,
  resolveApiUrl,
  updateFansubGroup,
  uploadAdminReleaseThemeAssetForRelease,
  type AnimeCoverage,
} from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  FansubAlias,
  FansubGroupCapabilities,
  FansubGroup,
  FansubGroupLinkType,
  FansubStatus,
  AnimeContribution,
  UnifiedGroupMember,
  FANSUB_GROUP_ROLE_OPTIONS,
} from "@/types/fansub";
import { AdminFansubAnimeEntry } from "@/types/admin";
import { AdminFansubRelease } from "@/types/fansub";
import {
  buildFansubLogoFallback,
  buildMediaPreviewURL,
  EditableMediaValue,
  MediaUpload,
} from "@/components/admin/MediaUpload";
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Modal,
  Select,
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
import { FansubAppMembersSection } from "./FansubAppMembersSection";
import { NotesTab } from "./NotesTab";
import { GroupHistorySection } from "@/components/groups/GroupHistorySection";
import { parseMainTab } from "./mainTabRouting";
import { ReleaseVersionMediaDrawerSummary } from "./ReleaseVersionMediaDrawerSummary";
import { ReadinessTab } from "./ReadinessTab";
import { ReleaseVersionMediaReviewSection } from "./ReleaseVersionMediaReviewSection";
import { ContributionsReviewSection } from "./ContributionsReviewSection";
import { GroupMediaReviewSection } from "./GroupMediaReviewSection";
import { UserSuggestionsInbox } from "./UserSuggestionsInbox";
import { ReleaseContributionDrawer } from "./ReleaseContributionDrawer";
import type {
  CommunityLinkDraft,
  ContributionModalAnime,
  FansubReleaseGroup,
  FormState,
  MainTab,
  ReleaseDrawerContext,
  ReleaseDrawerTab,
  ReleasePaginationState,
  ReleaseSegmentCard,
  SectionKey,
  SelectedReleaseSegment,
} from "./fansubEditTypes";
import {
  compactThemeKind,
  episodeReleaseTitle,
  errMessage,
  formatAnimeTypeLabel,
  isAbsoluteURL,
  isValidSlug,
  labelForFansubStatus,
  parseClockSeconds,
  parseYear,
  releaseDrawerTitle,
  releaseTimelineMaxSeconds,
  resolveCoverUrl,
  slugify,
  themeSegmentEpisodeRange,
  themeSegmentTimeRange,
  timelineLabelFor,
  timelineStatusLabelFor,
} from "./fansubEditFormatters";
import {
  animeFansubReleaseContextKey,
  buildAnimeCoverageMap,
  groupContributionMembersByRole,
  isJellyfinLocked,
  mapReleaseSegmentCards,
  mergeReleaseThemeAssetCard,
  releaseThemeSelectionKey,
} from "./fansubEditReleaseHelpers";
import {
  createEmptyLink,
  emptyForm,
  formToPayload,
  mapGroupLinks,
  mapGroupMedia,
  mapGroupToForm,
  syncFansubLinks,
} from "./fansubEditFormMapping";
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
import { YEAR_MAX, YEAR_MIN, YearSelectField } from "./YearSelectField";
import sharedStyles from "../../../admin.module.css";
import fansubEditStyles from "./FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

const STATUS_OPTIONS: FansubStatus[] = ["active", "inactive", "dissolved"];
const LINK_TYPE_OPTIONS: FansubGroupLinkType[] = [
  "website",
  "discord",
  "twitter",
  "github",
  "irc",
];
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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
  const [aliases, setAliases] = useState<FansubAlias[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [links, setLinks] = useState<CommunityLinkDraft[]>([]);
  const [initialLinks, setInitialLinks] = useState<CommunityLinkDraft[]>([]);
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
  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(
    null,
  );
  const [selectedAnimeFansubContextKey, setSelectedAnimeFansubContextKey] =
    useState<string | null>(null);
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
  const [selectedFansubGroupId, setSelectedFansubGroupId] = useState<
    number | null
  >(null);
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
  const [releaseDrawerOpen, setReleaseDrawerOpen] = useState(false);
  const [drawerRelease, setDrawerRelease] = useState<AdminFansubRelease | null>(
    null,
  );
  const [drawerTab, setDrawerTab] = useState<ReleaseDrawerTab>("details");
  const [drawerReleaseLoading, setDrawerReleaseLoading] = useState(false);
  const [drawerReleaseError, setDrawerReleaseError] = useState<string | null>(
    null,
  );
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [contributionDrawerOpen, setContributionDrawerOpen] = useState(false);
  const [contributionDrawerVersionId, setContributionDrawerVersionId] = useState<number | null>(null);
  const [contributionDrawerAnimeId, setContributionDrawerAnimeId] = useState<number | null>(null);
  const [contributionDrawerTitle, setContributionDrawerTitle] = useState<string>('');
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [drawerUploadProgress, setDrawerUploadProgress] = useState<
    number | null
  >(null);
  const [themePreviewOpen, setThemePreviewOpen] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [themeUploadName, setThemeUploadName] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
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
  const [saving, setSaving] = useState(false);
  const [aliasBusy, setAliasBusy] = useState(false);
  const [logoMedia, setLogoMedia] = useState<EditableMediaValue | null>(null);
  const [bannerMedia, setBannerMedia] = useState<EditableMediaValue | null>(
    null,
  );
  const [initialLogoMedia, setInitialLogoMedia] =
    useState<EditableMediaValue | null>(null);
  const [initialBannerMedia, setInitialBannerMedia] =
    useState<EditableMediaValue | null>(null);
  const [mediaBusy, setMediaBusy] = useState<
    Record<"logo" | "banner", boolean>
  >({ logo: false, banner: false });
  const [slugConflict, setSlugConflict] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const themeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const releaseRequestSeqRef = useRef(0);
  const releaseRequestByContextRef = useRef<Record<string, number>>({});
  const releaseDrawerRequestSeqRef = useRef(0);
  const releaseSegmentRequestSeqRef = useRef(0);
  const releaseSegmentRequestByReleaseRef = useRef<Record<number, number>>({});
  const themeDrawerMutationSeqRef = useRef(0);
  const themeDrawerOpenRef = useRef(false);
  const themeDrawerSelectionKeyRef = useRef<string | null>(null);
  const { hasAccessToken, hasRefreshToken, isClientInitialized } =
    useAuthSession();
  const hasAuthSession = hasAccessToken || hasRefreshToken;
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

  const handleLogoMediaBusyChange = useCallback((isBusy: boolean) => {
    setMediaBusy((current) =>
      current.logo === isBusy ? current : { ...current, logo: isBusy },
    );
  }, []);

  const handleBannerMediaBusyChange = useCallback((isBusy: boolean) => {
    setMediaBusy((current) =>
      current.banner === isBusy ? current : { ...current, banner: isBusy },
    );
  }, []);

  const invalidateReleaseWorkspaceRequests = useCallback(() => {
    releaseRequestSeqRef.current += 1;
    releaseDrawerRequestSeqRef.current += 1;
    releaseSegmentRequestSeqRef.current += 1;
    releaseRequestByContextRef.current = {};
    releaseSegmentRequestByReleaseRef.current = {};
  }, []);

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
    setReleaseDrawerOpen(false);
    setThemeDrawerOpen(false);
    setSelectedReleaseSegment(null);
    setSelectedReleaseId(null);
    setSelectedAnimeFansubContextKey(null);
    setSelectedAnimeId(null);
    setSelectedFansubGroupId(null);
    setContributionModalAnime(null);
    setContributionMembers([]);
    setContributionModalRows([]);
    setAnimeContributionRowsByAnimeId({});
    setContributionModalLoadingAnimeId(null);
    setContributionModalError(null);
    setDrawerRelease(null);
    setDrawerReleaseLoading(false);
    setDrawerReleaseError(null);
    setDrawerError(null);
    setDrawerUploadProgress(null);
    setThemePreviewOpen(false);
    setDrawerBusy(false);
    themeDrawerMutationSeqRef.current += 1;
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = "";
    }
  }, [invalidateReleaseWorkspaceRequests]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    themeDrawerOpenRef.current = themeDrawerOpen;
  }, [themeDrawerOpen]);

  useEffect(() => {
    themeDrawerSelectionKeyRef.current =
      themeDrawerOpen && selectedReleaseSegment
        ? releaseThemeSelectionKey(
            selectedReleaseSegment.release.release_id,
            selectedReleaseSegment.card.theme_id,
          )
        : null;
  }, [themeDrawerOpen, selectedReleaseSegment]);

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
        const nextForm = mapGroupToForm(nextGroup);
        const nextMedia = mapGroupMedia(nextGroup);
        const nextLinks = mapGroupLinks(nextGroup);
        setGroup(nextGroup);
        setForm(nextForm);
        setInitialForm(nextForm);
        setLinks(nextLinks);
        setInitialLinks(nextLinks);
        setLogoMedia(nextMedia.logo);
        setBannerMedia(nextMedia.banner);
        setInitialLogoMedia(nextMedia.logo);
        setInitialBannerMedia(nextMedia.banner);
        setManualSlug(nextForm.slug !== slugify(nextForm.name));
        setAliases(aliasResponse.data);
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
  }, [fansubID]);

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
    if (!isPlatformAdmin) return;
    if (manualSlug) return;
    setForm((current) => ({ ...current, slug: slugify(current.name) }));
  }, [form.name, isPlatformAdmin, manualSlug]);

  useEffect(() => {
    if (!isPlatformAdmin) {
      setSlugChecking(false);
      setSlugConflict(false);
      return;
    }
    const slug = form.slug.trim();
    if (!slug || !isValidSlug(slug)) {
      setSlugChecking(false);
      setSlugConflict(false);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        setSlugChecking(true);
        const response = await getFansubList({ q: slug, per_page: 200 });
        if (!active) return;
        setSlugConflict(
          response.data.some(
            (item) => item.id !== fansubID && item.slug === slug,
          ),
        );
      } catch {
        if (active) setSlugConflict(false);
      } finally {
        if (active) setSlugChecking(false);
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [fansubID, form.slug, isPlatformAdmin]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const dirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(initialForm) ||
      JSON.stringify(links) !== JSON.stringify(initialLinks) ||
      JSON.stringify(logoMedia) !== JSON.stringify(initialLogoMedia) ||
      JSON.stringify(bannerMedia) !== JSON.stringify(initialBannerMedia),
    [
      bannerMedia,
      form,
      initialBannerMedia,
      initialForm,
      initialLinks,
      initialLogoMedia,
      links,
      logoMedia,
    ],
  );

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const years = useMemo(
    () => ({
      founded: parseYear(form.foundedYear),
      dissolved: parseYear(form.dissolvedYear),
    }),
    [form.dissolvedYear, form.foundedYear],
  );
  const nameError =
    form.name.trim().length === 0
      ? "Name ist erforderlich."
      : form.name.trim().length < 2
        ? "Mindestens 2 Zeichen."
        : null;
  const slugValue = form.slug.trim();
  const slugFormatError =
    !isPlatformAdmin
      ? null
      : slugValue.length === 0
      ? "Slug ist erforderlich."
      : !isValidSlug(slugValue)
        ? "Slug muss lowercase kebab-case sein."
        : null;
  const foundedError = Number.isNaN(years.founded)
    ? "Gründungsjahr muss eine Zahl sein."
    : years.founded !== null &&
        (years.founded < YEAR_MIN || years.founded > YEAR_MAX)
      ? `Gründungsjahr muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.`
      : null;
  const dissolvedError = Number.isNaN(years.dissolved)
    ? "Auflösungsjahr muss eine Zahl sein."
    : years.dissolved !== null &&
        (years.dissolved < YEAR_MIN || years.dissolved > YEAR_MAX)
      ? `Auflösungsjahr muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.`
      : null;
  const dissolvedAfterFoundedError =
    years.founded !== null &&
    years.dissolved !== null &&
    years.dissolved < years.founded
      ? "Auflösungsjahr muss größer oder gleich dem Gründungsjahr sein."
      : null;
  const linkErrors = links.map((link) =>
    link.url.trim().length > 0 && !isAbsoluteURL(link.url)
      ? "Bitte absolute URL mit Protokoll verwenden."
      : null,
  );
  const anyMediaBusy = mediaBusy.logo || mediaBusy.banner;
  const invalid =
    !hasAuthSession ||
    Boolean(nameError) ||
    (isPlatformAdmin && Boolean(slugFormatError)) ||
    (isPlatformAdmin && slugConflict) ||
    Boolean(foundedError) ||
    Boolean(dissolvedError) ||
    Boolean(dissolvedAfterFoundedError) ||
    linkErrors.some(Boolean) ||
    (isPlatformAdmin && slugChecking) ||
    anyMediaBusy;
  const isSectionOpen = (section: SectionKey): boolean =>
    isMobile ? openSections[section] : true;
  const onSectionToggle = (section: SectionKey, open: boolean) => {
    if (!isMobile) return;
    setOpenSections((current) => ({ ...current, [section]: open }));
  };

  const clearThemeUploadInput = () => {
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = "";
    }
    setThemeUploadName("");
  };

  const resetThemeDrawerTransientState = () => {
    themeDrawerMutationSeqRef.current += 1;
    setDrawerError(null);
    setDrawerBusy(false);
    setDrawerUploadProgress(null);
    setThemePreviewOpen(false);
    clearThemeUploadInput();
  };

  const closeThemeDrawer = () => {
    setThemeDrawerOpen(false);
    resetThemeDrawerTransientState();
  };

  const openThemeDrawer = (
    release: AdminFansubRelease,
    card: ReleaseSegmentCard,
  ) => {
    setSelectedReleaseSegment({ release, card });
    setThemeDrawerOpen(true);
    resetThemeDrawerTransientState();
  };

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

  const closeReleaseDrawer = () => {
    releaseDrawerRequestSeqRef.current += 1;
    setReleaseDrawerOpen(false);
    setThemeDrawerOpen(false);
    setSelectedReleaseSegment(null);
    setSelectedReleaseId(null);
    setSelectedAnimeFansubContextKey(null);
    setSelectedAnimeId(null);
    setSelectedFansubGroupId(null);
    setDrawerRelease(null);
    setDrawerTab("details");
    setDrawerBusy(false);
    resetThemeDrawerTransientState();
    setDrawerReleaseLoading(false);
    setDrawerReleaseError(null);
  };

  const openReleaseDrawer = (context: ReleaseDrawerContext) => {
    if (!canOpenReleaseDrawer) return;

    const { release, animeID, fansubGroupID, contextKey } = context;
    const requestID = releaseDrawerRequestSeqRef.current + 1;
    releaseDrawerRequestSeqRef.current = requestID;
    const initialDrawerTab: ReleaseDrawerTab = canUseAdminReleaseDetails
      ? "details"
      : "media";

    setSelectedReleaseId(release.release_id);
    setSelectedAnimeFansubContextKey(contextKey);
    setSelectedAnimeId(animeID);
    setSelectedFansubGroupId(fansubGroupID);
    setReleaseDrawerOpen(true);
    setThemeDrawerOpen(false);
    setSelectedReleaseSegment(null);
    setDrawerRelease(release);
    setDrawerTab(initialDrawerTab);
    setDrawerBusy(false);
    resetThemeDrawerTransientState();
    setDrawerReleaseError(null);
    setDrawerReleaseLoading(hasAuthSession && canUseAdminReleaseDetails);
    setExpandedReleaseIds((current) =>
      new Set(current).add(release.release_id),
    );
    void loadReleaseSegmentCards(release);

    if (!hasAuthSession || !canUseAdminReleaseDetails) {
      setDrawerReleaseLoading(false);
      return;
    }

    getAdminRelease(release.release_id)
      .then((response) => {
        if (releaseDrawerRequestSeqRef.current !== requestID) return;
        setDrawerRelease(response.data);
      })
      .catch((nextError) => {
        if (releaseDrawerRequestSeqRef.current !== requestID) return;
        setDrawerReleaseError(errMessage(nextError));
      })
      .finally(() => {
        if (releaseDrawerRequestSeqRef.current !== requestID) return;
        setDrawerReleaseLoading(false);
      });
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

  useEffect(() => {
    if (!drawerRelease) return;
    const cards = releaseSegmentCards[drawerRelease.release_id] ?? [];
    if (cards.length === 0) return;
    if (selectedReleaseSegment?.release.release_id === drawerRelease.release_id)
      return;
    setSelectedReleaseSegment({ release: drawerRelease, card: cards[0] });
  }, [
    drawerRelease,
    releaseSegmentCards,
    selectedReleaseSegment?.release.release_id,
  ]);

  useEffect(() => {
    if (!selectedReleaseSegment) return;
    const latestCards =
      releaseSegmentCards[selectedReleaseSegment.release.release_id] ?? [];
    const latestCard = latestCards.find(
      (card) => card.theme_id === selectedReleaseSegment.card.theme_id,
    );
    if (!latestCard) {
      setSelectedReleaseSegment(null);
      setThemeDrawerOpen(false);
      setDrawerError(null);
      setDrawerUploadProgress(null);
      if (themeUploadInputRef.current) {
        themeUploadInputRef.current.value = "";
      }
      return;
    }
    if (latestCard === selectedReleaseSegment.card) return;
    setSelectedReleaseSegment({
      release: selectedReleaseSegment.release,
      card: latestCard,
    });
  }, [releaseSegmentCards, selectedReleaseSegment]);

  const handleDrawerUpload = async (file: File | null) => {
    if (
      !file ||
      !selectedReleaseSegment ||
      !hasAuthSession ||
      !canManageReleaseThemeAssets
    )
      return;
    const release = selectedReleaseSegment.release;
    const themeID = selectedReleaseSegment.card.theme_id;
    const selectionKey = releaseThemeSelectionKey(release.release_id, themeID);
    const isCurrentSelection = () =>
      themeDrawerOpenRef.current &&
      themeDrawerSelectionKeyRef.current === selectionKey;
    const mutationID = themeDrawerMutationSeqRef.current + 1;
    themeDrawerMutationSeqRef.current = mutationID;
    const isCurrentMutation = () =>
      isCurrentSelection() && themeDrawerMutationSeqRef.current === mutationID;
    if (!isCurrentSelection()) return;
    setDrawerBusy(true);
    setDrawerError(null);
    setDrawerUploadProgress(0);
    try {
      const uploadResponse = await uploadAdminReleaseThemeAssetForRelease({
        releaseID: release.release_id,
        themeID,
        file,
        onProgress: (progress) => {
          if (isCurrentSelection()) setDrawerUploadProgress(progress);
        },
      });
      if (!isCurrentMutation()) return;
      setReleaseSegmentErrors((current) => ({
        ...current,
        [release.release_id]: null,
      }));
      setReleaseSegmentCards((current) => {
        const existingCards = current[release.release_id];
        if (!existingCards) return current;
        return {
          ...current,
          [release.release_id]: mergeReleaseThemeAssetCard(
            existingCards,
            uploadResponse.data,
          ),
        };
      });
      const refreshedCards = await loadReleaseSegmentCards(release, true);
      if (!isCurrentMutation()) return;
      if (!refreshedCards) {
        setReleaseSegmentErrors((current) => ({
          ...current,
          [release.release_id]: null,
        }));
      }
      setToast("Theme-Asset gespeichert.");
      setDrawerUploadProgress(null);
      clearThemeUploadInput();
    } catch (nextError) {
      if (isCurrentMutation()) setDrawerError(errMessage(nextError));
    } finally {
      if (isCurrentMutation()) setDrawerBusy(false);
    }
  };

  const handleDrawerUploadClick = async () => {
    const file = themeUploadInputRef.current?.files?.[0] ?? null;
    if (!file) {
      setDrawerError("Bitte zuerst eine Videodatei auswählen.");
      return;
    }
    await handleDrawerUpload(file);
  };

  const handleThemeUploadInputChange = () => {
    const file = themeUploadInputRef.current?.files?.[0] ?? null;
    setThemeUploadName(file?.name || "");
    if (file) {
      setDrawerError(null);
    }
  };

  const handleDrawerDelete = async () => {
    if (
      !selectedReleaseSegment ||
      !hasAuthSession ||
      !selectedReleaseSegment.card.media_id
    )
      return;
    const release = selectedReleaseSegment.release;
    const themeID = selectedReleaseSegment.card.theme_id;
    const mediaID = selectedReleaseSegment.card.media_id;
    const selectionKey = releaseThemeSelectionKey(release.release_id, themeID);
    const isCurrentSelection = () =>
      themeDrawerOpenRef.current &&
      themeDrawerSelectionKeyRef.current === selectionKey;
    const mutationID = themeDrawerMutationSeqRef.current + 1;
    themeDrawerMutationSeqRef.current = mutationID;
    const isCurrentMutation = () =>
      isCurrentSelection() && themeDrawerMutationSeqRef.current === mutationID;
    if (!isCurrentSelection()) return;
    setDrawerBusy(true);
    setDrawerError(null);
    try {
      await deleteAdminReleaseThemeAsset(release.release_id, themeID, mediaID);
      if (!isCurrentMutation()) return;
      await loadReleaseSegmentCards(release, true);
      if (!isCurrentMutation()) return;
      setSelectedReleaseSegment(null);
      closeThemeDrawer();
      setToast("Theme-Asset entfernt.");
    } catch (nextError) {
      if (isCurrentMutation()) setDrawerError(errMessage(nextError));
    } finally {
      if (isCurrentMutation()) setDrawerBusy(false);
    }
  };

  const addAlias = async () => {
    const value = aliasInput.trim();
    if (!value || !hasAuthSession) return;
    if (
      aliases.some((item) => item.alias.toLowerCase() === value.toLowerCase())
    ) {
      setAliasError("Tag existiert bereits.");
      return;
    }
    setAliasBusy(true);
    setAliasError(null);
    try {
      const response = await createFansubAlias(fansubID, { alias: value });
      setAliases((current) =>
        [...current, response.data].sort((a, b) =>
          a.alias.localeCompare(b.alias, "de"),
        ),
      );
      setAliasInput("");
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  };

  const removeAlias = async (alias: FansubAlias) => {
    if (!hasAuthSession) return;
    setAliasBusy(true);
    setAliasError(null);
    try {
      await deleteFansubAlias(fansubID, alias.id);
      setAliases((current) => current.filter((item) => item.id !== alias.id));
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasAuthSession || invalid) return;
    setSaving(true);
    setError(null);
    try {
      await updateFansubGroup(
        fansubID,
        formToPayload(form, logoMedia, bannerMedia, {
          includeSlug: isPlatformAdmin,
        }),
      );
      await syncFansubLinks(fansubID, initialLinks, links);
      const response = await getFansubByID(fansubID);
      const next = mapGroupToForm(response.data);
      const nextMedia = mapGroupMedia(response.data);
      const nextLinks = mapGroupLinks(response.data);
      setGroup(response.data);
      setForm(next);
      setInitialForm(next);
      setLinks(nextLinks);
      setInitialLinks(nextLinks);
      setLogoMedia(nextMedia.logo);
      setBannerMedia(nextMedia.banner);
      setInitialLogoMedia(nextMedia.logo);
      setInitialBannerMedia(nextMedia.banner);
      setManualSlug(next.slug !== slugify(next.name));
      setToast("Änderungen gespeichert.");
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setSaving(false);
    }
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

  const themeSelectedCard = selectedReleaseSegment?.card ?? null;
  const themeSelectedLocked = themeSelectedCard
    ? themeSelectedCard.status === "global" ||
      isJellyfinLocked(themeSelectedCard)
    : false;
  const drawerReleaseCards = drawerRelease
    ? (releaseSegmentCards[drawerRelease.release_id] ?? [])
    : [];
  const drawerReleaseReleaseAssetCount = drawerReleaseCards.filter(
    (card) => card.status === "release",
  ).length;
  const drawerReleaseGlobalAssetCount = drawerReleaseCards.filter(
    (card) => card.status === "global",
  ).length;
  const drawerReleaseMissingAssetCount = drawerReleaseCards.filter(
    (card) => card.status === "missing",
  ).length;
  const drawerReleaseThemeSummary =
    drawerReleaseCards.length > 0
      ? `${drawerReleaseReleaseAssetCount} Release / ${drawerReleaseGlobalAssetCount} Global / ${drawerReleaseMissingAssetCount} offen`
      : drawerRelease?.has_theme_assets
        ? "Theme-Assets vorhanden"
        : "Keine Theme-Assets";
  const themePrimarySegment = themeSelectedCard?.segments[0] ?? null;
  const themeAssetPreviewUrl = themeSelectedCard?.public_url
    ? resolveApiUrl(themeSelectedCard.public_url)
    : null;
  const themePreviewDescription =
    selectedReleaseSegment && themeSelectedCard
      ? `${episodeReleaseTitle(selectedReleaseSegment.release)} · ${timelineLabelFor(themeSelectedCard.theme_type_name)}`
      : undefined;
  const drawerUploadStatusLabel =
    drawerUploadProgress === null
      ? null
      : drawerUploadProgress >= 100
        ? "Upload angekommen, wird gespeichert..."
        : `Upload: ${drawerUploadProgress}%`;
  const tabUsesLeftWorkspace = activeMainTab === "basic";
  const tabUsesRightWorkspace =
    activeMainTab === "media" ||
    activeMainTab === "links" ||
    activeMainTab === "collaboration";
  const fansubEditColumnsClassName = `${styles.fansubEditColumns}${tabUsesLeftWorkspace ? ` ${styles.fansubEditColumnsSingleLeft}` : ""}${tabUsesRightWorkspace ? ` ${styles.fansubEditColumnsSingleRight}` : ""}`;
  const releaseDrawerTabs = drawerRelease
    ? [
        ...(canUseAdminReleaseDetails
          ? [{ key: "details" as const, label: "Details", disabled: false }]
          : []),
        ...(canUseReleaseMedia
          ? [{ key: "media" as const, label: "Media", disabled: false }]
          : []),
      ]
    : [];
  const communityLinksList = (
    <div className={styles.fansubEditLinksList}>
      {links.map((link, index) => {
        const url = link.url.trim();
        const urlError = linkErrors[index];
        return (
          <div key={link.key} className={styles.fansubEditLinkRow}>
            <FormField label="Typ" htmlFor={`community-link-type-${link.key}`}>
              <Select
                id={`community-link-type-${link.key}`}
                value={link.link_type}
                onChange={(event) =>
                  setLinks((current) =>
                    current.map((item) =>
                      item.key === link.key
                        ? {
                            ...item,
                            link_type: event.target
                              .value as FansubGroupLinkType,
                          }
                        : item,
                    ),
                  )
                }
              >
                {LINK_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Name"
              htmlFor={`community-link-name-${link.key}`}
            >
              <Input
                id={`community-link-name-${link.key}`}
                value={link.name}
                onChange={(event) =>
                  setLinks((current) =>
                    current.map((item) =>
                      item.key === link.key
                        ? {
                            ...item,
                            name: event.target.value,
                          }
                        : item,
                    ),
                  )
                }
                placeholder="Optionaler Anzeigename"
              />
            </FormField>
            <FormField
              label="URL"
              htmlFor={`community-link-url-${link.key}`}
              error={urlError || undefined}
            >
              <div className={styles.fansubEditLinkInput}>
                <Input
                  id={`community-link-url-${link.key}`}
                  value={link.url}
                  invalid={Boolean(urlError)}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item) =>
                        item.key === link.key
                          ? {
                              ...item,
                              url: event.target.value,
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="https://..."
                />
                {url && !urlError ? (
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    iconOnly
                    aria-label="Link öffnen"
                    onClick={() => window.open(url, "_blank", "noreferrer")}
                    leftIcon={<ExternalLink size={14} />}
                  />
                ) : null}
              </div>
            </FormField>
            <Button
              type="button"
              variant="danger"
              size="sm"
              iconOnly
              className={styles.fansubEditLinkRemoveButton}
              aria-label="Link entfernen"
              onClick={() =>
                setLinks((current) =>
                  current.length === 1
                    ? [createEmptyLink()]
                    : current.filter((item) => item.key !== link.key),
                )
              }
              leftIcon={<Trash2 size={14} />}
            />
          </div>
        );
      })}
    </div>
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
          <form className={styles.fansubEditForm} onSubmit={save}>
            {activeMainTab !== "collaboration" ? (
              <div className={styles.fansubEditStickyActions}>
                <Button
                  type="submit"
                  variant="success"
                  disabled={invalid || saving}
                  loading={saving}
                  leftIcon={<Save size={14} />}
                >
                  {saving ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            ) : null}
            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {isClientInitialized && !hasAuthSession ? (
              <div className={styles.errorBox}>
                Anmeldung erforderlich. Bitte zuerst anmelden.
              </div>
            ) : null}

            <div className={fansubEditColumnsClassName}>
              {tabUsesLeftWorkspace ? (
                <div className={styles.fansubEditLeftColumn}>
                  {activeMainTab === "basic" ? (
                    <section className={styles.fansubEditBasicWorkspace}>
                      <div className={styles.fansubEditSectionBody}>
                        <Card
                          variant="section"
                          className={styles.fansubEditBasicSurface}
                        >
                          <div className={styles.fansubEditBasicGrid}>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
                            >
                              <label htmlFor="fansub-group-name">
                                Fansubgruppen-Name{" "}
                                <span className={styles.fansubEditRequired}>
                                  *
                                </span>
                              </label>
                              <Input
                                id="fansub-group-name"
                                value={form.name}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    name: e.target.value,
                                  }))
                                }
                                required
                                minLength={2}
                                invalid={Boolean(nameError)}
                              />
                              {nameError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {nameError}
                                </p>
                              ) : null}
                            </div>
                            {isPlatformAdmin ? (
                              <div
                                className={`${styles.field} ${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
                              >
                              <label htmlFor="fansub-group-slug">
                                Slug{" "}
                                <span className={styles.fansubEditRequired}>
                                  *
                                </span>
                              </label>
                              <div className={styles.fansubEditSlugRow}>
                                <Input
                                  id="fansub-group-slug"
                                  value={form.slug}
                                  onChange={(e) => {
                                    setManualSlug(true);
                                    setForm((c) => ({
                                      ...c,
                                      slug: e.target.value,
                                    }));
                                  }}
                                  invalid={
                                    Boolean(slugFormatError) || slugConflict
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setManualSlug(false);
                                    setForm((c) => ({
                                      ...c,
                                      slug: slugify(c.name),
                                    }));
                                  }}
                                >
                                  Auto
                                </Button>
                              </div>
                              {slugChecking ? (
                                <p className={styles.fansubEditHint}>
                                  Prüfe Slug...
                                </p>
                              ) : null}
                              {slugFormatError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {slugFormatError}
                                </p>
                              ) : null}
                              {!slugFormatError && slugConflict ? (
                                <p className={styles.fansubEditInlineError}>
                                  Slug ist bereits vergeben.
                                </p>
                              ) : null}
                              </div>
                            ) : null}
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField}`}
                            >
                              <label htmlFor="fansub-group-status">
                                Status{" "}
                                <span className={styles.fansubEditRequired}>
                                  *
                                </span>
                              </label>
                              <Select
                                id="fansub-group-status"
                                value={form.status}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    status: e.target.value as FansubStatus,
                                    dissolvedYear:
                                      e.target.value === "active"
                                        ? ""
                                        : c.dissolvedYear,
                                  }))
                                }
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {labelForFansubStatus(s)}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField}`}
                            >
                              <label htmlFor="fansub-group-country">Land</label>
                              <Input
                                id="fansub-group-country"
                                value={form.country}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    country: e.target.value,
                                  }))
                                }
                                placeholder="z. B. Deutschland"
                              />
                            </div>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField}`}
                            >
                              <label htmlFor="fansub-group-founded-year">
                                Gründungsjahr
                              </label>
                              <YearSelectField
                                id="fansub-group-founded-year"
                                label="Gründungsjahr"
                                value={form.foundedYear}
                                error={foundedError}
                                onChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    foundedYear: value,
                                  }))
                                }
                              />
                              {foundedError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {foundedError}
                                </p>
                              ) : null}
                            </div>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField}`}
                            >
                              <label htmlFor="fansub-group-dissolved-year">
                                Auflösungsjahr
                              </label>
                              <YearSelectField
                                disabled={form.status === "active"}
                                id="fansub-group-dissolved-year"
                                label="Auflösungsjahr"
                                value={form.dissolvedYear}
                                error={
                                  dissolvedError || dissolvedAfterFoundedError
                                }
                                onChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    dissolvedYear: value,
                                  }))
                                }
                              />
                              {dissolvedError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {dissolvedError}
                                </p>
                              ) : null}
                            </div>
                            <div
                              className={`${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
                            >
                              <FormField
                                label="Aliase"
                                htmlFor="fansub-group-alias-input"
                                error={aliasError || undefined}
                              >
                                <div className={styles.fansubEditAliasControls}>
                                  <Input
                                    id="fansub-group-alias-input"
                                    value={aliasInput}
                                    invalid={Boolean(aliasError)}
                                    onChange={(e) => {
                                      setAliasInput(e.target.value);
                                      setAliasError(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void addAlias();
                                      }
                                    }}
                                    placeholder="Alias hinzufügen"
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    leftIcon={<Plus size={14} />}
                                    onClick={() => void addAlias()}
                                    disabled={aliasBusy}
                                  >
                                    Hinzufügen
                                  </Button>
                                </div>
                              </FormField>
                              <div className={styles.fansubEditAliasBadgeBox}>
                                <div className={styles.fansubEditAliasBadgeRow}>
                                  {aliases.map((alias) => (
                                    <span
                                      key={alias.id}
                                      className={styles.fansubEditAliasBadgeItem}
                                    >
                                      <Badge variant="muted">
                                        {alias.alias}
                                      </Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        iconOnly
                                        aria-label={`Alias ${alias.alias} entfernen`}
                                        onClick={() => void removeAlias(alias)}
                                        disabled={aliasBusy}
                                        leftIcon={<X size={14} />}
                                      />
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                        <div className={styles.fansubEditBasicSupplementGrid}>
                          <section className={styles.fansubEditBrandingCard}>
                            <h3 className={styles.fansubEditBasicPanelTitle}>
                              Logo und Banner
                            </h3>
                            <div className={styles.fansubEditMediaGrid}>
                              <MediaUpload
                                type="logo"
                                fansubID={fansubID}
                                groupName={form.name.trim() || group?.name || ""}
                                value={logoMedia}
                                disabled={!hasAuthSession || saving}
                                onBusyChange={handleLogoMediaBusyChange}
                                onChange={(nextValue) => {
                                  setLogoMedia(nextValue);
                                  setInitialLogoMedia(nextValue);
                                  setToast(
                                    nextValue?.publicURL
                                      ? "Logo aktualisiert."
                                      : "Logo entfernt.",
                                  );
                                }}
                              />
                              <MediaUpload
                                type="banner"
                                fansubID={fansubID}
                                groupName={form.name.trim() || group?.name || ""}
                                value={bannerMedia}
                                disabled={!hasAuthSession || saving}
                                onBusyChange={handleBannerMediaBusyChange}
                                onChange={(nextValue) => {
                                  setBannerMedia(nextValue);
                                  setInitialBannerMedia(nextValue);
                                  setToast(
                                    nextValue?.publicURL
                                      ? "Banner aktualisiert."
                                      : "Banner entfernt.",
                                  );
                                }}
                              />
                            </div>
                          </section>
                          <Card
                            variant="section"
                            className={styles.fansubEditCommunityCard}
                            header={
                              <div className={styles.fansubEditBasicPanelHeader}>
                                <h3 className={styles.fansubEditBasicPanelTitle}>
                                  Community-Links
                                </h3>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Plus size={14} />}
                                  onClick={() =>
                                    setLinks((current) => [
                                      ...current,
                                      createEmptyLink(),
                                    ])
                                  }
                                >
                                  Link hinzufügen
                                </Button>
                              </div>
                            }
                          >
                            <div className={styles.fansubEditCommunityBody}>
                              {communityLinksList}
                            </div>
                          </Card>
                        </div>
                        {dissolvedAfterFoundedError ? (
                          <p className={styles.fansubEditInlineError}>
                            {dissolvedAfterFoundedError}
                          </p>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {tabUsesRightWorkspace ? (
                <div className={styles.fansubEditRightColumn}>
                  {activeMainTab === "media" ? (
                    <>
                      {capabilities ? (
                        <>
                          <GroupMediaReviewSection fansubId={fansubID} capabilities={capabilities} />
                          <UserSuggestionsInbox fansubId={fansubID} domain="media" capabilities={capabilities} />
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {activeMainTab === "links" ? (
                    <details
                      className={styles.fansubEditSection}
                      open={isSectionOpen("links")}
                      onToggle={(event) =>
                        onSectionToggle("links", event.currentTarget.open)
                      }
                    >
                      <summary className={styles.fansubEditSectionSummary}>
                        Community-Links
                      </summary>
                      <div className={styles.fansubEditSectionBody}>
                        <div className={styles.fansubEditLinksHeader}>
                          <p className={styles.fansubEditHint}>
                            Generische Link-Zeilen für Website, Discord,
                            Twitter, GitHub und IRC.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            leftIcon={<Plus size={14} />}
                            onClick={() =>
                              setLinks((current) => [
                                ...current,
                                createEmptyLink(),
                              ])
                            }
                          >
                            Link hinzufügen
                          </Button>
                        </div>
                        {communityLinksList}
                      </div>
                    </details>
                  ) : null}

                  {activeMainTab === "collaboration" ? (
                    <FansubAppMembersSection
                      fansubId={fansubID}
                      hasAccessToken={hasAuthSession}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            {activeMainTab !== "collaboration" ? (
              <div className={styles.fansubEditMobileActionBar}>
                <Button
                  type="submit"
                  variant="success"
                  disabled={invalid || saving}
                  loading={saving}
                  fullWidth
                >
                  {saving ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            ) : null}
          </form>
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
      {releaseDrawerOpen && drawerRelease ? (
        <div
          className={styles.fansubEditReleaseDrawerOverlay}
          onClick={closeReleaseDrawer}
        >
          <aside
            className={styles.fansubEditReleaseDrawer}
            aria-label="Release bearbeiten"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.fansubEditReleaseDrawerHeader}>
              <div>
                <div className={styles.fansubEditReleaseDrawerTitleRow}>
                  <h2>{releaseDrawerTitle(drawerRelease)}</h2>
                </div>
                <p>
                  {drawerRelease.fansub_name} · {drawerRelease.version_count}{" "}
                  Version{drawerRelease.version_count === 1 ? "" : "en"}
                </p>
              </div>
              <button
                type="button"
                className={styles.fansubEditReleaseExpandButton}
                onClick={closeReleaseDrawer}
                aria-label="Drawer schließen"
              >
                <X size={16} />
              </button>
            </header>

            <div
              className={styles.fansubEditReleaseDrawerTabs}
              role="tablist"
              aria-label="Release Drawer Bereiche"
            >
              {releaseDrawerTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={
                    drawerTab === tab.key
                      ? styles.fansubEditReleaseDrawerTabActive
                      : undefined
                  }
                  disabled={tab.disabled}
                  aria-disabled={tab.disabled}
                  onClick={() => {
                    if (!tab.disabled) setDrawerTab(tab.key);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.fansubEditReleaseDrawerBody}>
              {drawerReleaseLoading ? (
                <div className={styles.fansubEditReleaseState}>
                  Release-Details werden geladen...
                </div>
              ) : null}
              {drawerReleaseError ? (
                <div className={styles.errorBox}>{drawerReleaseError}</div>
              ) : null}
              {drawerTab === "details" && canUseAdminReleaseDetails ? (
                <div className={styles.fansubEditReleaseDrawerPanel}>
                  <div className={styles.fansubEditReleaseDrawerDetailGrid}>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Release-ID</span>
                      <strong>
                        {String(selectedReleaseId ?? drawerRelease.release_id)}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Anime-ID</span>
                      <strong>
                        {String(selectedAnimeId ?? drawerRelease.anime_id)}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Fansub-Gruppe</span>
                      <strong>
                        {String(
                          selectedFansubGroupId ??
                            drawerRelease.fansub_group_id,
                        )}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Kontext-Key</span>
                      <strong>
                        {selectedAnimeFansubContextKey ??
                          animeFansubReleaseContextKey(
                            drawerRelease.fansub_group_id,
                            drawerRelease.anime_id,
                          )}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Anime</span>
                      <strong>{drawerRelease.anime_title}</strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Episode</span>
                      <strong>{drawerRelease.episode_number || "?"}</strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Titel</span>
                      <strong>
                        {(drawerRelease.episode_title || "").trim() ||
                          "Ohne Episodentitel"}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Versionen</span>
                      <strong>{String(drawerRelease.version_count)}</strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Datum</span>
                      <strong>
                        {new Date(drawerRelease.created_at).toLocaleDateString(
                          "de-CH",
                        )}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Theme-Übersicht</span>
                      <strong>{drawerReleaseThemeSummary}</strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Theme-Definitionen</span>
                      <strong>
                        {drawerReleaseCards.length > 0
                          ? `${drawerReleaseCards.length} geladen`
                          : "Noch keine geladen"}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : null}

              {drawerTab === "media" && canUseReleaseMedia ? (
                <div className={styles.fansubEditReleaseDrawerPanel}>
                  {drawerRelease.release_version_id > 0 ? (
                    <>
                      <ReleaseVersionMediaDrawerSummary
                        versionId={drawerRelease.release_version_id}
                        fansubName={drawerRelease.fansub_name}
                        releaseVersionLabel={`Release-Version ${drawerRelease.release_version_id}`}
                      />
                      {capabilities ? (
                        <ReleaseVersionMediaReviewSection
                          versionId={drawerRelease.release_version_id}
                          capabilities={capabilities}
                        />
                      ) : null}
                    </>
                  ) : (
                    <div className={styles.fansubEditReleaseState}>
                      Für diesen Release ist keine konkrete Release-Version verfügbar.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <Button
                type="button"
                variant="secondary"
                onClick={closeReleaseDrawer}
              >
                Schließen
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
      {themeDrawerOpen && selectedReleaseSegment && themeSelectedCard ? (
        <div
          className={styles.fansubEditReleaseDrawerOverlay}
          onClick={closeThemeDrawer}
        >
          <aside
            className={`${styles.fansubEditReleaseDrawer} ${styles.fansubEditThemeDrawer}`}
            aria-label="Theme bearbeiten"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.fansubEditReleaseDrawerHeader}>
              <div>
                <p className={styles.fansubEditHint}>
                  {episodeReleaseTitle(selectedReleaseSegment.release)}
                </p>
                <h2>
                  {timelineLabelFor(themeSelectedCard.theme_type_name)}{" "}
                  bearbeiten
                </h2>
                <p>{themeSelectedCard.theme_title || "Ohne Titel"}</p>
              </div>
              <button
                type="button"
                className={styles.fansubEditReleaseExpandButton}
                onClick={closeThemeDrawer}
                aria-label="Theme Drawer schließen"
              >
                <X size={16} />
              </button>
            </header>
            <div className={styles.fansubEditReleaseDrawerBody}>
              <div
                className={`${styles.fansubEditReleaseDrawerPanel} ${styles.fansubEditThemeDrawerPanel}`}
              >
                {drawerError ? (
                  <div className={styles.errorBox}>{drawerError}</div>
                ) : null}
                <div className={styles.fansubEditReleaseDrawerAssetBox}>
                  <div className={styles.fansubEditSegmentEditorGrid}>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Status
                      </span>
                      <strong>
                        {themeSelectedCard.status === "global"
                          ? "Global gesetzt"
                          : themeSelectedCard.status === "release"
                            ? "Uploadet"
                            : "Fehlt noch"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Theme
                      </span>
                      <strong>
                        {themeSelectedCard.theme_title || "Ohne Titel"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Quelle
                      </span>
                      <strong>
                        {themeSelectedCard.source_label || "Keine Quelle"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Release
                      </span>
                      <strong>
                        #{selectedReleaseSegment.release.release_id}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Episode
                      </span>
                      <strong>
                        {themeSegmentEpisodeRange(themePrimarySegment)}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Zeitbereich
                      </span>
                      <strong>
                        {themeSegmentTimeRange(themePrimarySegment)}
                      </strong>
                    </div>
                  </div>
                  {themeAssetPreviewUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<ExternalLink size={16} />}
                      className={styles.fansubEditReleaseDrawerMediaLink}
                      onClick={() => setThemePreviewOpen(true)}
                    >
                      Aktuelles Asset ansehen
                    </Button>
                  ) : null}
                  {themeSelectedLocked ? (
                    <p className={styles.fansubEditHint}>
                      Global/Jellyfin gesetzt - keine Fansub-Überschreibung in
                      diesem Schritt.
                    </p>
                  ) : !canManageReleaseThemeAssets ? (
                    <p className={styles.fansubEditHint}>
                      Du kannst die Theme-Zuordnung ansehen. Hochladen oder
                      Entfernen ist nur mit Release-Media-Recht möglich.
                    </p>
                  ) : (
                    <div className={styles.fansubEditReleaseDrawerDropzone}>
                      <div className={styles.fansubEditThemeUploadHeader}>
                        <strong>Theme-Video hochladen</strong>
                        {drawerUploadStatusLabel ? (
                          <span className={styles.fansubEditThemeUploadMeta}>
                            {drawerUploadStatusLabel}
                          </span>
                        ) : null}
                      </div>
                      <input
                        ref={themeUploadInputRef}
                        className={styles.fansubEditThemeUploadInput}
                        type="file"
                        accept="video/*"
                        disabled={drawerBusy || !hasAuthSession}
                        onChange={handleThemeUploadInputChange}
                      />
                      <div className={styles.fansubEditThemeUploadPicker}>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => themeUploadInputRef.current?.click()}
                          disabled={drawerBusy || !hasAuthSession}
                        >
                          Datei wählen
                        </Button>
                        <span className={styles.fansubEditThemeUploadFileName}>
                          {themeUploadName || "Keine Datei ausgewählt"}
                        </span>
                      </div>
                      <div className={styles.fansubEditThemeUploadActions}>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => void handleDrawerUploadClick()}
                          disabled={drawerBusy || !hasAuthSession}
                          loading={drawerBusy}
                        >
                          Upload starten
                        </Button>
                        {themeSelectedCard.status === "release" &&
                        themeSelectedCard.media_id ? (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => void handleDrawerDelete()}
                            disabled={drawerBusy}
                            loading={drawerBusy}
                          >
                            Asset entfernen
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <Button
                type="button"
                variant="secondary"
                onClick={closeThemeDrawer}
              >
                Schließen
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
      {themeAssetPreviewUrl ? (
        <Modal
          open={themePreviewOpen}
          onClose={() => setThemePreviewOpen(false)}
          title="Theme-Video ansehen"
          description={themePreviewDescription}
          footer={
            <Button
              type="button"
              variant="secondary"
              onClick={() => setThemePreviewOpen(false)}
            >
              Schließen
            </Button>
          }
        >
          <div className={styles.fansubEditThemePreview}>
            <video
              className={styles.fansubEditThemePreviewVideo}
              src={themeAssetPreviewUrl}
              controls
              preload="metadata"
            />
          </div>
        </Modal>
      ) : null}
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
