"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type FormEvent,
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
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  ApiError,
  createFansubAlias,
  createFansubLink,
  deleteFansubAlias,
  deleteFansubGroup,
  deleteFansubLink,
  deleteAdminReleaseThemeAsset,
  getAdminFansubAnime,
  getAdminFansubAnimeReleases,
  getAdminAnimeThemes,
  getAdminAnimeThemeSegments,
  getAdminRelease,
  getAdminReleaseThemeAssets,
  getFansubAliases,
  getFansubByID,
  getFansubList,
  resolveApiUrl,
  updateFansubGroup,
  updateFansubLink,
  uploadAdminReleaseThemeAssetForRelease,
} from "@/lib/api";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  FansubAlias,
  FansubGroup,
  FansubGroupLink,
  FansubGroupLinkType,
  FansubGroupPatchRequest,
  FansubGroupType,
  FansubStatus,
} from "@/types/fansub";
import {
  AdminAnimeTheme,
  AdminAnimeThemeSegment,
  AdminFansubAnimeEntry,
  AdminReleaseThemeAsset,
} from "@/types/admin";
import { AdminFansubRelease } from "@/types/fansub";
import {
  buildFansubLogoFallback,
  buildMediaPreviewURL,
  EditableMediaValue,
  MediaUpload,
} from "@/components/admin/MediaUpload";
import { AnimeProjectNotesSection } from "./AnimeProjectNotesSection";
import { FansubAppMembersSection } from "./FansubAppMembersSection";
import { NotesTab } from "./NotesTab";
import { ReleaseVersionMediaDrawerSummary } from "./ReleaseVersionMediaDrawerSummary";
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
const INITIAL_RELEASE_BATCH_SIZE = 5;
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const URL_PROTOCOLS = new Set(["http:", "https:", "irc:", "ircs:"]);

type SectionKey =
  | "basic"
  | "media"
  | "links"
  | "collaboration"
  | "releases"
  | "anime-projekte"
  | "notes";
type MainTab = SectionKey;
type FormState = {
  name: string;
  slug: string;
  status: FansubStatus;
  groupType: FansubGroupType;
  country: string;
  foundedYear: string;
  dissolvedYear: string;
};

type CommunityLinkDraft = {
  key: string;
  id: number | null;
  link_type: FansubGroupLinkType;
  name: string;
  url: string;
};

type FansubReleaseGroup = {
  key: string;
  anime: AdminFansubAnimeEntry;
};

type ReleaseSegmentStatus = "global" | "release" | "missing";

type ReleaseSegmentCard = {
  theme_id: number;
  theme_type_name: string;
  theme_title: string | null;
  status: ReleaseSegmentStatus;
  segments: AdminAnimeThemeSegment[];
  media_id?: number;
  public_url?: string;
  source_label?: string;
};

type SelectedReleaseSegment = {
  release: AdminFansubRelease;
  card: ReleaseSegmentCard;
};

type ReleaseDrawerTab = "details" | "media";

type ReleaseDrawerContext = {
  release: AdminFansubRelease;
  animeID: number;
  fansubGroupID: number;
  contextKey: string;
};

type BannerEdgeFills = {
  left: string;
  right: string;
};

type BannerSideWidths = {
  left: number;
  right: number;
};

const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: "basic", label: "Grunddaten" },
  { key: "notes", label: "Gruppengeschichte" },
  { key: "media", label: "Medien" },
  { key: "collaboration", label: "Mitglieder" },
  { key: "releases", label: "Anime & Veröffentlichungen" },
  { key: "anime-projekte", label: "Anime-Einblicke" },
];

const STATUS_LABELS: Record<FansubStatus, string> = {
  active: "aktiv",
  inactive: "inaktiv",
  dissolved: "aufgelöst",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function parseYear(value: string): number | null | typeof Number.NaN {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function toOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isAbsoluteURL(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return URL_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

function resolveCoverUrl(rawCoverImage?: string | null): string {
  const value = (rawCoverImage || "").trim();
  if (!value) return "/covers/placeholder.jpg";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/api/")) return resolveApiUrl(value);
  if (value.startsWith("/")) return value;
  return `/covers/${value}`;
}

function formatAnimeTypeLabel(
  type?: AdminFansubAnimeEntry["type"] | null,
): string | null {
  switch (type) {
    case "film":
      return "Film";
    case "ova":
      return "OVA";
    case "ona":
      return "ONA";
    case "special":
      return "Special";
    case "bonus":
      return "Bonus";
    case "web":
      return "Web";
    case "tv":
      return "TV-Serie";
    default:
      return null;
  }
}

function parseClockSeconds(raw?: string | null): number | null {
  const value = (raw || "").trim();
  if (!value) return null;
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (
    parts.length === 0 ||
    parts.length > 3 ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  )
    return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function knownPositiveSeconds(value?: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function releaseTimelineMaxSeconds(
  release: AdminFansubRelease,
  cards: ReleaseSegmentCard[],
): number {
  const knownDurations = [
    knownPositiveSeconds(release.duration_seconds),
    ...cards.flatMap((card) =>
      card.segments.flatMap((segment) => [
        knownPositiveSeconds(segment.playback_duration_seconds),
        parseClockSeconds(segment.end_time),
      ]),
    ),
  ].filter((value): value is number => value != null && value > 0);

  return Math.max(1, ...knownDurations);
}

function compactThemeKind(name: string): "op" | "ed" | "insert" | "other" {
  const normalized = name.toLowerCase();
  if (normalized.includes("op") || normalized.includes("opening")) return "op";
  if (normalized.includes("ed") || normalized.includes("ending")) return "ed";
  if (
    normalized.includes("insert") ||
    normalized === "in" ||
    normalized.includes("pv")
  )
    return "insert";
  return "other";
}

function timelineLaneFor(name: string): "opEd" | "insert" {
  const kind = compactThemeKind(name);
  return kind === "insert" || kind === "other" ? "insert" : "opEd";
}

function timelineLabelFor(name: string): string {
  const kind = compactThemeKind(name);
  if (kind === "op") return "OP";
  if (kind === "ed") return "ED";
  if (kind === "insert") return "IN";
  return name.slice(0, 3).toUpperCase();
}

function timelineStatusLabelFor(status: ReleaseSegmentStatus): string {
  if (status === "global") return "Global";
  if (status === "release") return "Uploadet";
  return "Fehlt";
}

function episodeReleaseTitle(release: AdminFansubRelease): string {
  const episode = `Episode ${release.episode_number || "?"}`;
  const title = (release.episode_title || "").trim();
  return title ? `${episode}: ${title}` : episode;
}

function animeFansubReleaseContextKey(
  fansubID: number,
  animeID: number,
): string {
  return `${fansubID}:${animeID}`;
}

function releaseDrawerTitle(release: AdminFansubRelease): string {
  const episode = release.episode_number || "?";
  const title = (release.episode_title || "").trim();
  return `${release.anime_title} E${episode}${title ? ` - ${title}` : ""}`;
}

function themeSegmentEpisodeRange(
  segment?: AdminAnimeThemeSegment | null,
): string {
  if (!segment) return "Keine Episode gesetzt";
  const start =
    segment.start_episode_number ||
    (segment.start_episode != null ? String(segment.start_episode) : null);
  const end =
    segment.end_episode_number ||
    (segment.end_episode != null ? String(segment.end_episode) : null);
  if (start && end && start !== end) return `${start} - ${end}`;
  if (start || end) return start || end || "Keine Episode gesetzt";
  return "Keine Episode gesetzt";
}

function themeSegmentTimeRange(
  segment?: AdminAnimeThemeSegment | null,
): string {
  if (!segment) return "Keine Zeit gesetzt";
  const start = segment.start_time?.trim();
  const end = segment.end_time?.trim();
  if (start && end) return `${start} - ${end}`;
  if (start || end) return `${start || "?"} - ${end || "?"}`;
  return "Keine Zeit gesetzt";
}

function isJellyfinLocked(card: ReleaseSegmentCard): boolean {
  return card.segments.some(
    (item) =>
      item.source_type === "jellyfin_theme" ||
      item.playback_source_kind === "jellyfin",
  );
}

function releaseAssetRequiredBySegment(
  segment: AdminAnimeThemeSegment,
): boolean {
  return segment.source_type === "release_asset";
}

function releaseAssetRequirementLabel(
  segments: AdminAnimeThemeSegment[],
): string {
  const hasSegmentFallback = segments.some((segment) => {
    const sourceRef = segment.source_ref?.trim();
    return (
      Boolean(sourceRef) || segment.playback_source_kind === "uploaded_asset"
    );
  });

  return hasSegmentFallback
    ? "Segment-Fallback vorhanden - Upload für diese Fansubgruppe fehlt"
    : "Upload fehlt - Upload durch Fansubgruppe erforderlich";
}

function releaseThemeSelectionKey(releaseID: number, themeID: number): string {
  return `${releaseID}:${themeID}`;
}

function mapGroupToForm(group: FansubGroup): FormState {
  return {
    name: group.name || "",
    slug: group.slug || "",
    status: group.status,
    groupType: group.group_type,
    country: group.country || "",
    foundedYear: group.founded_year ? String(group.founded_year) : "",
    dissolvedYear: group.dissolved_year ? String(group.dissolved_year) : "",
  };
}

function mapGroupMedia(group: FansubGroup): {
  logo: EditableMediaValue | null;
  banner: EditableMediaValue | null;
} {
  const logo = group.logo_url
    ? { id: group.logo_id ?? null, publicURL: group.logo_url }
    : null;
  const banner = group.banner_url
    ? { id: group.banner_id ?? null, publicURL: group.banner_url }
    : null;
  return { logo, banner };
}

function mapGroupLinks(group: FansubGroup): CommunityLinkDraft[] {
  const links =
    group.links && group.links.length > 0
      ? group.links
      : legacyLinksFromGroup(group);
  return links.map((link, index) => ({
    key: `${link.id}-${index}`,
    id: link.id,
    link_type: link.link_type,
    name: link.name || "",
    url: link.url || "",
  }));
}

function legacyLinksFromGroup(group: FansubGroup): FansubGroupLink[] {
  const links: FansubGroupLink[] = [];
  if (group.website_url) {
    links.push({
      id: -1,
      group_id: group.id,
      link_type: "website",
      name: null,
      url: group.website_url,
      created_at: group.updated_at,
    });
  }
  if (group.discord_url) {
    links.push({
      id: -2,
      group_id: group.id,
      link_type: "discord",
      name: null,
      url: group.discord_url,
      created_at: group.updated_at,
    });
  }
  if (group.irc_url) {
    links.push({
      id: -3,
      group_id: group.id,
      link_type: "irc",
      name: null,
      url: group.irc_url,
      created_at: group.updated_at,
    });
  }
  return links;
}

function formToPayload(
  form: FormState,
  logo: EditableMediaValue | null,
  banner: EditableMediaValue | null,
): FansubGroupPatchRequest {
  const founded = parseYear(form.foundedYear);
  const dissolved = parseYear(form.dissolvedYear);
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    status: form.status,
    group_type: form.groupType,
    country: toOptional(form.country),
    founded_year: founded === null ? null : founded,
    dissolved_year: dissolved === null ? null : dissolved,
    logo_id: logo?.id ?? null,
    banner_id: banner?.id ?? null,
    logo_url: logo?.publicURL?.trim() ? logo.publicURL.trim() : null,
    banner_url: banner?.publicURL?.trim() ? banner.publicURL.trim() : null,
  };
}

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    status: "active",
    groupType: "group",
    country: "",
    foundedYear: "",
    dissolvedYear: "",
  };
}

function createEmptyLink(): CommunityLinkDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    link_type: "website",
    name: "",
    url: "",
  };
}

function labelForFansubStatus(status: FansubStatus): string {
  return STATUS_LABELS[status] || status;
}

function createBannerEdgeFillDataURL(
  image: HTMLImageElement,
  side: "left" | "right",
): string {
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const sampleWidth = Math.max(1, Math.min(3, sourceWidth));
  const sourceX = side === "left" ? 0 : Math.max(0, sourceWidth - sampleWidth);
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(
    image,
    sourceX,
    0,
    sampleWidth,
    sourceHeight,
    0,
    0,
    sampleWidth,
    sourceHeight,
  );
  return canvas.toDataURL("image/png");
}

async function loadBannerEdgeFills(
  imageURL: string,
): Promise<BannerEdgeFills | null> {
  if (!imageURL.trim()) return null;
  return await new Promise<BannerEdgeFills | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () =>
      resolve({
        left: createBannerEdgeFillDataURL(image, "left"),
        right: createBannerEdgeFillDataURL(image, "right"),
      });
    image.onerror = () => resolve(null);
    image.src = imageURL;
  });
}

function errMessage(error: unknown): string {
  return error instanceof ApiError
    ? `(${error.status}) ${error.message}`
    : "Anfrage fehlgeschlagen.";
}

function mapReleaseSegmentCards(
  themes: AdminAnimeTheme[],
  themeAssets: AdminReleaseThemeAsset[],
  segmentsByThemeID: Map<number, AdminAnimeThemeSegment[]>,
): ReleaseSegmentCard[] {
  const assetByThemeID = new Map(
    themeAssets.map((asset) => [asset.theme_id, asset]),
  );

  return themes.map((theme) => {
    const asset = assetByThemeID.get(theme.id);
    const segments = segmentsByThemeID.get(theme.id) ?? [];
    if (asset) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "release",
        segments,
        media_id: asset.media_id,
        public_url: asset.public_url,
        source_label: "Upload vorhanden",
      };
    }

    if (segments.some(releaseAssetRequiredBySegment)) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "missing",
        segments,
        source_label: releaseAssetRequirementLabel(segments),
      };
    }

    if (segments.length > 0) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: "global",
        segments,
        source_label: `${segments.length} Segment${segments.length === 1 ? "" : "e"} global gesetzt`,
      };
    }

    return {
      theme_id: theme.id,
      theme_type_name: theme.theme_type_name,
      theme_title: theme.title,
      status: "missing",
      segments,
      source_label: "Noch kein Segment für diese Theme-Definition",
    };
  });
}

function mergeReleaseThemeAssetCard(
  cards: ReleaseSegmentCard[],
  asset: AdminReleaseThemeAsset,
): ReleaseSegmentCard[] {
  const nextCard = (previous?: ReleaseSegmentCard): ReleaseSegmentCard => ({
    theme_id: asset.theme_id,
    theme_type_name: asset.theme_type_name,
    theme_title: asset.theme_title,
    status: "release",
    segments: previous?.segments ?? [],
    media_id: asset.media_id,
    public_url: asset.public_url,
    source_label: "Upload vorhanden",
  });

  let replaced = false;
  const nextCards = cards.map((card) => {
    if (card.theme_id !== asset.theme_id) return card;
    replaced = true;
    return nextCard(card);
  });

  return replaced ? nextCards : [...nextCards, nextCard()];
}

async function syncFansubLinks(
  fansubID: number,
  initialLinks: CommunityLinkDraft[],
  currentLinks: CommunityLinkDraft[],
): Promise<void> {
  const initialById = new Map(
    initialLinks
      .filter((item) => item.id != null && item.id > 0)
      .map((item) => [item.id as number, item]),
  );
  const currentById = new Map(
    currentLinks
      .filter((item) => item.id != null && item.id > 0)
      .map((item) => [item.id as number, item]),
  );

  for (const [id] of initialById) {
    if (!currentById.has(id)) {
      await deleteFansubLink(fansubID, id);
    }
  }

  for (const link of currentLinks) {
    const url = link.url.trim();
    const name = link.name.trim();
    if (!url && !name) continue;
    if (link.id != null && link.id > 0) {
      const previous = initialById.get(link.id);
      if (
        !previous ||
        previous.link_type !== link.link_type ||
        previous.name.trim() !== name ||
        previous.url.trim() !== url
      ) {
        await updateFansubLink(fansubID, link.id, {
          link_type: link.link_type,
          name: name || null,
          url,
        });
      }
      continue;
    }

    await createFansubLink(fansubID, {
      link_type: link.link_type,
      name: name || null,
      url,
    });
  }
}

function AdminFansubEditContent() {
  const params = useParams<{ id: string }>();
  const fansubID = Number.parseInt((params.id || "").trim(), 10);
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
  const [visibleReleaseCountByAnimeKey, setVisibleReleaseCountByAnimeKey] =
    useState<Record<string, number>>({});
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("basic");
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
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [drawerUploadProgress, setDrawerUploadProgress] = useState<
    number | null
  >(null);
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
      "anime-projekte": true,
      notes: true,
    },
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aliasBusy, setAliasBusy] = useState(false);
  const [logoMedia, setLogoMedia] = useState<EditableMediaValue | null>(null);
  const [bannerMedia, setBannerMedia] = useState<EditableMediaValue | null>(
    null,
  );
  const [bannerEdgeFills, setBannerEdgeFills] =
    useState<BannerEdgeFills | null>(null);
  const [bannerSideWidths, setBannerSideWidths] = useState<BannerSideWidths>({
    left: 0,
    right: 0,
  });
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
  const bannerShellRef = useRef<HTMLDivElement | null>(null);
  const bannerImageRef = useRef<HTMLImageElement | null>(null);
  const themeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const releaseRequestSeqRef = useRef(0);
  const releaseRequestByContextRef = useRef<Record<string, number>>({});
  const releaseDrawerRequestSeqRef = useRef(0);
  const releaseSegmentRequestSeqRef = useRef(0);
  const releaseSegmentRequestByReleaseRef = useRef<Record<number, number>>({});
  const themeDrawerOpenRef = useRef(false);
  const themeDrawerSelectionKeyRef = useRef<string | null>(null);
  const { hasAccessToken, isClientInitialized } = useAuthSession();

  const resetReleaseWorkspaceState = () => {
    setReleasesByAnimeFansubGroupId({});
    setReleasesLoadingByAnimeFansubGroupId({});
    setReleasesErrorsByAnimeFansubGroupId({});
    setVisibleReleaseCountByAnimeKey({});
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
    setDrawerRelease(null);
    setDrawerReleaseLoading(false);
    setDrawerReleaseError(null);
    setDrawerError(null);
    setDrawerUploadProgress(null);
    releaseRequestByContextRef.current = {};
    releaseSegmentRequestByReleaseRef.current = {};
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = "";
    }
  };

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
    if (!Number.isFinite(fansubID) || fansubID <= 0 || !hasAccessToken) {
      setReleaseGroups([]);
      setReleaseGroupsError(null);
      setReleaseGroupsLoading(false);
      resetReleaseWorkspaceState();
      return;
    }

    let active = true;
    setReleaseGroupsLoading(true);
    setReleaseGroupsError(null);
    resetReleaseWorkspaceState();

    getAdminFansubAnime(fansubID)
      .then((animeResponse) => {
        if (!active) return;
        setReleaseGroups(
          animeResponse.data.map((anime) => ({
            key: animeFansubReleaseContextKey(fansubID, anime.id),
            anime,
          })),
        );
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
      releaseRequestByContextRef.current = {};
      releaseSegmentRequestByReleaseRef.current = {};
    };
  }, [hasAccessToken, fansubID]);

  useEffect(() => {
    if (manualSlug) return;
    setForm((current) => ({ ...current, slug: slugify(current.name) }));
  }, [form.name, manualSlug]);

  useEffect(() => {
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
  }, [fansubID, form.slug]);

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
    slugValue.length === 0
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
    !hasAccessToken ||
    Boolean(nameError) ||
    Boolean(slugFormatError) ||
    slugConflict ||
    Boolean(foundedError) ||
    Boolean(dissolvedError) ||
    Boolean(dissolvedAfterFoundedError) ||
    linkErrors.some(Boolean) ||
    slugChecking ||
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
    setDrawerError(null);
    setDrawerUploadProgress(null);
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
    if (!hasAccessToken) return null;
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
    const { release, animeID, fansubGroupID, contextKey } = context;
    const requestID = releaseDrawerRequestSeqRef.current + 1;
    releaseDrawerRequestSeqRef.current = requestID;

    setSelectedReleaseId(release.release_id);
    setSelectedAnimeFansubContextKey(contextKey);
    setSelectedAnimeId(animeID);
    setSelectedFansubGroupId(fansubGroupID);
    setReleaseDrawerOpen(true);
    setThemeDrawerOpen(false);
    setSelectedReleaseSegment(null);
    setDrawerRelease(release);
    setDrawerTab("details");
    setDrawerBusy(false);
    resetThemeDrawerTransientState();
    setDrawerReleaseError(null);
    setDrawerReleaseLoading(hasAccessToken);
    setExpandedReleaseIds((current) =>
      new Set(current).add(release.release_id),
    );
    void loadReleaseSegmentCards(release);

    if (!hasAccessToken) {
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
  ) => {
    if (!Number.isFinite(fansubID) || fansubID <= 0 || !hasAccessToken) return;
    const contextKey = releaseGroup.key;
    if (
      !force &&
      (releasesByAnimeFansubGroupId[contextKey] ||
        releasesLoadingByAnimeFansubGroupId[contextKey])
    )
      return;

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
      );
      if (releaseRequestByContextRef.current[contextKey] !== requestID) return;
      setReleasesByAnimeFansubGroupId((current) => ({
        ...current,
        [contextKey]: response.data,
      }));
      setVisibleReleaseCountByAnimeKey((current) => ({
        ...current,
        [contextKey]: INITIAL_RELEASE_BATCH_SIZE,
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
    contextKey: string,
    totalCount: number,
    event: UIEvent<HTMLDivElement>,
  ) => {
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight < target.scrollHeight - 40)
      return;

    setVisibleReleaseCountByAnimeKey((current) => {
      const currentCount = current[contextKey] ?? INITIAL_RELEASE_BATCH_SIZE;
      if (currentCount >= totalCount) return current;
      return {
        ...current,
        [contextKey]: Math.min(
          currentCount + INITIAL_RELEASE_BATCH_SIZE,
          totalCount,
        ),
      };
    });
  };

  const toggleAnime = (releaseGroup: FansubReleaseGroup) => {
    setExpandedAnimeKeys((current) => {
      const next = new Set(current);
      if (next.has(releaseGroup.key)) {
        next.delete(releaseGroup.key);
        setVisibleReleaseCountByAnimeKey((visibleCurrent) => ({
          ...visibleCurrent,
          [releaseGroup.key]: INITIAL_RELEASE_BATCH_SIZE,
        }));
      } else {
        next.add(releaseGroup.key);
        setVisibleReleaseCountByAnimeKey((visibleCurrent) => ({
          ...visibleCurrent,
          [releaseGroup.key]: INITIAL_RELEASE_BATCH_SIZE,
        }));
        void loadAnimeReleases(releaseGroup);
      }
      return next;
    });
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
    if (!file || !selectedReleaseSegment || !hasAccessToken) return;
    const release = selectedReleaseSegment.release;
    const themeID = selectedReleaseSegment.card.theme_id;
    const selectionKey = releaseThemeSelectionKey(release.release_id, themeID);
    const isCurrentSelection = () =>
      themeDrawerOpenRef.current &&
      themeDrawerSelectionKeyRef.current === selectionKey;
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
      if (!refreshedCards) {
        setReleaseSegmentErrors((current) => ({
          ...current,
          [release.release_id]: null,
        }));
      }
      setToast("Theme-Asset gespeichert.");
      if (isCurrentSelection()) {
        setDrawerUploadProgress(null);
        clearThemeUploadInput();
      }
    } catch (nextError) {
      if (isCurrentSelection()) setDrawerError(errMessage(nextError));
    } finally {
      setDrawerBusy(false);
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
      !hasAccessToken ||
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
    setDrawerBusy(true);
    setDrawerError(null);
    try {
      await deleteAdminReleaseThemeAsset(release.release_id, themeID, mediaID);
      await loadReleaseSegmentCards(release, true);
      if (isCurrentSelection()) {
        setSelectedReleaseSegment(null);
        closeThemeDrawer();
      }
      setToast("Theme-Asset entfernt.");
    } catch (nextError) {
      if (isCurrentSelection()) setDrawerError(errMessage(nextError));
    } finally {
      setDrawerBusy(false);
    }
  };

  const addAlias = async () => {
    const value = aliasInput.trim();
    if (!value || !hasAccessToken) return;
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
    if (!hasAccessToken) return;
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
    if (!hasAccessToken || invalid) return;
    setSaving(true);
    setError(null);
    try {
      await updateFansubGroup(
        fansubID,
        formToPayload(form, logoMedia, bannerMedia),
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

  const removeGroup = async () => {
    if (!group || !hasAccessToken) return;
    if (
      !window.confirm(
        "Fansub löschen? Episoden bleiben erhalten, Zuordnung wird entfernt.",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteFansubGroup(group.id);
      window.location.href = "/admin/fansubs";
    } catch (nextError) {
      setError(errMessage(nextError));
      setDeleting(false);
    }
  };

  const logoFallback = buildFansubLogoFallback(form.name);
  const bannerPreviewURL = buildMediaPreviewURL(bannerMedia);
  const logoPreviewURL = buildMediaPreviewURL(logoMedia);

  useEffect(() => {
    let active = true;
    if (!bannerPreviewURL) {
      setBannerEdgeFills(null);
      return () => {
        active = false;
      };
    }

    void loadBannerEdgeFills(bannerPreviewURL).then((fills) => {
      if (!active) return;
      setBannerEdgeFills(fills);
    });

    return () => {
      active = false;
    };
  }, [bannerPreviewURL]);

  useEffect(() => {
    const shell = bannerShellRef.current;
    const image = bannerImageRef.current;
    if (!shell || !image) {
      setBannerSideWidths({ left: 0, right: 0 });
      return;
    }

    const measure = () => {
      const shellRect = shell.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const left = Math.max(0, Math.round(imageRect.left - shellRect.left) + 8);
      const right = Math.max(
        0,
        Math.round(shellRect.right - imageRect.right) + 8,
      );
      setBannerSideWidths((current) =>
        current.left === left && current.right === right
          ? current
          : { left, right },
      );
    };

    measure();

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(shell);
    resizeObserver.observe(image);
    window.addEventListener("resize", measure);

    if (!image.complete) {
      image.addEventListener("load", measure);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      image.removeEventListener("load", measure);
    };
  }, [bannerPreviewURL]);

  if (loading)
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p>Lade...</p>
        </section>
      </main>
    );

  const showBannerSideFills =
    bannerSideWidths.left > 12 || bannerSideWidths.right > 12;
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
  const tabUsesLeftWorkspace = activeMainTab === "basic";
  const tabUsesRightWorkspace =
    activeMainTab === "media" ||
    activeMainTab === "links" ||
    activeMainTab === "collaboration";
  const fansubEditColumnsClassName = `${styles.fansubEditColumns}${tabUsesLeftWorkspace ? ` ${styles.fansubEditColumnsSingleLeft}` : ""}${tabUsesRightWorkspace ? ` ${styles.fansubEditColumnsSingleRight}` : ""}`;
  const releaseDrawerTabs = drawerRelease
    ? [
        { key: "details" as const, label: "Details", disabled: false },
        { key: "media" as const, label: "Media", disabled: false },
      ]
    : [];

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link> /{" "}
        <Link href="/admin/fansubs">Fansubs</Link>
      </p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <section className={styles.panel}>
        <header className={styles.fansubEditHeaderCard}>
          <div className={styles.fansubEditBannerShell} ref={bannerShellRef}>
            {bannerPreviewURL ? (
              <>
                {showBannerSideFills ? (
                  <>
                    <div
                      className={`${styles.fansubEditBannerSideFill} ${styles.fansubEditBannerSideFillLeft}`}
                      style={
                        bannerEdgeFills?.left
                          ? {
                              backgroundImage: `url(${bannerEdgeFills.left})`,
                              width: `${bannerSideWidths.left}px`,
                            }
                          : undefined
                      }
                      aria-hidden="true"
                    />
                    <div
                      className={`${styles.fansubEditBannerSideFill} ${styles.fansubEditBannerSideFillRight}`}
                      style={
                        bannerEdgeFills?.right
                          ? {
                              backgroundImage: `url(${bannerEdgeFills.right})`,
                              width: `${bannerSideWidths.right}px`,
                            }
                          : undefined
                      }
                      aria-hidden="true"
                    />
                    <div
                      className={styles.fansubEditBannerEdgeFade}
                      aria-hidden="true"
                    />
                  </>
                ) : null}
                <div className={styles.fansubEditBannerImage}>
                  <Image
                    ref={bannerImageRef}
                    src={bannerPreviewURL}
                    alt=""
                    className={styles.fansubEditBannerImageElement}
                    width={1200}
                    height={180}
                    unoptimized
                  />
                </div>
              </>
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
              <p className={styles.fansubEditUrlPreview}>
                /fansubs/{form.slug.trim() || "slug"}
              </p>
            </div>
          </div>
          <nav
            className={styles.fansubEditMainTabRow}
            aria-label="Fansub Bearbeitungsbereiche"
          >
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.fansubEditMainTabButton} ${activeMainTab === tab.key ? styles.fansubEditMainTabButtonActive : ""}`}
                onClick={() => setActiveMainTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeMainTab !== "releases" &&
        activeMainTab !== "anime-projekte" &&
        activeMainTab !== "notes" ? (
          <form className={styles.fansubEditForm} onSubmit={save}>
            <div className={styles.fansubEditStickyActions}>
              <button
                type="submit"
                className={styles.button}
                disabled={invalid || saving || deleting}
              >
                <Save size={14} />
                {saving ? "Speichern..." : "Speichern"}
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() =>
                  dirty &&
                  !window.confirm("Ungespeicherte Änderungen verwerfen?")
                    ? undefined
                    : (window.location.href = "/admin/fansubs")
                }
              >
                <X size={14} />
                Abbrechen
              </button>
              <button
                type="button"
                className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                onClick={() => void removeGroup()}
                disabled={saving || deleting}
              >
                <Trash2 size={14} />
                {deleting ? "Loesche..." : "Löschen"}
              </button>
            </div>
            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {isClientInitialized && !hasAccessToken ? (
              <div className={styles.errorBox}>
                Anmeldung erforderlich. Bitte zuerst auf /auth ein gültiges
                Token erstellen.
              </div>
            ) : null}

            <div className={fansubEditColumnsClassName}>
              {tabUsesLeftWorkspace ? (
                <div className={styles.fansubEditLeftColumn}>
                  {activeMainTab === "basic" ? (
                    <details
                      className={styles.fansubEditSection}
                      open={isSectionOpen("basic")}
                      onToggle={(event) =>
                        onSectionToggle("basic", event.currentTarget.open)
                      }
                    >
                      <summary className={styles.fansubEditSectionSummary}>
                        Grunddaten
                      </summary>
                      <div className={styles.fansubEditSectionBody}>
                        <div className={styles.fansubEditBasicIntro}>
                          <div>
                            <p className={styles.fansubEditBasicEyebrow}>
                              Profil
                            </p>
                            <h3 className={styles.fansubEditBasicTitle}>
                              Redaktionelle Kerndaten
                            </h3>
                            <p className={styles.fansubEditHint}>
                              Name, Slug und zeitliche Einordnung der
                              Fansub-Gruppe. Der Gruppentyp ist hier bewusst
                              ausgeblendet, weil dieser Bereich ausschließlich
                              reguläre Gruppen pflegt.
                            </p>
                          </div>
                          <div className={styles.fansubEditBasicStatusCard}>
                            <span>Aktueller Status</span>
                            <strong>{labelForFansubStatus(form.status)}</strong>
                          </div>
                        </div>
                        <div className={styles.fansubEditBasicSurface}>
                          <div className={styles.fansubEditBasicGrid}>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
                            >
                              <label>
                                Name{" "}
                                <span className={styles.fansubEditRequired}>
                                  *
                                </span>
                              </label>
                              <input
                                value={form.name}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    name: e.target.value,
                                  }))
                                }
                                required
                                minLength={2}
                                aria-invalid={Boolean(nameError)}
                                className={
                                  nameError
                                    ? styles.fansubEditInputInvalid
                                    : undefined
                                }
                              />
                              {nameError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {nameError}
                                </p>
                              ) : null}
                            </div>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField} ${styles.fansubEditBasicFieldWide}`}
                            >
                              <label>
                                Slug{" "}
                                <span className={styles.fansubEditRequired}>
                                  *
                                </span>
                              </label>
                              <div className={styles.fansubEditSlugRow}>
                                <input
                                  value={form.slug}
                                  onChange={(e) => {
                                    setManualSlug(true);
                                    setForm((c) => ({
                                      ...c,
                                      slug: e.target.value,
                                    }));
                                  }}
                                  aria-invalid={
                                    Boolean(slugFormatError) || slugConflict
                                  }
                                  className={
                                    slugFormatError || slugConflict
                                      ? styles.fansubEditInputInvalid
                                      : undefined
                                  }
                                />
                                <button
                                  type="button"
                                  className={styles.buttonSecondary}
                                  onClick={() => {
                                    setManualSlug(false);
                                    setForm((c) => ({
                                      ...c,
                                      slug: slugify(c.name),
                                    }));
                                  }}
                                >
                                  Auto
                                </button>
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
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField}`}
                            >
                              <label>
                                Status{" "}
                                <span className={styles.fansubEditRequired}>
                                  *
                                </span>
                              </label>
                              <select
                                value={form.status}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    status: e.target.value as FansubStatus,
                                  }))
                                }
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {labelForFansubStatus(s)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div
                              className={`${styles.field} ${styles.fansubEditBasicField}`}
                            >
                              <label>Land</label>
                              <input
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
                              <label>Gründungsjahr</label>
                              <input
                                type="number"
                                min={YEAR_MIN}
                                max={YEAR_MAX}
                                inputMode="numeric"
                                value={form.foundedYear}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    foundedYear: e.target.value,
                                  }))
                                }
                                placeholder="YYYY"
                                aria-invalid={Boolean(foundedError)}
                                className={
                                  foundedError
                                    ? styles.fansubEditInputInvalid
                                    : undefined
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
                              <label>Auflösungsjahr</label>
                              <input
                                type="number"
                                min={YEAR_MIN}
                                max={YEAR_MAX}
                                inputMode="numeric"
                                value={form.dissolvedYear}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    dissolvedYear: e.target.value,
                                  }))
                                }
                                placeholder="YYYY"
                                aria-invalid={
                                  Boolean(dissolvedError) ||
                                  Boolean(dissolvedAfterFoundedError)
                                }
                                className={
                                  dissolvedError || dissolvedAfterFoundedError
                                    ? styles.fansubEditInputInvalid
                                    : undefined
                                }
                              />
                              {dissolvedError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {dissolvedError}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className={styles.fansubEditBasicSupplementGrid}>
                          <div className={styles.fansubEditBasicSupplement}>
                            <div
                              className={styles.fansubEditBasicSupplementHeader}
                            >
                              <div>
                                <p className={styles.fansubEditBasicEyebrow}>
                                  Aliase
                                </p>
                                <h4
                                  className={
                                    styles.fansubEditBasicSupplementTitle
                                  }
                                >
                                  Tags / Aliase direkt am Gruppennamen pflegen
                                </h4>
                                <p className={styles.fansubEditHint}>
                                  Alternative Gruppennamen gehören in denselben
                                  Pflegefluss wie Name und Slug.
                                </p>
                              </div>
                            </div>
                            <div
                              className={styles.fansubEditBasicSupplementBody}
                            >
                              <div className={styles.inputRow}>
                                <input
                                  value={aliasInput}
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
                                <button
                                  type="button"
                                  className={styles.buttonSecondary}
                                  onClick={() => void addAlias()}
                                  disabled={aliasBusy}
                                >
                                  Hinzufügen
                                </button>
                              </div>
                              {aliasError ? (
                                <p className={styles.fansubEditInlineError}>
                                  {aliasError}
                                </p>
                              ) : null}
                              <div className={styles.chipBox}>
                                <div className={styles.chipRow}>
                                  {aliases.map((alias) => (
                                    <button
                                      key={alias.id}
                                      type="button"
                                      className={`${styles.chip} ${styles.aliasChipDanger}`}
                                      onClick={() => void removeAlias(alias)}
                                      disabled={aliasBusy}
                                    >
                                      {alias.alias} x
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className={styles.fansubEditBasicSupplement}>
                            <div
                              className={styles.fansubEditBasicSupplementHeader}
                            >
                              <div>
                                <p className={styles.fansubEditBasicEyebrow}>
                                  Community
                                </p>
                                <h4
                                  className={
                                    styles.fansubEditBasicSupplementTitle
                                  }
                                >
                                  Community-Links direkt im Profil pflegen
                                </h4>
                                <p className={styles.fansubEditHint}>
                                  Website, Discord oder Social-Profile gehören
                                  direkt neben die Stammdaten der Gruppe.
                                </p>
                              </div>
                              <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={() =>
                                  setLinks((current) => [
                                    ...current,
                                    createEmptyLink(),
                                  ])
                                }
                              >
                                <Plus size={14} />
                                Link hinzufügen
                              </button>
                            </div>
                            <div
                              className={styles.fansubEditBasicSupplementBody}
                            >
                              <div className={styles.fansubEditLinksList}>
                                {links.map((link, index) => {
                                  const url = link.url.trim();
                                  const urlError = linkErrors[index];
                                  return (
                                    <div
                                      key={link.key}
                                      className={styles.fansubEditLinkRow}
                                    >
                                      <select
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
                                      </select>
                                      <input
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
                                        placeholder="Name (optional)"
                                      />
                                      <div
                                        className={`${styles.fansubEditLinkInput} ${urlError ? styles.fansubEditLinkInputInvalid : ""}`}
                                      >
                                        <input
                                          value={link.url}
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
                                          <button
                                            type="button"
                                            className={
                                              styles.fansubEditPreviewLinkButton
                                            }
                                            onClick={() =>
                                              window.open(
                                                url,
                                                "_blank",
                                                "noreferrer",
                                              )
                                            }
                                          >
                                            <ExternalLink size={14} />
                                          </button>
                                        ) : null}
                                      </div>
                                      <button
                                        type="button"
                                        className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                                        onClick={() =>
                                          setLinks((current) =>
                                            current.length === 1
                                              ? [createEmptyLink()]
                                              : current.filter(
                                                  (item) =>
                                                    item.key !== link.key,
                                                ),
                                          )
                                        }
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                      {urlError ? (
                                        <p
                                          className={
                                            styles.fansubEditInlineError
                                          }
                                        >
                                          {urlError}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        {dissolvedAfterFoundedError ? (
                          <p className={styles.fansubEditInlineError}>
                            {dissolvedAfterFoundedError}
                          </p>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {tabUsesRightWorkspace ? (
                <div className={styles.fansubEditRightColumn}>
                  {activeMainTab === "media" ? (
                    <details
                      className={styles.fansubEditSection}
                      open={isSectionOpen("media")}
                      onToggle={(event) =>
                        onSectionToggle("media", event.currentTarget.open)
                      }
                    >
                      <summary className={styles.fansubEditSectionSummary}>
                        Medien
                      </summary>
                      <div className={styles.fansubEditSectionBody}>
                        <div className={styles.fansubEditMediaGrid}>
                          <MediaUpload
                            type="logo"
                            fansubID={fansubID}
                            groupName={form.name.trim() || group?.name || ""}
                            value={logoMedia}
                            disabled={!hasAccessToken || saving || deleting}
                            onBusyChange={(isBusy) =>
                              setMediaBusy((current) => ({
                                ...current,
                                logo: isBusy,
                              }))
                            }
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
                            disabled={!hasAccessToken || saving || deleting}
                            onBusyChange={(isBusy) =>
                              setMediaBusy((current) => ({
                                ...current,
                                banner: isBusy,
                              }))
                            }
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
                      </div>
                    </details>
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
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() =>
                              setLinks((current) => [
                                ...current,
                                createEmptyLink(),
                              ])
                            }
                          >
                            <Plus size={14} />
                            Link hinzufügen
                          </button>
                        </div>
                        <div className={styles.fansubEditLinksList}>
                          {links.map((link, index) => {
                            const url = link.url.trim();
                            const urlError = linkErrors[index];
                            return (
                              <div
                                key={link.key}
                                className={styles.fansubEditLinkRow}
                              >
                                <select
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
                                </select>
                                <input
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
                                  placeholder="Name (optional)"
                                />
                                <div
                                  className={`${styles.fansubEditLinkInput} ${urlError ? styles.fansubEditLinkInputInvalid : ""}`}
                                >
                                  <input
                                    value={link.url}
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
                                    <button
                                      type="button"
                                      className={
                                        styles.fansubEditPreviewLinkButton
                                      }
                                      onClick={() =>
                                        window.open(url, "_blank", "noreferrer")
                                      }
                                    >
                                      <ExternalLink size={14} />
                                    </button>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                                  onClick={() =>
                                    setLinks((current) =>
                                      current.length === 1
                                        ? [createEmptyLink()]
                                        : current.filter(
                                            (item) => item.key !== link.key,
                                          ),
                                    )
                                  }
                                >
                                  <Trash2 size={14} />
                                </button>
                                {urlError ? (
                                  <p className={styles.fansubEditInlineError}>
                                    {urlError}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  ) : null}

                  {activeMainTab === "collaboration" ? (
                    <details
                      className={styles.fansubEditSection}
                      open={isSectionOpen("collaboration")}
                      onToggle={(event) =>
                        onSectionToggle(
                          "collaboration",
                          event.currentTarget.open,
                        )
                      }
                    >
                      <summary className={styles.fansubEditSectionSummary}>
                        Mitglieder
                      </summary>
                      <div className={styles.fansubEditSectionBody}>
                        <FansubAppMembersSection
                          fansubId={fansubID}
                          hasAccessToken={hasAccessToken}
                        />
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={styles.fansubEditMobileActionBar}>
              <button
                type="submit"
                className={styles.button}
                disabled={invalid || saving || deleting}
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
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
              {!releaseGroupsLoading &&
              !releaseGroupsError &&
              releaseGroups.length === 0 ? (
                <div className={styles.fansubEditReleaseState}>
                  Noch keine Anime/Releases mit dieser Fansubgruppe verknüpft.
                </div>
              ) : null}
              <div className={styles.fansubEditReleaseList}>
                {releaseGroups.map((releaseGroup) => {
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
                  const visibleReleaseCount =
                    visibleReleaseCountByAnimeKey[releaseGroup.key] ??
                    INITIAL_RELEASE_BATCH_SIZE;
                  const visibleReleases = releases.slice(
                    0,
                    visibleReleaseCount,
                  );
                  const releaseCountLabel = releasesLoaded
                    ? `Releases: ${releases.length}`
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
                  return (
                    <article
                      key={releaseGroup.key}
                      className={styles.fansubEditAnimeReleaseCard}
                    >
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
                                releaseGroup.key,
                                releases.length,
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
                            {visibleReleases.map((release) => {
                              const expanded = expandedReleaseIds.has(
                                release.release_id,
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
                                  key={release.release_id}
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
                                        Editieren
                                      </button>
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
                                                  key={card.theme_id}
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
        {activeMainTab === "anime-projekte" ? (
          <AnimeProjectNotesSection
            fansubId={fansubID}
            hasAccessToken={hasAccessToken}
          />
        ) : null}
        {activeMainTab === "notes" ? <NotesTab fansubId={fansubID} /> : null}
      </section>
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
              {drawerTab === "details" ? (
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

              {drawerTab === "media" ? (
                <div className={styles.fansubEditReleaseDrawerPanel}>
                  <ReleaseVersionMediaDrawerSummary
                    versionId={drawerRelease.release_id}
                    fansubName={drawerRelease.fansub_name}
                    releaseVersionLabel={`Release ${drawerRelease.release_id}`}
                  />
                </div>
              ) : null}
            </div>

            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={closeReleaseDrawer}
              >
                Schließen
              </button>
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
                  {themeSelectedCard.public_url ? (
                    <a
                      href={resolveApiUrl(themeSelectedCard.public_url)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.fansubEditReleaseDrawerMediaLink}
                    >
                      Aktuelles Asset öffnen
                    </a>
                  ) : null}
                  {themeSelectedLocked ? (
                    <p className={styles.fansubEditHint}>
                      Global/Jellyfin gesetzt - keine Fansub-Überschreibung in
                      diesem Schritt.
                    </p>
                  ) : (
                    <div className={styles.fansubEditReleaseDrawerDropzone}>
                      <div className={styles.fansubEditThemeUploadHeader}>
                        <strong>Theme-Video hochladen</strong>
                        {drawerUploadProgress !== null ? (
                          <span className={styles.fansubEditThemeUploadMeta}>
                            Upload: {drawerUploadProgress}%
                          </span>
                        ) : null}
                      </div>
                      <input
                        ref={themeUploadInputRef}
                        className={styles.fansubEditThemeUploadInput}
                        type="file"
                        accept="video/*"
                        disabled={drawerBusy || !hasAccessToken}
                        onChange={handleThemeUploadInputChange}
                      />
                      <div className={styles.fansubEditThemeUploadPicker}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => themeUploadInputRef.current?.click()}
                          disabled={drawerBusy || !hasAccessToken}
                        >
                          Datei wählen
                        </button>
                        <span className={styles.fansubEditThemeUploadFileName}>
                          {themeUploadName || "Keine Datei ausgewählt"}
                        </span>
                      </div>
                      <div className={styles.fansubEditThemeUploadActions}>
                        <button
                          type="button"
                          className={styles.button}
                          onClick={() => void handleDrawerUploadClick()}
                          disabled={drawerBusy || !hasAccessToken}
                        >
                          Upload starten
                        </button>
                        {themeSelectedCard.status === "release" &&
                        themeSelectedCard.media_id ? (
                          <button
                            type="button"
                            className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                            onClick={() => void handleDrawerDelete()}
                            disabled={drawerBusy}
                          >
                            Asset entfernen
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={closeThemeDrawer}
              >
                Schließen
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

export default function AdminFansubEditPage() {
  return (
    <PlatformAdminGate>
      <AdminFansubEditContent />
    </PlatformAdminGate>
  );
}
