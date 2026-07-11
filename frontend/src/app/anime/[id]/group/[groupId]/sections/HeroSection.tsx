import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { GroupEdgeNavigation } from "@/components/groups/GroupEdgeNavigation";
import type { FansubGroupSummary } from "@/types/fansub";
import type { GroupDetail, EpisodeReleaseSummary } from "@/types/group";
import type { GroupAssetsResponse } from "@/types/groupAsset";
import type { AnimeDetail } from "@/types/anime";

import { GroupAssetShowcase } from "../GroupAssetShowcase";
import styles from "../page.module.css";

interface HeroSectionProps {
  group: GroupDetail;
  anime: AnimeDetail;
  groupID: number;
  animeID: number;
  heroBackdropUrl: string | null;
  infoPanelBackgroundUrl: string | null;
  posterImage: string | null;
  heroStyle: CSSProperties | undefined;
  infoPanelStyle: CSSProperties | undefined;
  breadcrumbItems: { label: string; href?: string }[];
  navigationGroups: FansubGroupSummary[];
  groupAssetsResponse: GroupAssetsResponse | null;
  releaseEpisodes: EpisodeReleaseSummary[];
}

export function HeroSection({
  group,
  anime,
  groupID,
  animeID,
  heroBackdropUrl,
  infoPanelBackgroundUrl,
  posterImage,
  heroStyle,
  infoPanelStyle,
  breadcrumbItems,
  navigationGroups,
  groupAssetsResponse,
  releaseEpisodes,
}: HeroSectionProps) {
  const hasGroupFolder = Boolean(groupAssetsResponse?.data.folder_name);
  const hasEpisodeAssets = Boolean(groupAssetsResponse?.data.episodes?.length);
  void heroStyle;
  void infoPanelStyle;

  const projectContributorCount = group.stats.project_contributor_count;
  // Album-Art-Backdrop: Anime-Backdrop bevorzugt, sonst Banner, sonst Poster
  const backdropUrl = heroBackdropUrl ?? infoPanelBackgroundUrl ?? posterImage;

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}`}>Zurück zum Anime</Link>
      </p>

      <section className={styles.heroShell}>
        {backdropUrl ? (
          <div
            className={styles.heroBackdrop}
            style={{ backgroundImage: `url("${backdropUrl}")` }}
            aria-hidden="true"
          />
        ) : null}
        <div className={styles.heroFg}>
          <div className={styles.heroCard}>
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

            <div className={styles.heroInfo}>
              <p className={styles.eyebrow}>{group.fansub.name}</p>
              <h1 className={styles.title}>{anime.title}</h1>
              <dl className={styles.stats}>
                <div className={styles.statItem}>
                  <dt>Projektmitwirkende</dt>
                  <dd>{projectContributorCount}</dd>
                </div>
                <div className={styles.statItem}>
                  <dt>Releases</dt>
                  <dd>{releaseEpisodes.length}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        {navigationGroups.length > 1 ? (
          <GroupEdgeNavigation
            currentGroupId={groupID}
            animeId={animeID}
            animeTitle={anime.title}
            otherGroups={navigationGroups}
            mode="story"
            currentGroupName={group.fansub.name}
          />
        ) : null}
      </section>

      {hasGroupFolder && hasEpisodeAssets ? (
        <section className={styles.assetsPanel}>
          <GroupAssetShowcase
            animeID={animeID}
            groupID={groupID}
            episodes={groupAssetsResponse!.data.episodes}
            releaseEpisodes={releaseEpisodes}
          />
        </section>
      ) : null}
    </>
  );
}
