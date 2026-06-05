import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import {
  ApiError,
  getAnimeByID,
  getAnimeFansubs,
  getGroupAssets,
  getGroupDetail,
  getGroupReleases,
} from "@/lib/api";
import { buildGroupNavigationGroups } from "@/lib/groupNavigation";
import { resolvePublicApiUrl } from "@/lib/publicApiUrl";

import { GroupSectionsNav } from "./GroupSectionsNav";
import { HeroSection } from "./sections/HeroSection";
import { StorySection } from "./sections/StorySection";
import styles from "./page.module.css";

interface GroupStoryPageProps {
  params:
    | { id: string; groupId: string }
    | Promise<{ id: string; groupId: string }>;
}

export default async function GroupStoryPage({ params }: GroupStoryPageProps) {
  const resolvedParams = await params;
  const animeID = Number.parseInt(resolvedParams.id, 10);
  const groupID = Number.parseInt(resolvedParams.groupId, 10);

  if (Number.isNaN(animeID) || animeID <= 0 || Number.isNaN(groupID) || groupID <= 0) {
    return notFound();
  }

  let groupResponse: Awaited<ReturnType<typeof getGroupDetail>> | null = null;
  let animeResponse: Awaited<ReturnType<typeof getAnimeByID>> | null = null;
  let groupAssetsResponse: Awaited<ReturnType<typeof getGroupAssets>> | null = null;
  let groupAssetsError: string | null = null;
  let errorMessage: string | null = null;

  try {
    [groupResponse, animeResponse] = await Promise.all([
      getGroupDetail(animeID, groupID),
      getAnimeByID(animeID),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound();
    errorMessage = "Gruppendetails konnten nicht geladen werden.";
  }

  if (!groupResponse || !animeResponse) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${animeID}`}>Zurück zum Anime</Link>
        </p>
        <div className={styles.errorBox}>{errorMessage ?? "Fehler beim Laden der Seite."}</div>
      </main>
    );
  }

  const group = groupResponse.data;
  const anime = animeResponse.data;
  try {
    groupAssetsResponse = await getGroupAssets(animeID, groupID);
  } catch (error) {
    groupAssetsError = error instanceof ApiError
      ? error.message
      : "Gruppen-Assets konnten nicht geladen werden.";
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
    } catch { /* Continue without navigation data. */ }
  }

  const navigationGroups = buildGroupNavigationGroups({ currentGroup: group.fansub, fallbackOtherGroups: otherGroups, animeFansubRelations });
  const breadcrumbItems = [
    { label: "Anime", href: "/anime" },
    { label: anime.title, href: `/anime/${animeID}` },
    { label: "Gruppe" },
    { label: group.fansub.name },
  ];
  const heroBackdropUrl = groupAssetsResponse?.data.hero.backdrop_url
    ? resolvePublicApiUrl(groupAssetsResponse.data.hero.backdrop_url)
    : null;
  const firstEp =
    groupAssetsResponse?.data.episodes.find((ep) => ep.episode_number === 1) ??
    groupAssetsResponse?.data.episodes.find((ep) => ep.images.length > 0);
  const firstEpImage = firstEp?.images.find((img) => img.title.toLowerCase().includes("landscape")) ?? firstEp?.images[0] ?? null;
  const infoPanelBackgroundUrl = groupAssetsResponse?.data.hero.banner_url
    ? resolvePublicApiUrl(groupAssetsResponse.data.hero.banner_url)
    : firstEpImage ? resolvePublicApiUrl(firstEpImage.image_url) : null;
  const posterImage =
    (groupAssetsResponse?.data.hero.poster_url
      ? resolvePublicApiUrl(groupAssetsResponse.data.hero.poster_url)
      : null) ?? anime.cover_image ?? group.fansub.logo_url ?? null;
  const heroStyle = heroBackdropUrl ? { backgroundImage: `linear-gradient(90deg, rgba(17, 10, 14, 0.42) 0%, rgba(17, 10, 14, 0.18) 44%, rgba(17, 10, 14, 0.42) 100%), url(${heroBackdropUrl})` } : undefined;
  const infoPanelStyle = infoPanelBackgroundUrl ? { backgroundImage: `linear-gradient(180deg, rgba(12, 6, 9, 0.04) 0%, rgba(12, 6, 9, 0.12) 100%), url(${infoPanelBackgroundUrl})` } : undefined;
  const pageStyle = heroBackdropUrl ? ({ "--group-page-backdrop": `url(${heroBackdropUrl})` } as CSSProperties) : undefined;

  return (
    <main
      className={`${styles.page} ${heroBackdropUrl ? styles.pageWithBackdrop : ""}`}
      style={pageStyle}
    >
      <HeroSection
        group={group}
        anime={anime}
        groupID={groupID}
        animeID={animeID}
        heroBackdropUrl={heroBackdropUrl}
        infoPanelBackgroundUrl={infoPanelBackgroundUrl}
        posterImage={posterImage}
        heroStyle={heroStyle}
        infoPanelStyle={infoPanelStyle}
        breadcrumbItems={breadcrumbItems}
        navigationGroups={navigationGroups}
        groupAssetsResponse={groupAssetsResponse}
        groupAssetsError={groupAssetsError}
        releaseEpisodes={releaseEpisodes}
      />
      <GroupSectionsNav />
      <StorySection story={group.story} projectNotesHtml={null} />
      <div id="team" className={styles.sectionShell} />
      <div id="releases" className={styles.sectionShell} />
      <div id="themes" className={styles.sectionShell} />
      <div id="medien" className={styles.sectionShell} />
    </main>
  );
}
