import { BacklinksSection } from "./sections/BacklinksSection";
import { HeroSection } from "./sections/HeroSection";
import { ReleasesSection } from "./sections/ReleasesSection";
import { StorySection } from "./sections/StorySection";
import { TeamSection } from "./sections/TeamSection";
import fansubSurfaceStyles from "@/app/fansubs/[slug]/page.module.css";
import styles from "./page.module.css";
import type { PublicFansubProjectPageData } from "./projectPageData";

interface ProjectPageProps {
  data: PublicFansubProjectPageData;
}

export function ProjectPage({ data }: ProjectPageProps) {
  return (
    <main
      className={`${styles.page} ${data.heroBackdropUrl ? styles.pageWithBackdrop : ""}`}
      style={data.pageStyle}
    >
      <HeroSection
        group={data.group}
        anime={data.anime}
        groupID={data.groupID}
        animeID={data.animeID}
        heroBackdropUrl={data.heroBackdropUrl}
        infoPanelBackgroundUrl={data.infoPanelBackgroundUrl}
        heroImageUrl={data.heroImageUrl}
        heroImageIsBanner={data.heroImageIsBanner}
        posterImage={data.posterImage}
        heroStyle={data.heroStyle}
        infoPanelStyle={data.infoPanelStyle}
        breadcrumbItems={data.breadcrumbItems}
        cooperationGroups={data.navigationGroups.filter((group) => group.id !== data.groupID)}
        fansubProjectNavigation={data.fansubProjectNavigation}
        groupAssetsResponse={data.groupAssetsResponse}
        releaseEpisodes={data.releaseEpisodes}
      />
      <StorySection story={data.group.story} projectNotesHtml={data.projectNotesHtml} />
      <TeamSection
        teamMembers={data.contributorsData.team_members}
        externalContributors={data.contributorsData.external_contributors}
      />
      {data.hasReleases ? (
        <div className={fansubSurfaceStyles.sectionBand} data-project-release-band>
          {data.heroBackdropUrl ? (
            <div
              className={fansubSurfaceStyles.sectionBandBackdrop}
              style={{ backgroundImage: `url("${data.heroBackdropUrl}")` }}
              aria-hidden="true"
            />
          ) : null}
          <div className={styles.releaseBandContent}>
            <ReleasesSection
              episodes={data.releaseEpisodes}
              publicReleasePreviews={data.publicReleasePreviews}
              animeID={data.animeID}
              groupID={data.groupID}
              canonicalProjectPath={data.canonicalProjectPath}
            />
          </div>
        </div>
      ) : null}
      <BacklinksSection fansubSlug={data.group.fansub.slug} animeID={data.animeID} />
    </main>
  );
}
