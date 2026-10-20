"use client";

import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { AdminFansubRelease } from "@/types/fansub";
import { roleLabels } from "./contributionRoles";
import { useRoleCatalog } from "@/providers/RoleCatalogProvider";
import { ProjectCockpitBadges } from "./ProjectCockpitBadges";
import { AnimeProjectNoteWorkspace } from "./AnimeProjectNoteWorkspace";
import { AnimeProjectTimelineSection } from "./AnimeProjectTimelineSection";
import { ReleaseRowDetails } from "./ReleaseRowDetails";
import {
  formatAnimeTypeLabel,
  resolveCoverUrl,
} from "./fansubEditFormatters";
import { uniqueProjectContributionPeople } from "./fansubEditReleaseHelpers";
import type {
  FansubReleaseGroup,
  ReleaseDrawerContext,
  ReleaseSegmentCard,
} from "./fansubEditTypes";
import type { FansubReleaseData } from "./useFansubReleaseData";
import type { ReleaseContributions } from "./useReleaseContributions";

type AnimeProjectReleaseCardProps = {
  styles: Record<string, string>;
  fansubID: number;
  releaseGroup: FansubReleaseGroup;
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
  onToggleAnime: (releaseGroup: FansubReleaseGroup) => void;
  onOpenReleaseDrawer: (context: ReleaseDrawerContext) => void;
  onOpenThemeDrawer: (
    release: AdminFansubRelease,
    card: ReleaseSegmentCard,
  ) => void;
};

export function AnimeProjectReleaseCard({
  styles,
  fansubID,
  releaseGroup,
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
  onToggleAnime,
  onOpenReleaseDrawer,
  onOpenThemeDrawer,
}: AnimeProjectReleaseCardProps) {
  const { roles: contributionRoles } = useRoleCatalog("anime_contribution");
  const {
    animeCoverageMap,
    releasesByAnimeFansubGroupId,
    releasesLoadingByAnimeFansubGroupId,
    releasesErrorsByAnimeFansubGroupId,
    releasePaginationByAnimeFansubGroupId,
    expandedAnimeKeys,
    expandedReleaseIds,
    releaseSegmentCards,
    releaseSegmentLoading,
    releaseSegmentErrors,
    selectedReleaseSegment,
    toggleRelease,
    loadAnimeReleases,
  } = releaseData;
  const {
    animeContributionRowsByAnimeId,
    contributionModalLoadingAnimeId,
    openAnimeContributions,
    openContributionDrawer,
  } = contributions;
  const [teamReadOnlyOpen, setTeamReadOnlyOpen] = useState(false);
  const releaseWorkspaceReturnHref = `/admin/fansubs/${fansubID}/edit?tab=releases`;

  function toggleReadOnlyTeam() {
    setTeamReadOnlyOpen((current) => !current);
  }

  const animeExpanded = expandedAnimeKeys.has(releaseGroup.key);
  const releasesLoaded = Object.prototype.hasOwnProperty.call(
    releasesByAnimeFansubGroupId,
    releaseGroup.key,
  );
  const releases = releasesByAnimeFansubGroupId[releaseGroup.key] ?? [];
  const releasesLoading = Boolean(
    releasesLoadingByAnimeFansubGroupId[releaseGroup.key],
  );
  const releasesError = releasesErrorsByAnimeFansubGroupId[releaseGroup.key];
  const releasePagination =
    releasePaginationByAnimeFansubGroupId[releaseGroup.key];
  const hasMoreReleases = Boolean(
    releasePagination && releasePagination.page < releasePagination.totalPages,
  );
  const releaseCountLabel = releasesLoaded
    ? releasePagination
      ? `Releases: ${releases.length}/${releasePagination.total}`
      : `Releases: ${releases.length}`
    : "Releases";
  const animeHeaderVisual = (releaseGroup.anime.header_image || "").trim();
  const animeVisualUrl = resolveCoverUrl(
    animeHeaderVisual || releaseGroup.anime.cover_image,
  );
  const useLandscapeVisual = Boolean((animeVisualUrl || "").trim());
  const animeTypeLabel = formatAnimeTypeLabel(releaseGroup.anime.type);
  const animeCoverage = animeCoverageMap?.get(releaseGroup.anime.id);
  const animeContributionRows =
    animeContributionRowsByAnimeId[releaseGroup.anime.id] ?? [];
  const projectContributionRows = animeContributionRows.filter(
    (row) => row.release_version_id == null,
  );
  const teamRows =
    projectContributionRows.length > 0
      ? projectContributionRows
      : animeContributionRows;
  const projectPeopleCount =
    uniqueProjectContributionPeople(animeContributionRows).length;

  return (
    <article key={releaseGroup.key} className={styles.fansubEditAnimeReleaseCard}>
      <div className={styles.fansubEditAnimeReleaseHeaderRow}>
        <button
          type="button"
          className={styles.fansubEditAnimeReleaseHeader}
          onClick={() => onToggleAnime(releaseGroup)}
          aria-expanded={animeExpanded}
          aria-label={
            animeExpanded
              ? `${releaseGroup.anime.title} einklappen`
              : `${releaseGroup.anime.title} ausklappen`
          }
        >
          <Image
            src={animeVisualUrl}
            alt=""
            className={
              useLandscapeVisual
                ? styles.fansubEditAnimeLandscape
                : styles.fansubEditAnimePoster
            }
            width={useLandscapeVisual ? 176 : 108}
            height={useLandscapeVisual ? 100 : 152}
            unoptimized
          />
          <div className={styles.fansubEditAnimeReleaseBody}>
            <h3>{releaseGroup.anime.title}</h3>
            {animeTypeLabel ? (
              <span className={styles.fansubEditAnimeReleaseType}>
                {animeTypeLabel}
              </span>
            ) : null}
            <span className={styles.fansubEditAnimeReleaseCount}>
              {releaseCountLabel}
            </span>
            <ProjectCockpitBadges
              contributionCount={
                animeCoverageMap === null ? null : (animeCoverage?.member_count ?? 0)
              }
              hasProjectNote={
                animeCoverageMap === null
                  ? undefined
                  : Boolean(animeCoverage?.has_project_note)
              }
            />
          </div>
          <span className={styles.fansubEditAnimeToggle} aria-hidden="true">
            {animeExpanded ? (
              <ChevronDown size={34} strokeWidth={2.6} />
            ) : (
              <ChevronRight size={34} strokeWidth={2.6} />
            )}
          </span>
        </button>
      </div>
      {animeExpanded && canViewProjectNotes ? (
        <section className={styles.fansubEditProjectInsightPanel}>
          <AnimeProjectTimelineSection
            fansubId={fansubID}
            animeId={releaseGroup.anime.id}
            expanded={animeExpanded}
            canEdit={canEditProjectTimeline}
          />
        </section>
      ) : null}
      {animeExpanded && canViewProjectNotes ? (
        <section className={styles.fansubEditProjectInsightPanel}>
          <AnimeProjectNoteWorkspace
            fansubId={fansubID}
            animeId={releaseGroup.anime.id}
            expanded={animeExpanded}
            canEdit={canEditProjectNotes}
          />
        </section>
      ) : null}
      {animeExpanded && canViewReleaseContributors ? (
        <section className={styles.fansubEditProjectTeamPanel}>
          <button
            type="button"
            className={styles.fansubEditProjectTeamToggle}
            onClick={() => {
              if (canEditReleaseContributors) {
                void openAnimeContributions(releaseGroup.anime);
              } else {
                toggleReadOnlyTeam();
              }
            }}
            disabled={
              !canViewReleaseContributors ||
              contributionModalLoadingAnimeId === releaseGroup.anime.id
            }
            aria-expanded={canEditReleaseContributors ? undefined : teamReadOnlyOpen}
            aria-label={
              canEditReleaseContributors
                ? `Mitwirkende für ${releaseGroup.anime.title} bearbeiten`
                : `Mitwirkende für ${releaseGroup.anime.title} anzeigen`
            }
          >
            <span>
              <strong>Team & Rollen</strong>
              <small>
                {projectPeopleCount} Person{projectPeopleCount === 1 ? "" : "en"}
              </small>
            </span>
            {canEditReleaseContributors || !teamReadOnlyOpen ? (
              <ChevronRight size={22} strokeWidth={2.4} />
            ) : (
              <ChevronDown size={22} strokeWidth={2.4} />
            )}
          </button>
          {!canEditReleaseContributors && teamReadOnlyOpen ? (
            <div className={styles.fansubEditProjectTeamReadOnly}>
              {teamRows.length === 0 ? (
                <p>Keine Mitwirkenden hinterlegt.</p>
              ) : (
                <ul>
                  {teamRows.map((row) => {
                    const labels = roleLabels(contributionRoles, row.role_codes);

                    return (
                      <li key={row.id}>
                        <span>{row.member_display_name}</span>
                        <div className={styles.contributionRoleSummaryChips}>
                          {labels.length > 0 ? (
                            labels.map((label) => (
                              <span
                                key={label}
                                className={styles.contributionRoleSummaryChip}
                              >
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className={styles.contributionRoleSummaryEmpty}>
                              Keine Rolle
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
      {animeExpanded ? (
        <div
          className={`${styles.fansubEditProjectPanelHeader} ${styles.fansubEditProjectReleasesHeader}`}
        >
          <h4>Releases</h4>
        </div>
      ) : null}
      {animeExpanded && releasesLoading ? (
        <div className={styles.fansubEditReleaseState}>
          Releases werden geladen...
        </div>
      ) : null}
      {animeExpanded && releasesError ? (
        <div className={styles.errorBox}>{releasesError}</div>
      ) : null}
      {animeExpanded &&
      releasesLoaded &&
      !releasesLoading &&
      !releasesError &&
      releases.length === 0 ? (
        <p className={styles.fansubEditHint}>
          Anime ist verknüpft, aber es gibt noch keine Release-Version für
          diese Gruppe.
        </p>
      ) : null}
      {animeExpanded && !releasesError && releases.length > 0 ? (
        <ReleaseRowDetails
          styles={styles}
          releaseGroup={releaseGroup}
          releases={releases}
          releasePagination={releasePagination}
          releasesLoading={releasesLoading}
          hasMoreReleases={hasMoreReleases}
          ownProjectAssignmentKeys={ownProjectAssignmentKeys}
          expandedReleaseIds={expandedReleaseIds}
          contributionRows={animeContributionRows}
          releaseSegmentCards={releaseSegmentCards}
          releaseSegmentLoading={releaseSegmentLoading}
          releaseSegmentErrors={releaseSegmentErrors}
          selectedReleaseSegment={selectedReleaseSegment}
          canUseReleaseMedia={canUseReleaseMedia}
          canUseReleaseNotes={canUseReleaseNotes}
          canOpenWithoutProjectAssignment={
            canUseAdminReleaseDetails || canUseReleaseMedia || canUseReleaseNotes
          }
          canOpenReleaseDrawer={canOpenReleaseDrawer}
          canOpenReleaseContributors={canEditReleaseContributors}
          releaseWorkspaceReturnHref={releaseWorkspaceReturnHref}
          onToggleRelease={toggleRelease}
          onOpenReleaseDrawer={onOpenReleaseDrawer}
          onOpenContributionDrawer={openContributionDrawer}
          onOpenThemeDrawer={onOpenThemeDrawer}
          onLoadMore={() => {
            if (!releasePagination) return;
            void loadAnimeReleases(
              releaseGroup,
              true,
              releasePagination.page + 1,
              true,
            );
          }}
        />
      ) : null}
    </article>
  );
}
