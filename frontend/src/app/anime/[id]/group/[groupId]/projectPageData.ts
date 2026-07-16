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

const RELEASE_PREVIEW_LIMIT = 6;
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
    href,
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
    episodeLabel: `Folge ${release.episode_number}`,
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

export async function loadPublicFansubProjectPageData({
  animeID,
  groupID,
}: PublicFansubProjectIDs): Promise<LoadPublicFansubProjectPageDataResult> {
  let groupResponse: Awaited<ReturnType<typeof getGroupDetail>> | null = null;
  let animeResponse: Awaited<ReturnType<typeof getAnimeByID>> | null = null;
  let groupAssetsResponse: Awaited<ReturnType<typeof getGroupAssets>> | null = null;
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
  let canonicalProjectPath: string | null = null;
  const canonicalFansubSlug = group.fansub.slug?.trim();
  if (canonicalFansubSlug) {
    try {
      const profile = await getPublicFansubProfileBySlug(canonicalFansubSlug);
      const project = profile.data.projects.find((item) => item.id === animeID && item.anime_slug?.trim());
      if (project?.anime_slug) canonicalProjectPath = buildPublicFansubProjectPath(canonicalFansubSlug, project.anime_slug);
    } catch {
      canonicalProjectPath = null;
    }
  }

  try {
    groupAssetsResponse = await getGroupAssets(animeID, groupID);
  } catch (error) {
    void error;
  }

  let otherGroups: Awaited<ReturnType<typeof getGroupReleases>>["data"]["other_groups"] = [];
  let releaseEpisodes: Awaited<ReturnType<typeof getGroupReleases>>["data"]["episodes"] = [];
  let publicReleasePreviews: PublicReleasePreview[] = [];
  let animeFansubRelations: Awaited<ReturnType<typeof getAnimeFansubs>>["data"] | null = null;

  try {
    const [releasesData, fansubsData] = await Promise.all([
      getGroupReleases(animeID, groupID, { per_page: 100 }),
      getAnimeFansubs(animeID),
    ]);
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

  try {
    const activityPage = await getGroupReleaseListCursor(animeID, groupID, {
      limit: RELEASE_PREVIEW_LIMIT,
      sort: "activity",
    });
    const latestRelease = activityPage.items[0] ?? null;
    let latestDetail: Awaited<ReturnType<typeof getGroupReleaseDetail>> | null = null;
    if (latestRelease) {
      try {
        latestDetail = await getGroupReleaseDetail(animeID, groupID, latestRelease.id);
      } catch {
        latestDetail = null;
      }
    }
    publicReleasePreviews = activityPage.items.map((release, index) =>
      buildPublicReleasePreview({
        animeID,
        groupID,
        release,
        detail: index === 0 ? latestDetail : null,
        canonicalProjectPath,
      }),
    );
  } catch {
    /* Public release block degrades independently from the project shell. */
  }

  let contributorsData: GroupContributorsResponse = {
    team_members: [],
    external_contributors: [],
  };
  let themesData: GroupThemesResponse = { themes: [] };
  let releaseMediaData: GroupReleaseMediaResponse = { items: [] };
  let projectNotesHtml: string | null = null;
  let fansubProjectNavigation: FansubProjectNavigation = { previous: null, next: null };

  try {
    contributorsData = await getGroupContributors(animeID, groupID);
  } catch {
    /* EmptyState */
  }
  try {
    themesData = await getGroupThemes(animeID, groupID);
  } catch {
    /* EmptyState */
  }
  try {
    releaseMediaData = await getGroupReleaseMedia(animeID, groupID);
  } catch {
    /* EmptyState */
  }
  try {
    const projectNoteResponse = await getGroupProjectNote(animeID, groupID);
    projectNotesHtml = projectNoteResponse.data?.body_html?.trim() || null;
  } catch {
    /* EmptyState */
  }

  try {
    const fansubSlug = group.fansub.slug?.trim();
    if (fansubSlug) {
      const publicProfileResponse = await getPublicFansubProfileBySlug(fansubSlug);
      const currentProject = publicProfileResponse.data.projects.find((project) => project.id === animeID);
      fansubProjectNavigation = buildFansubProjectNavigation({
        currentAnimeID: animeID,
        currentAnimeSlug: currentProject?.anime_slug ?? null,
        currentFansubGroupID: groupID,
        currentFansubSlug: fansubSlug,
        projects: publicProfileResponse.data.projects,
      });
    }
  } catch {
    /* Navigation degrades when the public profile project list is unavailable. */
  }

  const hasTeamContent =
    contributorsData.team_members.length > 0 ||
    contributorsData.external_contributors.length > 0;
  const storyAvailable = hasStoryContent(group.story, projectNotesHtml);
  const hasReleases = releaseEpisodes.length > 0;
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
