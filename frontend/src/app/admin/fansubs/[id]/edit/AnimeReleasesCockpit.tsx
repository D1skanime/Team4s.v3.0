"use client";

import Image from "next/image";
import { ChevronDown, ChevronRight, FileText, Users } from "lucide-react";

import type { AdminFansubRelease } from "@/types/fansub";
import { FANSUB_GROUP_ROLE_OPTIONS } from "@/types/fansub";
import { useMemo } from "react";
import { Button } from "@/components/ui";
import AnimeContributionModal from "./AnimeContributionModal";
import { AnimeReleasesFilterBar } from "./AnimeReleasesFilterBar";
import { ProjectCockpitBadges } from "./ProjectCockpitBadges";
import { AnimeProjectNoteWorkspace } from "./AnimeProjectNoteWorkspace";
import {
  CoverageMatrix,
  type ProjectCoverageRow,
  type RoleDefinition,
} from "./CoverageMatrix";
import { ReleaseContributionDrawer } from "./ReleaseContributionDrawer";
import { ReleaseRowDetails } from "./ReleaseRowDetails";
import {
  formatAnimeTypeLabel,
  resolveCoverUrl,
} from "./fansubEditFormatters";
import { groupContributionMembersByRole } from "./fansubEditReleaseHelpers";
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
  canUseProjectNotes: boolean;
  canOpenReleaseContributors: boolean;
  canUseReleaseMedia: boolean;
  canUseReleaseNotes: boolean;
  canUseAdminReleaseDetails: boolean;
  canOpenReleaseDrawer: boolean;
  isSectionOpen: (section: SectionKey) => boolean;
  onSectionToggle: (section: SectionKey, open: boolean) => void;
  onToggleAnime: (releaseGroup: FansubReleaseGroup) => void;
  onOpenAnimeProjectNote: (releaseGroup: FansubReleaseGroup) => void;
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
  canUseProjectNotes,
  canOpenReleaseContributors,
  canUseReleaseMedia,
  canUseReleaseNotes,
  canUseAdminReleaseDetails,
  canOpenReleaseDrawer,
  isSectionOpen,
  onSectionToggle,
  onToggleAnime,
  onOpenAnimeProjectNote,
  onOpenReleaseDrawer,
  onOpenThemeDrawer,
}: AnimeReleasesCockpitProps) {
  const {
    releaseGroups,
    releaseGroupsLoading,
    releaseGroupsError,
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
    cockpitFilter,
    setCockpitFilter,
    visibleReleaseGroups,
    toggleRelease,
    handleReleaseRowsScroll,
    loadAnimeReleases,
  } = releaseData;
  const {
    contributionModalAnime,
    setContributionModalAnime,
    contributionMembers,
    contributionModalRows,
    animeContributionRowsByAnimeId,
    contributionModalLoadingAnimeId,
    contributionModalError,
    contributionDrawerOpen,
    setContributionDrawerOpen,
    contributionDrawerVersionId,
    contributionDrawerAnimeId,
    contributionDrawerTitle,
    openAnimeContributions,
    openContributionDrawer,
    refreshAnimeContributions,
  } = contributions;

  const catalogRoles = useMemo<RoleDefinition[]>(
    () =>
      FANSUB_GROUP_ROLE_OPTIONS.filter(
        (role) => role.code !== "fansub_lead",
      ).map((role, index) => ({
        code: role.code,
        label: role.label,
        sort_order: index + 1,
      })),
    [],
  );

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
            {visibleReleaseGroups.map((releaseGroup) => {
              const animeExpanded = expandedAnimeKeys.has(releaseGroup.key);
              const releasesLoaded = Object.prototype.hasOwnProperty.call(
                releasesByAnimeFansubGroupId,
                releaseGroup.key,
              );
              const releases =
                releasesByAnimeFansubGroupId[releaseGroup.key] ?? [];
              const releasesLoading = Boolean(
                releasesLoadingByAnimeFansubGroupId[releaseGroup.key],
              );
              const releasesError =
                releasesErrorsByAnimeFansubGroupId[releaseGroup.key];
              const releasePagination =
                releasePaginationByAnimeFansubGroupId[releaseGroup.key];
              const hasMoreReleases = Boolean(
                releasePagination &&
                  releasePagination.page < releasePagination.totalPages,
              );
              const releaseCountLabel = releasesLoaded
                ? releasePagination
                  ? `Releases: ${releases.length}/${releasePagination.total}`
                  : `Releases: ${releases.length}`
                : "Releases";
              const animeHeaderVisual = (
                releaseGroup.anime.header_image || ""
              ).trim();
              const animeVisualUrl = resolveCoverUrl(
                animeHeaderVisual || releaseGroup.anime.cover_image,
              );
              const useLandscapeVisual = Boolean(
                (animeVisualUrl || "").trim(),
              );
              const animeTypeLabel = formatAnimeTypeLabel(
                releaseGroup.anime.type,
              );
              const animeCoverage = animeCoverageMap?.get(
                releaseGroup.anime.id,
              );
              const animeContributionRows =
                animeContributionRowsByAnimeId[releaseGroup.anime.id] ?? [];
              const roleMembersByCode =
                groupContributionMembersByRole(animeContributionRows);
              return (
                <article
                  key={releaseGroup.key}
                  className={styles.fansubEditAnimeReleaseCard}
                >
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
                            animeCoverageMap === null
                              ? null
                              : (animeCoverage?.member_count ?? 0)
                          }
                          hasProjectNote={
                            animeCoverageMap === null
                              ? undefined
                              : Boolean(animeCoverage?.has_project_note)
                          }
                        />
                      </div>
                      <span
                        className={styles.fansubEditAnimeToggle}
                        aria-hidden="true"
                      >
                        {animeExpanded ? (
                          <ChevronDown size={34} strokeWidth={2.6} />
                        ) : (
                          <ChevronRight size={34} strokeWidth={2.6} />
                        )}
                      </span>
                    </button>
                    <div className={styles.fansubEditAnimeReleaseActions}>
                      {canUseProjectNotes ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<FileText size={16} />}
                          className={styles.fansubEditAnimeContributorsButton}
                          onClick={() => onOpenAnimeProjectNote(releaseGroup)}
                        >
                          Einblick
                        </Button>
                      ) : null}
                      {canOpenReleaseContributors ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<Users size={16} />}
                          className={styles.fansubEditAnimeContributorsButton}
                          loading={
                            contributionModalLoadingAnimeId ===
                            releaseGroup.anime.id
                          }
                          onClick={() =>
                            void openAnimeContributions(releaseGroup.anime)
                          }
                        >
                          Mitwirkende
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {animeExpanded && canUseProjectNotes ? (
                    <section className={styles.fansubEditProjectInsightPanel}>
                      <AnimeProjectNoteWorkspace
                        fansubId={fansubID}
                        animeId={releaseGroup.anime.id}
                        expanded={animeExpanded}
                      />
                    </section>
                  ) : null}
                  {animeExpanded ? (
                    <section className={styles.fansubEditProjectTeamPanel}>
                      <div className={styles.fansubEditProjectPanelHeader}>
                        <h4>Team & Rollen</h4>
                      </div>
                      <CoverageMatrix
                        roles={catalogRoles}
                        showProjectTitle={false}
                        rows={[
                          {
                            animeId: releaseGroup.anime.id,
                            animeTitle: releaseGroup.anime.title,
                            coveredRoleCodes:
                              animeCoverage?.covered_role_codes ?? [],
                            roleMembersByCode,
                          } satisfies ProjectCoverageRow,
                        ]}
                        onCellClick={(_, roleCode) =>
                          void openAnimeContributions(
                            releaseGroup.anime,
                            roleCode,
                          )
                        }
                      />
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
                      Anime ist verknüpft, aber es gibt noch keine
                      Release-Version für diese Gruppe.
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
                      expandedReleaseIds={expandedReleaseIds}
                      releaseSegmentCards={releaseSegmentCards}
                      releaseSegmentLoading={releaseSegmentLoading}
                      releaseSegmentErrors={releaseSegmentErrors}
                      selectedReleaseSegment={selectedReleaseSegment}
                      canUseReleaseMedia={canUseReleaseMedia}
                      canUseReleaseNotes={canUseReleaseNotes}
                      canUseAdminReleaseDetails={canUseAdminReleaseDetails}
                      canOpenReleaseDrawer={canOpenReleaseDrawer}
                      canOpenReleaseContributors={canOpenReleaseContributors}
                      onToggleRelease={toggleRelease}
                      onOpenReleaseDrawer={onOpenReleaseDrawer}
                      onOpenContributionDrawer={openContributionDrawer}
                      onOpenThemeDrawer={onOpenThemeDrawer}
                      onRowsScroll={(event) =>
                        handleReleaseRowsScroll(releaseGroup, event)
                      }
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
            })}
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
