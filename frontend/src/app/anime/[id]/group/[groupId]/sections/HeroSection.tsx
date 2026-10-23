import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ReportHintEntryPoint } from "@/components/contributions/ReportHintEntryPoint";
import { PublicHeaderBackdrop } from "@/components/public/PublicHeaderBackdrop";
import { AdjacentNavigation } from "@/components/ui";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import type { FansubProjectNavigation } from "@/lib/fansubProjectNavigation";
import type { FansubGroupSummary } from "@/types/fansub";
import type { GroupDetail } from "@/types/group";
import type { GroupAssetsResponse } from "@/types/groupAsset";
import type { AnimeDetail } from "@/types/anime";

import { GroupAssetShowcase } from "../GroupAssetShowcase";
import styles from "../page.module.css";
import { ProjectStats } from "./ProjectStats";

interface HeroSectionProps {
  group: GroupDetail;
  anime: AnimeDetail;
  groupID: number;
  animeID: number;
  heroBackdropUrl: string | null;
  infoPanelBackgroundUrl: string | null;
  heroImageUrl: string | null;
  heroImageIsBanner: boolean;
  posterImage: string | null;
  heroStyle: CSSProperties | undefined;
  infoPanelStyle: CSSProperties | undefined;
  breadcrumbItems: { label: string; href?: string }[];
  cooperationGroups: FansubGroupSummary[];
  fansubProjectNavigation: FansubProjectNavigation;
  groupAssetsResponse: GroupAssetsResponse | null;
  releaseVersionCount: number;
}

export function HeroSection({
  group,
  anime,
  groupID,
  animeID,
  heroBackdropUrl,
  infoPanelBackgroundUrl,
  heroImageUrl,
  heroImageIsBanner,
  posterImage,
  heroStyle,
  infoPanelStyle,
  breadcrumbItems,
  cooperationGroups,
  fansubProjectNavigation,
  groupAssetsResponse,
  releaseVersionCount,
}: HeroSectionProps) {
  const hasGroupFolder = Boolean(groupAssetsResponse?.data.folder_name);
  const hasEpisodeAssets = Boolean(groupAssetsResponse?.data.episodes?.length);
  void heroStyle;
  void infoPanelStyle;

  // Album-Art-Backdrop: Anime-Backdrop bevorzugt, sonst Banner, sonst Poster
  const backdropUrl = heroBackdropUrl ?? infoPanelBackgroundUrl ?? posterImage;
  const coopGroups = cooperationGroups.filter(
    (coopGroup) => coopGroup.id !== groupID && Boolean(coopGroup.slug?.trim()),
  );
  const hasProjectNavigation = Boolean(
    fansubProjectNavigation.previous || fansubProjectNavigation.next,
  );
  const identity = (
    <>
      <p className={styles.eyebrow}>{group.fansub.name}</p>
      <h1 className={styles.title}>{anime.title}</h1>
      {/* D-12 (191-UI-SPEC.md Contract D3): dezenter zweiter Einstiegspunkt ins
          "Hinweis senden"-Formular, direkt dem Projekttitel untergeordnet -- rendert
          selbst nichts fuer nicht berechtigte/nicht angemeldete Besucher (siehe
          ReportHintEntryPoint). Inline-Abstand statt eines neuen page.module.css-
          Eintrags, da diese Datei nicht in den files_modified dieses Plans steht. */}
      <div style={{ marginTop: "var(--space-2)" }}>
        <ReportHintEntryPoint
          fansubGroupId={groupID}
          fansubGroupName={group.fansub.name}
          animeId={animeID}
          animeTitle={anime.title}
        />
      </div>
    </>
  );
  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}`}>Zurück zum Anime</Link>
      </p>

      <section className={styles.heroShell}>
        <PublicHeaderBackdrop imageUrl={backdropUrl} className={styles.heroBackdropTuning} />
        <div className={styles.heroFg}>
          <div className={styles.heroCard}>
            {heroImageUrl && heroImageIsBanner ? (
              <div className={styles.heroBannerWrap}>
                {heroImageUrl.includes("/api/") ? (
                  <Image
                    src={heroImageUrl}
                    alt={`${anime.title} Banner`}
                    width={1200}
                    height={200}
                    className={styles.heroBannerImg}
                    unoptimized
                    priority
                  />
                ) : (
                  <ResponsiveImage
                    src={heroImageUrl}
                    alt={`${anime.title} Banner`}
                    width={1200}
                    height={200}
                    className={styles.heroBannerImg}
                    quality={85}
                    priority
                  />
                )}
              </div>
            ) : null}

            <div className={styles.heroBody}>
              {!heroImageIsBanner ? (
                heroImageUrl ? (
                  heroImageUrl.includes("/api/") ? (
                    <Image
                      src={heroImageUrl}
                      alt={anime.title}
                      width={240}
                      height={340}
                      className={styles.poster}
                      unoptimized
                    />
                  ) : (
                    <ResponsiveImage
                      src={heroImageUrl}
                      alt={anime.title}
                      width={240}
                      height={340}
                      className={styles.poster}
                      quality={85}
                    />
                  )
                ) : (
                  <div className={styles.posterPlaceholder}>
                    <span className={styles.posterInitial}>
                      {anime.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )
              ) : null}

              <div className={styles.heroInfo}>
                <div className={styles.heroHeader}>
                  <div className={styles.heroIdentity}>{identity}</div>
                  <ProjectStats
                    contributorCount={group.stats.project_contributor_count}
                    releaseCount={releaseVersionCount}
                    coopGroups={coopGroups}
                    animeID={animeID}
                    animeSlug={anime.slug}
                  />
                </div>
              </div>
            </div>
            {hasProjectNavigation ? (
              <AdjacentNavigation
                variant="inline"
                className={styles.projectNavigation}
                ariaLabel="Weitere Projekte"
                previous={fansubProjectNavigation.previous ? {
                  href: fansubProjectNavigation.previous.href,
                  label: fansubProjectNavigation.previous.title,
                  ariaLabel: "Vorheriges Fansub-Projekt",
                } : null}
                next={fansubProjectNavigation.next ? {
                  href: fansubProjectNavigation.next.href,
                  label: fansubProjectNavigation.next.title,
                  ariaLabel: "Nächstes Fansub-Projekt",
                } : null}
              />
            ) : null}
          </div>
        </div>
      </section>

      {hasGroupFolder && hasEpisodeAssets ? (
        <section className={styles.assetsPanel}>
          <GroupAssetShowcase
            animeID={animeID}
            groupID={groupID}
            episodes={groupAssetsResponse!.data.episodes}
          />
        </section>
      ) : null}
    </>
  );
}
