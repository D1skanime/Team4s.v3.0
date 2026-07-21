import type { CSSProperties } from "react";

import {
  ApiError,
  getAnimeByID,
  getAnimeFansubs,
  getGroupAssets,
  getGroupContributors,
  getGroupDetail,
  getGroupProjectNote,
  getGroupReleaseDetail,
  getGroupReleaseListCursor,
  getGroupReleaseMedia,
  getGroupReleases,
  getGroupThemes,
  getPublicFansubProfileBySlug,
} from "@/lib/api";
import { buildFansubReleaseHref, buildPublicFansubProjectPath } from "@/lib/fansubProjectRoutes";
import {
  buildFansubProjectNavigation,
  type FansubProjectNavigation,
} from "@/lib/fansubProjectNavigation";
import { buildGroupNavigationGroups } from "@/lib/groupNavigation";
import { resolvePublicApiUrl } from "@/lib/publicApiUrl";
import type { PublicReleasePreview, PublicReleaseTimelineSegment } from "@/components/fansubs/PublicReleaseBlock";
import type { AnimeDetail } from "@/types/anime";
import type { FansubGroupSummary } from "@/types/fansub";
import type { EpisodeReleaseSummary, GroupDetail } from "@/types/group";
import type { GroupAssetsResponse } from "@/types/groupAsset";
import type {
  GroupContributorsResponse,
  GroupReleaseMediaResponse,
  GroupThemesResponse,
} from "@/types/groupContributors";
import { CATEGORY_LABELS, type ReleaseVersionMediaCategory } from "@/types/releaseVersionMedia";

export interface PublicFansubProjectRouteParams {
  id: string;
  groupId: string;
}

export interface PublicFansubProjectIDs {
  animeID: number;
  groupID: number;
}

export interface PublicFansubProjectPageData extends PublicFansubProjectIDs {
  group: GroupDetail;
  anime: AnimeDetail;
  groupAssetsResponse: GroupAssetsResponse | null;
  releaseEpisodes: EpisodeReleaseSummary[];
  publicReleasePreviews: PublicReleasePreview[];
  contributorsData: GroupContributorsResponse;
  themesData: GroupThemesResponse;
  releaseMediaData: GroupReleaseMediaResponse;
  projectNotesHtml: string | null;
  hasTeamContent: boolean;
  storyAvailable: boolean;
  hasReleases: boolean;
  hasThemes: boolean;
  hasMedia: boolean;
  navigationGroups: FansubGroupSummary[];
  fansubProjectNavigation: FansubProjectNavigation;
  breadcrumbItems: { label: string; href?: string }[];
  heroBackdropUrl: string | null;
  infoPanelBackgroundUrl: string | null;
  heroImageUrl: string | null;
  heroImageIsBanner: boolean;
  posterImage: string | null;
  heroStyle: CSSProperties | undefined;
  infoPanelStyle: CSSProperties | undefined;
  pageStyle: CSSProperties | undefined;
  canonicalProjectPath: string | null;
}

export type LoadPublicFansubProjectPageDataResult =
  | { status: "ok"; data: PublicFansubProjectPageData }
  | { status: "not-found" }
  | { status: "error"; animeID: number; groupID: number; message: string };

/** AO4-13: Geschichte nur bei vorhandenem Inhalt rendern (Projektnotiz hat Vorrang vor group.story). */
export function hasStoryContent(
  story: string | null | undefined,
  projectNotesHtml: string | null | undefined,
): boolean {
  return Boolean((projectNotesHtml ?? story)?.trim());
}

export function parsePublicFansubProjectRouteParams(
  params: PublicFansubProjectRouteParams,
): PublicFansubProjectIDs | null {
  const animeID = Number.parseInt(params.id, 10);
  const groupID = Number.parseInt(params.groupId, 10);
  if (
    Number.isNaN(animeID) ||
    animeID <= 0 ||
    Number.isNaN(groupID) ||
    groupID <= 0
  ) {
    return null;
  }
  return { animeID, groupID };
}

export { buildPublicFansubProjectPath };

const RELEASE_PREVIEW_LIMIT = 1;
const NOTE_EXCERPT_LENGTH = 150;

function stripHtmlExcerpt(bodyHtml: string): string {
  const plain = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > NOTE_EXCERPT_LENGTH ? `${plain.slice(0, NOTE_EXCERPT_LENGTH)}...` : plain;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatEpisodeLabel(release: EpisodeReleaseSummary): string {
  const label = release.episode_number_label?.trim();
  if (!label) return `Folge ${release.episode_number}`;
  return /^\d+$/.test(label) ? `Folge ${label}` : label;
}

function parseTimelineTime(value?: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
}

function buildTimelineSegment(
  segment: NonNullable<EpisodeReleaseSummary["timeline_segments"]>[number],
  durationSeconds: number | null | undefined,
  href: string,
): PublicReleaseTimelineSegment {
  const start = parseTimelineTime(segment.start_time) ?? 0;
  const end = parseTimelineTime(segment.end_time);
  const duration = Math.max(durationSeconds ?? 0, end ?? 0, start + 1);
  const rawWidth = end != null ? (Math.max(end - start, 1) / duration) * 100 : 14;
  const widthPercent = Math.min(Math.max(rawWidth, 4), 34);
  const leftPercent = Math.min(Math.max((start / duration) * 100, 0), 100 - widthPercent);
  const rawType = segment.type.toUpperCase();
  const type: PublicReleaseTimelineSegment["type"] =
    rawType === "OP" || rawType === "ED" || rawType === "KARA"
      ? rawType
      : rawType === "INSERT"
        ? "IN"
        : "OTHER";

  return {
    id: segment.id,
    type,
    label: segment.title || segment.type,
    leftPercent,
    widthPercent,
    href: `${href}?kara=${segment.id}&autoplay=1#op-ed-middle`,
    versionLabel: segment.version?.trim() || undefined,
  };
}

function buildPublicReleasePreview({
  animeID,
  groupID,
  release,
  detail,
  canonicalProjectPath,
}: {
  animeID: number;
  groupID: number;
  release: EpisodeReleaseSummary;
  detail: Awaited<ReturnType<typeof getGroupReleaseDetail>> | null;
  canonicalProjectPath: string | null;
}): PublicReleasePreview {
  const href = buildFansubReleaseHref({ animeID, groupID, releaseVersionID: release.id, canonicalProjectPath });
  const detailImages = detail?.images ?? [];
  const imagePreviews = detailImages
    .slice(0, 4)
    .map((image) => {
      const src = image.thumbnail_url ?? image.original_url;
      if (!src) return null;
      const categoryLabel = CATEGORY_LABELS[image.category as ReleaseVersionMediaCategory] ?? "Bild";
      return {
        id: image.id,
        src: resolvePublicApiUrl(src),
        label: image.caption?.trim() || categoryLabel,
        alt: image.caption?.trim() || categoryLabel,
      };
    })
    .filter((image): image is NonNullable<typeof image> => Boolean(image));

  return {
    id: release.id,
    href,
    episodeLabel: formatEpisodeLabel(release),
    title: detail?.title ?? release.title ?? "",
    versionLabel: release.version_label ?? undefined,
    releasedAtLabel: release.released_at ?? undefined,
    durationLabel: formatDuration(release.duration_seconds),
    imageCount: detail?.images_count ?? release.images_count ?? 0,
    noteCount: detail?.notes_count ?? release.notes_count ?? 0,
    contributorCount: detail?.contributors_count ?? release.contributors_count ?? 0,
    heroImage: imagePreviews[0],
    imagePreviews,
    notePreviews: (detail?.notes ?? []).slice(0, 2).map((note) => ({
      id: note.id,
      author: note.member_name,
      excerpt: stripHtmlExcerpt(note.body_html),
    })),
    contributors: (detail?.contributors ?? []).slice(0, 6).map((contributor) => ({
      id: contributor.member_id,
      name: contributor.name,
      roleLabel: contributor.role_label,
    })),
    timelineSegments: (release.timeline_segments ?? []).map((segment) =>
      buildTimelineSegment(segment, release.duration_seconds, href),
    ),
  };
}

export async function resolvePublicFansubProjectCanonicalPath({
  animeID,
  groupID,
}: PublicFansubProjectIDs): Promise<string | null> {
  try {
    const groupResponse = await getGroupDetail(animeID, groupID);
    const fansubSlug = groupResponse.data.fansub.slug?.trim();
    if (!fansubSlug) return null;

    const profileResponse = await getPublicFansubProfileBySlug(fansubSlug);
    const project = profileResponse.data.projects.find(
      (item) => item.id === animeID && Boolean(item.anime_slug?.trim()),
    );
    if (!project) return null;

    return buildPublicFansubProjectPath(fansubSlug, project.anime_slug);
  } catch {
    return null;
  }
}

/** Führt einen SSR-Fetch aus und liefert bei Fehler exakt den bisherigen Fallback-Wert. */
async function withFallback<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}

/** Leitet den canonicalProjectPath aus EINEM (bereits gestarteten) Profil-Promise ab. */
async function resolveCanonicalProjectPath(
  profilePromise: ReturnType<typeof getPublicFansubProfileBySlug> | null,
  fansubSlug: string | undefined,
  animeID: number,
): Promise<string | null> {
  if (!profilePromise || !fansubSlug) return null;
  try {
    const profile = await profilePromise;
    const project = profile.data.projects.find((item) => item.id === animeID && item.anime_slug?.trim());
    return project?.anime_slug ? buildPublicFansubProjectPath(fansubSlug, project.anime_slug) : null;
  } catch {
    return null;
  }
}

export async function loadPublicFansubProjectPageData({
  animeID,
  groupID,
}: PublicFansubProjectIDs): Promise<LoadPublicFansubProjectPageDataResult> {
  let groupResponse: Awaited<ReturnType<typeof getGroupDetail>> | null = null;
  let animeResponse: Awaited<ReturnType<typeof getAnimeByID>> | null = null;
  let errorMessage: string | null = null;

  try {
    [groupResponse, animeResponse] = await Promise.all([
      getGroupDetail(animeID, groupID),
      getAnimeByID(animeID),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { status: "not-found" };
    }
    errorMessage = "Gruppendetails konnten nicht geladen werden.";
  }

  if (!groupResponse || !animeResponse) {
    return {
      status: "error",
      animeID,
      groupID,
      message: errorMessage ?? "Fehler beim Laden der Seite.",
    };
  }

  const group = groupResponse.data;
  const anime = animeResponse.data;
  // Ein einziger Profil-Fetch versorgt sowohl canonicalProjectPath als auch die
  // Projekt-Navigation (identischer Slug, dasselbe aufgeloeste Profil).
  const canonicalFansubSlug = group.fansub.slug?.trim();
  const profilePromise = canonicalFansubSlug ? getPublicFansubProfileBySlug(canonicalFansubSlug) : null;

  // Unabhaengige Phase-B-Fetches laufen nebenlaeufig; jede Branch kapselt ihren eigenen
  // Fallback, damit ein Fehler keine andere Branch mitreisst (Promise.all darf nicht rejecten).
  const [
    groupAssetsResponse,
    releasesBranch,
    profileDerived,
    publicReleasePreviews,
    contributorsData,
    themesData,
    releaseMediaData,
    projectNotesHtml,
  ] = await Promise.all([
    withFallback<Awaited<ReturnType<typeof getGroupAssets>> | null>(() => getGroupAssets(animeID, groupID), null),
    (async () => {
      let releaseEpisodes: Awaited<ReturnType<typeof getGroupReleases>>["data"]["episodes"] = [];
      let otherGroups: Awaited<ReturnType<typeof getGroupReleases>>["data"]["other_groups"] = [];
      let animeFansubRelations: Awaited<ReturnType<typeof getAnimeFansubs>>["data"] | null = null;
      try {
        const [releasesData, fansubsData] = await Promise.all([getGroupReleases(animeID, groupID, { per_page: 100 }), getAnimeFansubs(animeID)]);
        releaseEpisodes = releasesData.data.episodes;
        otherGroups = releasesData.data.other_groups;
        animeFansubRelations = fansubsData.data;
      } catch {
        try {
          const releasesData = await getGroupReleases(animeID, groupID, { per_page: 100 });
          releaseEpisodes = releasesData.data.episodes;
          otherGroups = releasesData.data.other_groups;
        } catch {
          /* Continue without navigation data. */
        }
      }
      return { releaseEpisodes, otherGroups, animeFansubRelations };
    })(),
    (async () => {
      const canonicalProjectPath = await resolveCanonicalProjectPath(profilePromise, canonicalFansubSlug, animeID);
      let fansubProjectNavigation: FansubProjectNavigation = { previous: null, next: null };
      try {
        const profile = profilePromise ? await profilePromise : null;
        if (profile && canonicalFansubSlug) {
          const currentProject = profile.data.projects.find((project) => project.id === animeID);
          fansubProjectNavigation = buildFansubProjectNavigation({
            currentAnimeID: animeID,
            currentAnimeSlug: currentProject?.anime_slug ?? null,
            currentFansubGroupID: groupID,
            currentFansubSlug: canonicalFansubSlug,
            projects: profile.data.projects,
          });
        }
      } catch {
        fansubProjectNavigation = { previous: null, next: null };
      }
      return { canonicalProjectPath, fansubProjectNavigation };
    })(),
    (async (): Promise<PublicReleasePreview[]> => {
      // Selber canonicalProjectPath (selbes Profil-Promise), aber getrennt vom Release-Liste-try/catch.
      const canonicalProjectPath = await resolveCanonicalProjectPath(profilePromise, canonicalFansubSlug, animeID);
      try {
        const activityPage = await getGroupReleaseListCursor(animeID, groupID, { limit: RELEASE_PREVIEW_LIMIT, sort: "release_date" });
        const latestRelease = activityPage.items[0] ?? null;
        let latestDetail: Awaited<ReturnType<typeof getGroupReleaseDetail>> | null = null;
        if (latestRelease) {
          // Detail braucht die Release-ID der Liste -> intern seriell.
          try {
            latestDetail = await getGroupReleaseDetail(animeID, groupID, latestRelease.id);
          } catch {
            latestDetail = null;
          }
        }
        return activityPage.items.map((release, index) =>
          buildPublicReleasePreview({ animeID, groupID, release, detail: index === 0 ? latestDetail : null, canonicalProjectPath }),
        );
      } catch {
        /* Public release block degrades independently from the project shell. */
        return [];
      }
    })(),
    withFallback<GroupContributorsResponse>(() => getGroupContributors(animeID, groupID), { team_members: [], external_contributors: [] }),
    withFallback<GroupThemesResponse>(() => getGroupThemes(animeID, groupID), { themes: [] }),
    withFallback<GroupReleaseMediaResponse>(() => getGroupReleaseMedia(animeID, groupID), { items: [] }),
    withFallback<string | null>(async () => (await getGroupProjectNote(animeID, groupID)).data?.body_html?.trim() || null, null),
  ]);

  const { releaseEpisodes, otherGroups, animeFansubRelations } = releasesBranch;
  const { canonicalProjectPath, fansubProjectNavigation } = profileDerived;

  const hasTeamContent =
    contributorsData.team_members.length > 0 ||
    contributorsData.external_contributors.length > 0;
  const storyAvailable = hasStoryContent(group.story, projectNotesHtml);
  const hasReleases = releaseEpisodes.length > 0 || publicReleasePreviews.length > 0;
  const hasThemes = themesData.themes.length > 0;
  const hasMedia = releaseMediaData.items.length > 0;

  const navigationGroups = buildGroupNavigationGroups({
    currentGroup: group.fansub,
    fallbackOtherGroups: otherGroups,
    animeFansubRelations,
  });
  const breadcrumbItems = [
    { label: "Anime", href: "/anime" },
    { label: anime.title, href: `/anime/${animeID}` },
    { label: "Gruppe" },
    { label: group.fansub.name },
  ];

  const animeBannerUrl = anime.banner_url ? resolvePublicApiUrl(anime.banner_url) : null;
  const heroBackdropUrl =
    animeBannerUrl ??
    (groupAssetsResponse?.data.hero.backdrop_url
      ? resolvePublicApiUrl(groupAssetsResponse.data.hero.backdrop_url)
      : null);
  const firstEp =
    groupAssetsResponse?.data.episodes.find((ep) => ep.episode_number === 1) ??
    groupAssetsResponse?.data.episodes.find((ep) => ep.images.length > 0);
  const firstEpImage =
    firstEp?.images.find((img) => img.title.toLowerCase().includes("landscape")) ??
    firstEp?.images[0] ??
    null;
  const infoPanelBackgroundUrl =
    animeBannerUrl ??
    (groupAssetsResponse?.data.hero.banner_url
      ? resolvePublicApiUrl(groupAssetsResponse.data.hero.banner_url)
      : firstEpImage
        ? resolvePublicApiUrl(firstEpImage.image_url)
        : null);
  const posterImage =
    (groupAssetsResponse?.data.hero.poster_url
      ? resolvePublicApiUrl(groupAssetsResponse.data.hero.poster_url)
      : null) ??
    anime.cover_image ??
    group.fansub.logo_url ??
    null;
  const heroImageUrl = animeBannerUrl ?? posterImage;
  const heroStyle = heroBackdropUrl
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(17, 10, 14, 0.42) 0%, rgba(17, 10, 14, 0.18) 44%, rgba(17, 10, 14, 0.42) 100%), url(${heroBackdropUrl})`,
      }
    : undefined;
  const infoPanelStyle = infoPanelBackgroundUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(12, 6, 9, 0.04) 0%, rgba(12, 6, 9, 0.12) 100%), url(${infoPanelBackgroundUrl})`,
      }
    : undefined;
  const pageStyle = heroBackdropUrl
    ? ({ "--group-page-backdrop": `url(${heroBackdropUrl})` } as CSSProperties)
    : undefined;

  return {
    status: "ok",
    data: {
      animeID,
      groupID,
      group,
      anime,
      groupAssetsResponse,
      releaseEpisodes,
      publicReleasePreviews,
      contributorsData,
      themesData,
      releaseMediaData,
      projectNotesHtml,
      hasTeamContent,
      storyAvailable,
      hasReleases,
      hasThemes,
      hasMedia,
      navigationGroups,
      fansubProjectNavigation,
      breadcrumbItems,
      heroBackdropUrl,
      infoPanelBackgroundUrl,
      heroImageUrl,
      heroImageIsBanner: Boolean(animeBannerUrl),
      posterImage,
      heroStyle,
      infoPanelStyle,
      pageStyle,
      canonicalProjectPath,
    },
  };
}
