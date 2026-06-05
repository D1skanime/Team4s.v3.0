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
  groupAssetsError: string | null;
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
  groupAssetsError,
  releaseEpisodes,
}: HeroSectionProps) {
  const hasGroupFolder = Boolean(groupAssetsResponse?.data.folder_name);
  const hasEpisodeAssets = Boolean(groupAssetsResponse?.data.episodes?.length);

  const periodText =
    group.period?.start || group.period?.end
      ? `${group.period?.start ?? "?"} - ${group.period?.end ?? "?"}`
      : null;

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}`}>Zurück zum Anime</Link>
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
          Für diese Gruppenversion wurde noch kein passender Subgroups-Ordner
          gefunden.
        </div>
      ) : !hasEpisodeAssets ? (
        <div className={styles.errorBox}>
          Der Subgroups-Ordner wurde gefunden, enthält aber noch keine
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
    </>
  );
}
