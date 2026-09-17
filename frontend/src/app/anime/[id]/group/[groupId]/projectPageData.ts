import type { CSSProperties } from "react";

import {
  ApiError,
  getAnimeByID,
  getAnimeFansubs,
  getGroupAssets,
  getGroupContributors,
  getGroupDetail,
  getGroupProjectNote,
  getGroupReleaseCount,
  getGroupReleaseDetail,
  getGroupReleaseListCursor,
  getPublicFansubProfileBySlug,
  resolveApiUrl,
} from "@/lib/api";
import { buildPublicFansubProjectPath } from "@/lib/fansubProjectRoutes";
import {
  buildFansubProjectNavigation,
  type FansubProjectNavigation,
} from "@/lib/fansubProjectNavigation";
import { buildGroupNavigationGroups } from "@/lib/groupNavigation";
import { resolvePublicApiUrl } from "@/lib/publicApiUrl";
import type { PublicReleasePreview } from "@/components/fansubs/PublicReleaseBlock";
import type { AnimeDetail } from "@/types/anime";
import type { FansubGroupSummary } from "@/types/fansub";
import type { GroupDetail } from "@/types/group";
import type { GroupAssetsResponse } from "@/types/groupAsset";
import type { GroupContributorsResponse } from "@/types/groupContributors";
import { buildPublicReleasePreview } from "./projectPageData.releasePreview";

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
  releaseVersionCount: number;
  publicReleasePreviews: PublicReleasePreview[];
  contributorsData: GroupContributorsResponse;
  projectNotesHtml: string | null;
  hasTeamContent: boolean;
  storyAvailable: boolean;
  hasReleases: boolean;
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

/**
 * Vorab (z. B. vom Project Resolver, Plan 155-01/155-06) aufgeloeste Navigationsdaten.
 * Wird eine Pretty-Route uebergeben, spart sich der Loader seine eigene, profilbasierte
 * canonicalProjectPath-/Navigation-Aufloesung (kein zweiter getPublicFansubProfileBySlug-Call).
 */
export interface PrecomputedProjectNavigation {
  canonicalProjectPath: string | null;
  fansubProjectNavigation: FansubProjectNavigation;
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
  precomputed,
}: PublicFansubProjectIDs & { precomputed?: PrecomputedProjectNavigation }): Promise<LoadPublicFansubProjectPageDataResult> {
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
  // Wenn der Aufrufer (Pretty-Route, ueber den Project Resolver) bereits canonicalProjectPath
  // und die Projekt-Navigation aufgeloest hat, entfaellt der eigene Profil-Fetch komplett -
  // weder canonicalFansubSlug noch profilePromise werden dann gebraucht.
  const canonicalFansubSlug = precomputed ? undefined : group.fansub.slug?.trim();
  const profilePromise =
    !precomputed && canonicalFansubSlug ? getPublicFansubProfileBySlug(canonicalFansubSlug) : null;

  // Unabhaengige Phase-B-Fetches laufen nebenlaeufig; jede Branch kapselt ihren eigenen
  // Fallback, damit ein Fehler keine andere Branch mitreisst (Promise.all darf nicht rejecten).
  const [
    groupAssetsResponse,
    animeFansubRelations,
    releaseVersionCount,
    profileDerived,
    publicReleasePreviews,
    contributorsData,
    projectNotesHtml,
  ] = await Promise.all([
    withFallback<Awaited<ReturnType<typeof getGroupAssets>> | null>(() => getGroupAssets(animeID, groupID), null),
    withFallback<Awaited<ReturnType<typeof getAnimeFansubs>>["data"] | null>(
      async () => (await getAnimeFansubs(animeID)).data,
      null,
    ),
    withFallback<number>(async () => (await getGroupReleaseCount(animeID, groupID)).data.count, 0),
    (async () => {
      if (precomputed) {
        return {
          canonicalProjectPath: precomputed.canonicalProjectPath,
          fansubProjectNavigation: precomputed.fansubProjectNavigation,
        };
      }
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
      // Ist er bereits vorab aufgeloest (precomputed), wird kein zweiter Aufloese-Versuch gestartet.
      const canonicalProjectPath = precomputed
        ? precomputed.canonicalProjectPath
        : await resolveCanonicalProjectPath(profilePromise, canonicalFansubSlug, animeID);
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
    withFallback<string | null>(async () => (await getGroupProjectNote(animeID, groupID)).data?.body_html?.trim() || null, null),
  ]);

  const { canonicalProjectPath, fansubProjectNavigation } = profileDerived;

  const hasTeamContent =
    contributorsData.team_members.length > 0 ||
    contributorsData.external_contributors.length > 0;
  const storyAvailable = hasStoryContent(group.story, projectNotesHtml);
  const hasReleases = releaseVersionCount > 0 || publicReleasePreviews.length > 0;

  const navigationGroups = buildGroupNavigationGroups({
    currentGroup: group.fansub,
    animeFansubRelations,
  });
  const breadcrumbItems = [
    { label: "Anime", href: "/anime" },
    { label: anime.title, href: `/anime/${animeID}` },
    { label: "Gruppe" },
    { label: group.fansub.name },
  ];

  // /media/... bleibt relativ (Frontend-Proxy + next/image localPatterns); absolut auf den
  // Backend-Host aufgelöst lehnt next/image den Host ab und die ganze Seite bricht (500).
  const animeBannerUrl = anime.banner_url ? resolveApiUrl(anime.banner_url) || null : null;
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
      releaseVersionCount,
      publicReleasePreviews,
      contributorsData,
      projectNotesHtml,
      hasTeamContent,
      storyAvailable,
      hasReleases,
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
