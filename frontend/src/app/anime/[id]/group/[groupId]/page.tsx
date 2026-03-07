import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { CollapsibleStory } from "@/components/groups/CollapsibleStory";
import { GroupEdgeNavigation } from "@/components/groups/GroupEdgeNavigation";
import { buildGroupNavigationGroups } from "@/lib/groupNavigation";
import {
  ApiError,
  getAnimeByID,
  getAnimeFansubs,
  getGroupAssets,
  getGroupDetail,
  getGroupReleases,
} from "@/lib/api";

import { GroupAssetShowcase } from "./GroupAssetShowcase";
import styles from "./page.module.css";

interface GroupStoryPageProps {
  params:
    | {
        id: string;
        groupId: string;
      }
    | Promise<{
        id: string;
        groupId: string;
      }>;
}

export default async function GroupStoryPage({ params }: GroupStoryPageProps) {
  const resolvedParams = await params;
  const animeID = Number.parseInt(resolvedParams.id, 10);
  const groupID = Number.parseInt(resolvedParams.groupId, 10);

  if (
    Number.isNaN(animeID) ||
    animeID <= 0 ||
    Number.isNaN(groupID) ||
    groupID <= 0
  ) {
    return notFound();
  }

  let groupResponse: Awaited<ReturnType<typeof getGroupDetail>> | null = null;
  let animeResponse: Awaited<ReturnType<typeof getAnimeByID>> | null = null;
  let groupAssetsResponse: Awaited<ReturnType<typeof getGroupAssets>> | null =
    null;
  let groupAssetsError: string | null = null;
  let errorMessage: string | null = null;

  try {
    [groupResponse, animeResponse] = await Promise.all([
      getGroupDetail(animeID, groupID),
      getAnimeByID(animeID),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return notFound();
    }
    errorMessage = "Gruppendetails konnten nicht geladen werden.";
  }

  if (!groupResponse || !animeResponse) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${animeID}`}>Zurueck zum Anime</Link>
        </p>
        <div className={styles.errorBox}>
          {errorMessage ?? "Fehler beim Laden der Seite."}
        </div>
      </main>
    );
  }

  const group = groupResponse.data;
  const anime = animeResponse.data;

  try {
    groupAssetsResponse = await getGroupAssets(animeID, groupID);
  } catch (error) {
    if (error instanceof ApiError) {
      groupAssetsError = error.message;
    } else {
      groupAssetsError = "Gruppen-Assets konnten nicht geladen werden.";
    }
  }

  let otherGroups: Awaited<
    ReturnType<typeof getGroupReleases>
  >["data"]["other_groups"] = [];
  let releaseEpisodes: Awaited<
    ReturnType<typeof getGroupReleases>
  >["data"]["episodes"] = [];
  let animeFansubRelations:
    | Awaited<ReturnType<typeof getAnimeFansubs>>["data"]
    | null = null;
  try {
    const [releasesData, animeFansubsData] = await Promise.all([
      getGroupReleases(animeID, groupID, { per_page: 100 }),
      getAnimeFansubs(animeID),
    ]);
    releaseEpisodes = releasesData.data.episodes;
    otherGroups = releasesData.data.other_groups;
    animeFansubRelations = animeFansubsData.data;
  } catch {
    try {
      const releasesData = await getGroupReleases(animeID, groupID, {
        per_page: 100,
      });
      releaseEpisodes = releasesData.data.episodes;
      otherGroups = releasesData.data.other_groups;
    } catch {
      // Continue without additional navigation data.
    }
  }

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

  const apiBaseUrl =
    (process.env.NEXT_PUBLIC_API_URL || "").trim() || "http://localhost:8092";
  const firstEpisode = groupAssetsResponse?.data.episodes.find(
    (episode) => episode.episode_number === 1,
  ) ?? groupAssetsResponse?.data.episodes.find((episode) => episode.images.length > 0);
  const infoPanelBannerPath = groupAssetsResponse?.data.hero.banner_url ?? null;
  const infoPanelImage =
    firstEpisode?.images.find((image) =>
      image.title.toLowerCase().includes("landscape"),
    ) ?? firstEpisode?.images[0] ?? null;
  const periodText =
    group.period?.start || group.period?.end
      ? `${group.period?.start ?? "?"} - ${group.period?.end ?? "?"}`
      : null;
  const heroBackdropPath = groupAssetsResponse?.data.hero.backdrop_url ?? null;
  const heroBackdropUrl = heroBackdropPath ? `${apiBaseUrl}${heroBackdropPath}` : null;
  const infoPanelBackgroundUrl = infoPanelBannerPath
    ? `${apiBaseUrl}${infoPanelBannerPath}`
    : infoPanelImage
      ? `${apiBaseUrl}${infoPanelImage.image_url}`
      : null;
  const posterImage =
    (groupAssetsResponse?.data.hero.poster_url
      ? `${apiBaseUrl}${groupAssetsResponse.data.hero.poster_url}`
      : null) ??
    anime.cover_image ??
    group.fansub.logo_url ??
    null;
  const hasGroupFolder = Boolean(groupAssetsResponse?.data.folder_name);
  const hasEpisodeAssets = Boolean(groupAssetsResponse?.data.episodes?.length);
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
    ? ({
        "--group-page-backdrop": `url(${heroBackdropUrl})`,
      } as CSSProperties)
    : undefined;

  return (
    <main
      className={`${styles.page} ${heroBackdropUrl ? styles.pageWithBackdrop : ""}`}
      style={pageStyle}
    >
      <Breadcrumbs items={breadcrumbItems} />

      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}`}>Zurueck zum Anime</Link>
      </p>

      <section className={styles.heroShell}>
        <section
          className={`${styles.hero} ${heroBackdropUrl ? styles.heroWithBackdrop : ""}`}
          style={heroStyle}
        >
          {posterImage ? (
            <Image
              src={posterImage}
              alt={anime.title}
              width={240}
              height={340}
              className={styles.poster}
              unoptimized={posterImage.includes("/api/")}
            />
          ) : (
            <div className={styles.posterPlaceholder}>
              <span className={styles.posterInitial}>
                {anime.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div
            className={`${styles.info} ${infoPanelBackgroundUrl ? styles.infoWithBackdrop : ""}`}
            style={infoPanelStyle}
          >
            <p className={styles.eyebrow}>{group.fansub.name}</p>
            <h1 className={styles.title}>{anime.title}</h1>
            <div className={styles.stats}>
              <span className={styles.statItem}>Fansubgruppe</span>
              {periodText ? (
                <span className={styles.statItem}>Periode: {periodText}</span>
              ) : null}
              <span className={styles.statItem}>
                {group.stats.member_count} Mitglieder
              </span>
              <span className={styles.statItem}>
                {group.stats.episode_count} Episoden
              </span>
            </div>
            {group.story ? (
              <div className={styles.story}>
                <h2 className={styles.storyHeading}>Projektgeschichte</h2>
                <CollapsibleStory content={group.story} />
              </div>
            ) : null}
            <div className={styles.actions}>
              <Link
                href={`/anime/${animeID}/group/${groupID}/releases`}
                className={styles.releasesButton}
              >
                Releases ansehen
              </Link>
              <Link
                href={`/fansubs/${group.fansub.slug}`}
                className={styles.profileButton}
              >
                Fansub-Profil
              </Link>
            </div>
          </div>
        </section>
        {navigationGroups.length > 1 ? (
          <GroupEdgeNavigation
            currentGroupId={groupID}
            animeId={animeID}
            animeTitle={anime.title}
            otherGroups={navigationGroups}
            mode="story"
          />
        ) : null}
      </section>

      {groupAssetsError ? (
        <div className={styles.errorBox}>{groupAssetsError}</div>
      ) : !hasGroupFolder ? (
        <div className={styles.errorBox}>
          Fuer diese Gruppenversion wurde noch kein passender Subgroups-Ordner
          gefunden.
        </div>
      ) : !hasEpisodeAssets ? (
        <div className={styles.errorBox}>
          Der Subgroups-Ordner wurde gefunden, enthaelt aber noch keine
          Episoden-Assets.
        </div>
      ) : (
        <section className={styles.assetsPanel}>
          <GroupAssetShowcase
            animeID={animeID}
            groupID={groupID}
            episodes={groupAssetsResponse!.data.episodes}
            releaseEpisodes={releaseEpisodes}
          />
        </section>
      )}
    </main>
  );
}
