import { GroupSectionsNav } from "./GroupSectionsNav";
import { BacklinksSection } from "./sections/BacklinksSection";
import { HeroSection } from "./sections/HeroSection";
import { MediaSection } from "./sections/MediaSection";
import { ReleasesSection } from "./sections/ReleasesSection";
import { StorySection } from "./sections/StorySection";
import { TeamSection } from "./sections/TeamSection";
import { ThemesSection } from "./sections/ThemesSection";
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
      <GroupSectionsNav />
      {data.hasTeamContent ? (
        <TeamSection
          teamMembers={data.contributorsData.team_members}
          externalContributors={data.contributorsData.external_contributors}
        />
      ) : null}
      {data.storyAvailable ? (
        <StorySection story={data.group.story} projectNotesHtml={data.projectNotesHtml} />
      ) : null}
      {data.hasReleases ? (
        <ReleasesSection
          episodes={data.releaseEpisodes}
          animeID={data.animeID}
          groupID={data.groupID}
        />
      ) : null}
      {data.hasThemes ? <ThemesSection themes={data.themesData.themes} /> : null}
      {data.hasMedia ? <MediaSection items={data.releaseMediaData.items} /> : null}
      {data.emptyAreaLabels.length > 0 ? (
        <aside className={styles.emptySummary} aria-label="Noch offene Projektbereiche">
          <p>
            Weitere Bereiche sind noch nicht öffentlich befüllt:{" "}
            {data.emptyAreaLabels.join(", ")}.
          </p>
        </aside>
      ) : null}
      <BacklinksSection fansubSlug={data.group.fansub.slug} animeID={data.animeID} />
    </main>
  );
}
