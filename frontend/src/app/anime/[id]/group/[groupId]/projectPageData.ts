import type { CSSProperties } from "react";

import {
  ApiError,
  getAnimeByID,
  getAnimeFansubs,
  getGroupAssets,
  getGroupContributors,
  getGroupDetail,
  getGroupProjectNote,
  getGroupReleaseMedia,
  getGroupReleases,
  getGroupThemes,
} from "@/lib/api";
import { buildGroupNavigationGroups } from "@/lib/groupNavigation";
import { resolvePublicApiUrl } from "@/lib/publicApiUrl";
import type { AnimeDetail } from "@/types/anime";
import type { FansubGroupSummary } from "@/types/fansub";
import type { EpisodeReleaseSummary, GroupDetail } from "@/types/group";
import type { GroupAssetsResponse } from "@/types/groupAsset";
import type {
  GroupContributorsResponse,
  GroupReleaseMediaResponse,
  GroupThemesResponse,
} from "@/types/groupContributors";

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
  contributorsData: GroupContributorsResponse;
  themesData: GroupThemesResponse;
  releaseMediaData: GroupReleaseMediaResponse;
  projectNotesHtml: string | null;
  hasTeamContent: boolean;
  storyAvailable: boolean;
  hasReleases: boolean;
  hasThemes: boolean;
  hasMedia: boolean;
  emptyAreaLabels: string[];
  navigationGroups: FansubGroupSummary[];
  breadcrumbItems: { label: string; href?: string }[];
  heroBackdropUrl: string | null;
  infoPanelBackgroundUrl: string | null;
  heroImageUrl: string | null;
  heroImageIsBanner: boolean;
  posterImage: string | null;
  heroStyle: CSSProperties | undefined;
  infoPanelStyle: CSSProperties | undefined;
  pageStyle: CSSProperties | undefined;
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

/** AO4-07: ein einziger Sammel-Hinweis fuer tatsaechlich leere Bereiche statt Einzel-Rendern. */
export function buildEmptyAreaLabels(params: {
  hasTeamContent: boolean;
  hasStory: boolean;
  hasReleases: boolean;
  hasThemes: boolean;
  hasMedia: boolean;
}): string[] {
  const labels: string[] = [];
  if (!params.hasTeamContent) labels.push("Beteiligte am Projekt");
  if (!params.hasStory) labels.push("Geschichte");
  if (!params.hasReleases) labels.push("Releases");
  if (!params.hasThemes) labels.push("OP/ED/Middle");
  if (!params.hasMedia) labels.push("Release-Einblicke");
  return labels;
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

  try {
    groupAssetsResponse = await getGroupAssets(animeID, groupID);
  } catch (error) {
    void error;
  }

  let otherGroups: Awaited<ReturnType<typeof getGroupReleases>>["data"]["other_groups"] = [];
  let releaseEpisodes: Awaited<ReturnType<typeof getGroupReleases>>["data"]["episodes"] = [];
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

  let contributorsData: GroupContributorsResponse = {
    team_members: [],
    external_contributors: [],
  };
  let themesData: GroupThemesResponse = { themes: [] };
  let releaseMediaData: GroupReleaseMediaResponse = { items: [] };
  let projectNotesHtml: string | null = null;

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

  const hasTeamContent =
    contributorsData.team_members.length > 0 ||
    contributorsData.external_contributors.length > 0;
  const storyAvailable = hasStoryContent(group.story, projectNotesHtml);
  const hasReleases = releaseEpisodes.length > 0;
  const hasThemes = themesData.themes.length > 0;
  const hasMedia = releaseMediaData.items.length > 0;
  const emptyAreaLabels = buildEmptyAreaLabels({
    hasTeamContent,
    hasStory: storyAvailable,
    hasReleases,
    hasThemes,
    hasMedia,
  });

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
      contributorsData,
      themesData,
      releaseMediaData,
      projectNotesHtml,
      hasTeamContent,
      storyAvailable,
      hasReleases,
      hasThemes,
      hasMedia,
      emptyAreaLabels,
      navigationGroups,
      breadcrumbItems,
      heroBackdropUrl,
      infoPanelBackgroundUrl,
      heroImageUrl,
      heroImageIsBanner: Boolean(animeBannerUrl),
      posterImage,
      heroStyle,
      infoPanelStyle,
      pageStyle,
    },
  };
}
