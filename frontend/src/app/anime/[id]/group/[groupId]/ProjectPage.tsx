import { BacklinksSection } from "./sections/BacklinksSection";
import { HeroSection } from "./sections/HeroSection";
import { ReleasesSection } from "./sections/ReleasesSection";
import { StorySection } from "./sections/StorySection";
import { TeamSection } from "./sections/TeamSection";
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
        <ReleasesSection
          episodes={data.releaseEpisodes}
          animeID={data.animeID}
          groupID={data.groupID}
        />
      ) : null}
      <BacklinksSection fansubSlug={data.group.fansub.slug} animeID={data.animeID} />
    </main>
  );
}
