"use client";

import type { AdminFansubRelease } from "@/types/fansub";
import AnimeContributionModal from "./AnimeContributionModal";
import { AnimeReleasesFilterBar } from "./AnimeReleasesFilterBar";
import { AnimeProjectReleaseCard } from "./AnimeProjectReleaseCard";
import { ReleaseContributionDrawer } from "./ReleaseContributionDrawer";
import type {
  FansubReleaseGroup,
  ReleaseDrawerContext,
  ReleaseSegmentCard,
  SectionKey,
} from "./fansubEditTypes";
import type { FansubReleaseData } from "./useFansubReleaseData";
import type { ReleaseContributions } from "./useReleaseContributions";

type AnimeReleasesCockpitProps = {
  styles: Record<string, string>;
  fansubID: number;
  releaseData: FansubReleaseData;
  contributions: ReleaseContributions;
  ownProjectAssignmentKeys: string[];
  canViewProjectNotes: boolean;
  canEditProjectNotes: boolean;
  canEditProjectTimeline: boolean;
  canViewReleaseContributors: boolean;
  canEditReleaseContributors: boolean;
  canUseReleaseMedia: boolean;
  canUseReleaseNotes: boolean;
  canUseAdminReleaseDetails: boolean;
  canOpenReleaseDrawer: boolean;
  isSectionOpen: (section: SectionKey) => boolean;
  onSectionToggle: (section: SectionKey, open: boolean) => void;
  onToggleAnime: (releaseGroup: FansubReleaseGroup) => void;
  onOpenReleaseDrawer: (context: ReleaseDrawerContext) => void;
  onOpenThemeDrawer: (
    release: AdminFansubRelease,
    card: ReleaseSegmentCard,
  ) => void;
};

export function AnimeReleasesCockpit({
  styles,
  fansubID,
  releaseData,
  contributions,
  ownProjectAssignmentKeys,
  canViewProjectNotes,
  canEditProjectNotes,
  canEditProjectTimeline,
  canViewReleaseContributors,
  canEditReleaseContributors,
  canUseReleaseMedia,
  canUseReleaseNotes,
  canOpenReleaseDrawer,
  canUseAdminReleaseDetails,
  isSectionOpen,
  onSectionToggle,
  onToggleAnime,
  onOpenReleaseDrawer,
  onOpenThemeDrawer,
}: AnimeReleasesCockpitProps) {
  const {
    releaseGroups,
    releaseGroupsLoading,
    releaseGroupsError,
    cockpitFilter,
    setCockpitFilter,
    visibleReleaseGroups,
    loadAnimeReleases,
  } = releaseData;
  const {
    contributionModalAnime,
    setContributionModalAnime,
    contributionMembers,
    contributionModalRows,
    contributionDrawerOpen,
    setContributionDrawerOpen,
    contributionDrawerVersionId,
    contributionDrawerAnimeId,
    contributionDrawerTitle,
    contributionModalError,
    refreshAnimeContributions,
  } = contributions;

  return (
    <>
      <details
        className={styles.fansubEditSection}
        open={isSectionOpen("releases")}
        onToggle={(event) =>
          onSectionToggle("releases", event.currentTarget.open)
        }
      >
        <summary className={styles.fansubEditSectionSummary}>
          Anime & Veröffentlichungen
        </summary>
        <div className={styles.fansubEditSectionBody}>
          {releaseGroupsLoading ? (
            <div className={styles.fansubEditReleaseState}>
              Anime werden geladen...
            </div>
          ) : null}
          {releaseGroupsError ? (
            <div className={styles.errorBox}>{releaseGroupsError}</div>
          ) : null}
          {contributionModalError ? (
            <div className={styles.errorBox}>{contributionModalError}</div>
          ) : null}
          {!releaseGroupsLoading && !releaseGroupsError ? (
            <AnimeReleasesFilterBar
              activeFilter={cockpitFilter}
              onFilterChange={setCockpitFilter}
            />
          ) : null}
          {!releaseGroupsLoading &&
          !releaseGroupsError &&
          releaseGroups.length === 0 ? (
            <div className={styles.fansubEditReleaseState}>
              Noch keine Anime/Releases mit dieser Fansubgruppe verknüpft.
            </div>
          ) : null}
          {!releaseGroupsLoading &&
          !releaseGroupsError &&
          releaseGroups.length > 0 &&
          visibleReleaseGroups.length === 0 ? (
            <div className={styles.fansubEditReleaseState}>
              Keine Projekte passen zum gewählten Filter.
            </div>
          ) : null}
          <div className={styles.fansubEditReleaseList}>
            {visibleReleaseGroups.map((releaseGroup) => (
              <AnimeProjectReleaseCard
                key={releaseGroup.key}
                styles={styles}
                fansubID={fansubID}
                releaseGroup={releaseGroup}
                releaseData={releaseData}
                contributions={contributions}
                ownProjectAssignmentKeys={ownProjectAssignmentKeys}
                canViewProjectNotes={canViewProjectNotes}
                canEditProjectNotes={canEditProjectNotes}
                canEditProjectTimeline={canEditProjectTimeline}
                canViewReleaseContributors={canViewReleaseContributors}
                canEditReleaseContributors={canEditReleaseContributors}
                canUseReleaseMedia={canUseReleaseMedia}
                canUseReleaseNotes={canUseReleaseNotes}
                canUseAdminReleaseDetails={canUseAdminReleaseDetails}
                canOpenReleaseDrawer={canOpenReleaseDrawer}
                onToggleAnime={onToggleAnime}
                onOpenReleaseDrawer={onOpenReleaseDrawer}
                onOpenThemeDrawer={onOpenThemeDrawer}
              />
            ))}
          </div>
        </div>
      </details>
      {contributionModalAnime ? (
        <AnimeContributionModal
          fansubId={fansubID}
          animeId={contributionModalAnime.id}
          animeTitle={contributionModalAnime.title}
          members={contributionMembers}
          existingContributions={contributionModalRows}
          focusedRoleCode={contributionModalAnime.focusedRoleCode}
          onClose={() => setContributionModalAnime(null)}
          onSaved={() =>
            void refreshAnimeContributions(contributionModalAnime.id)
          }
        />
      ) : null}
      {contributionDrawerOpen &&
      contributionDrawerVersionId !== null &&
      contributionDrawerAnimeId !== null ? (
        <ReleaseContributionDrawer
          open={contributionDrawerOpen}
          fansubId={fansubID}
          animeId={contributionDrawerAnimeId}
          releaseVersionId={contributionDrawerVersionId}
          releaseTitle={contributionDrawerTitle}
          onClose={() => setContributionDrawerOpen(false)}
          onSaved={() => {
            const group = releaseGroups.find(
              (rg) => rg.anime.id === contributionDrawerAnimeId,
            );
            if (group) void loadAnimeReleases(group, true);
          }}
        />
      ) : null}
    </>
  );
}
