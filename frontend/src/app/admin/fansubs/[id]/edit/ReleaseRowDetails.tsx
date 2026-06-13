"use client";

import type { UIEvent } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Users, X } from "lucide-react";

import type { AdminFansubRelease } from "@/types/fansub";
import { Badge, Button } from "@/components/ui";
import {
  compactThemeKind,
  parseClockSeconds,
  releaseTimelineMaxSeconds,
  timelineLabelFor,
  timelineStatusLabelFor,
} from "./fansubEditFormatters";
import { releaseVersionToolsTarget } from "./fansubEditAccess";
import type {
  FansubReleaseGroup,
  ReleasePaginationState,
  ReleaseSegmentCard,
  SelectedReleaseSegment,
} from "./fansubEditTypes";

type ReleaseRowDetailsProps = {
  styles: Record<string, string>;
  releaseGroup: FansubReleaseGroup;
  releases: AdminFansubRelease[];
  releasePagination: ReleasePaginationState | undefined;
  releasesLoading: boolean;
  hasMoreReleases: boolean;
  expandedReleaseIds: Set<number>;
  releaseSegmentCards: Record<number, ReleaseSegmentCard[]>;
  releaseSegmentLoading: Record<number, boolean>;
  releaseSegmentErrors: Record<number, string | null>;
  selectedReleaseSegment: SelectedReleaseSegment | null;
  canUseReleaseMedia: boolean;
  canUseReleaseNotes: boolean;
  canUseAdminReleaseDetails: boolean;
  canOpenReleaseDrawer: boolean;
  canOpenReleaseContributors: boolean;
  onToggleRelease: (release: AdminFansubRelease) => void;
  onOpenReleaseDrawer: (context: {
    release: AdminFansubRelease;
    animeID: number;
    fansubGroupID: number;
    contextKey: string;
  }) => void;
  onOpenContributionDrawer: (
    versionId: number,
    animeId: number,
    title: string,
  ) => void;
  onOpenThemeDrawer: (
    release: AdminFansubRelease,
    card: ReleaseSegmentCard,
  ) => void;
  onRowsScroll: (event: UIEvent<HTMLDivElement>) => void;
  onLoadMore: () => void;
};

export function ReleaseRowDetails({
  styles,
  releaseGroup,
  releases,
  releasePagination,
  releasesLoading,
  hasMoreReleases,
  expandedReleaseIds,
  releaseSegmentCards,
  releaseSegmentLoading,
  releaseSegmentErrors,
  selectedReleaseSegment,
  canUseReleaseMedia,
  canUseReleaseNotes,
  canUseAdminReleaseDetails,
  canOpenReleaseDrawer,
  canOpenReleaseContributors,
  onToggleRelease,
  onOpenReleaseDrawer,
  onOpenContributionDrawer,
  onOpenThemeDrawer,
  onRowsScroll,
  onLoadMore,
}: ReleaseRowDetailsProps) {
  return (
    <div className={styles.fansubEditReleaseRows}>
      <div
        className={styles.fansubEditReleaseRowsScroller}
        onScroll={onRowsScroll}
      >
        <div className={styles.fansubEditReleaseTableHeader}>
          <span>Episode</span>
          <span>Titel</span>
          <span>Version</span>
          <span>Themes</span>
          <span>Aktionen</span>
          <span />
        </div>
        {releases.map((release, releaseIndex) => {
          const expanded = expandedReleaseIds.has(release.release_id);
          const releaseVersionTools = releaseVersionToolsTarget(
            release.release_version_id,
            {
              canViewMedia: canUseReleaseMedia,
              canEditNotes: canUseReleaseNotes,
            },
          );
          const cards = releaseSegmentCards[release.release_id] ?? [];
          const cardsLoading = releaseSegmentLoading[release.release_id];
          const cardsError = releaseSegmentErrors[release.release_id];
          const timelineMaxSeconds = releaseTimelineMaxSeconds(release, cards);

          return (
            <div
              key={`${releaseGroup.key}:${release.release_id}:${releaseIndex}`}
              className={styles.fansubEditReleaseItem}
            >
              <div
                className={styles.fansubEditReleaseRow}
                role="button"
                tabIndex={0}
                onClick={() => onToggleRelease(release)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleRelease(release);
                  }
                }}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? `Release ${release.release_id} einklappen`
                    : `Release ${release.release_id} ausklappen`
                }
              >
                <strong>{release.episode_number || "?"}</strong>
                <button
                  type="button"
                  className={styles.fansubEditReleaseTitleButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRelease(release);
                  }}
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? `Release ${release.release_id} einklappen`
                      : `Release ${release.release_id} ausklappen`
                  }
                >
                  <div className={styles.fansubEditReleaseTitleCell}>
                    <span>
                      {(release.episode_title || "").trim() ||
                        "Ohne Episodentitel"}
                    </span>
                  </div>
                  <span
                    className={styles.fansubEditReleaseTitleDisclosure}
                    aria-hidden="true"
                  >
                    {expanded ? (
                      <ChevronDown size={16} strokeWidth={2.2} />
                    ) : (
                      <ChevronRight size={16} strokeWidth={2.2} />
                    )}
                  </span>
                </button>
                <span>{release.version_count}</span>
                <span>
                  {release.has_theme_assets ? (
                    "Vorhanden"
                  ) : (
                    <span className={styles.fansubEditThemeMissingMark}>
                      <X size={20} strokeWidth={3.2} />
                    </span>
                  )}
                </span>
                <div className={styles.fansubEditReleaseActions}>
                  {releaseVersionTools ? (
                    <Button
                      href={releaseVersionTools.href}
                      variant="secondary"
                      size="sm"
                      leftIcon={<ExternalLink size={15} />}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {releaseVersionTools.label}
                    </Button>
                  ) : null}
                  {canOpenReleaseDrawer ? (
                    <button
                      type="button"
                      className={`${styles.button} ${styles.fansubEditReleaseEditButton}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenReleaseDrawer({
                          release,
                          animeID: releaseGroup.anime.id,
                          fansubGroupID: release.fansub_group_id,
                          contextKey: releaseGroup.key,
                        });
                      }}
                    >
                      {canUseAdminReleaseDetails ? "Editieren" : "Medien"}
                    </button>
                  ) : null}
                  <Badge
                    variant={
                      release.has_override === true
                        ? "info"
                        : release.has_override === false
                          ? "muted"
                          : "warning"
                    }
                  >
                    {release.has_override === true
                      ? "Eigene Besetzung"
                      : release.has_override === false
                        ? "Projektteam"
                        : "Mitwirkende fehlen"}
                  </Badge>
                  {canOpenReleaseContributors ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      leftIcon={<Users size={15} />}
                      aria-label={`Rollen und Personen für ${release.episode_title ?? `Release-Version ${release.release_version_id}`} bearbeiten`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenContributionDrawer(
                          release.release_version_id,
                          releaseGroup.anime.id,
                          release.episode_title ??
                            `Release-Version ${release.release_version_id}`,
                        );
                      }}
                    >
                      Rollen & Personen
                    </Button>
                  ) : null}
                </div>
                <span
                  className={styles.fansubEditReleaseRowDisclosure}
                  aria-hidden="true"
                >
                  {expanded ? (
                    <ChevronDown size={24} strokeWidth={2.4} />
                  ) : (
                    <ChevronRight size={24} strokeWidth={2.4} />
                  )}
                </span>
              </div>
              {expanded ? (
                <div className={styles.fansubEditReleaseExpanded}>
                  {canOpenReleaseContributors ? (
                    <div className={styles.fansubEditReleaseAssignmentPanel}>
                      <div className={styles.fansubEditReleaseAssignmentCopy}>
                        <strong>Rollen & Personen dieser Folge</strong>
                        <span>
                          {release.has_override
                            ? "Eigene Release-Besetzung aktiv"
                            : "Aktuell wird das Projektteam verwendet"}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Users size={16} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenContributionDrawer(
                            release.release_version_id,
                            releaseGroup.anime.id,
                            release.episode_title ??
                              `Release-Version ${release.release_version_id}`,
                          );
                        }}
                      >
                        Rollen & Personen bearbeiten
                      </Button>
                    </div>
                  ) : null}
                  <div className={styles.fansubEditReleaseExpandedHeader}>
                    <div>
                      <h4>Theme-Segmente</h4>
                    </div>
                  </div>
                  {cardsLoading ? (
                    <div className={styles.fansubEditReleaseState}>
                      Theme-Segmente werden geladen...
                    </div>
                  ) : null}
                  {cardsError ? (
                    <div className={styles.errorBox}>{cardsError}</div>
                  ) : null}
                  {!cardsLoading && !cardsError && cards.length === 0 ? (
                    <div className={styles.fansubEditReleaseState}>
                      Noch keine Theme-Definitionen für diesen Anime vorhanden.
                    </div>
                  ) : null}
                  {cards.length > 0 ? (
                    <div className={styles.fansubEditTimeline}>
                      <div
                        className={styles.fansubEditTimelineLegend}
                        aria-label="Timeline Legende"
                      >
                        <span className={styles.fansubEditTimelineLegendItem}>
                          <span
                            className={`${styles.fansubEditTimelineLegendBadge} ${styles.fansubEditTimelineLegendBadgeGlobal}`}
                          >
                            Global
                          </span>
                        </span>
                        <span className={styles.fansubEditTimelineLegendItem}>
                          <span
                            className={`${styles.fansubEditTimelineLegendBadge} ${styles.fansubEditTimelineLegendBadgeRelease}`}
                          >
                            Uploadet
                          </span>
                        </span>
                        <span className={styles.fansubEditTimelineLegendItem}>
                          <span
                            className={`${styles.fansubEditTimelineLegendBadge} ${styles.fansubEditTimelineLegendBadgeMissing}`}
                          >
                            Fehlt
                          </span>
                        </span>
                      </div>
                      <div className={styles.fansubEditTimelineScale}>
                        <span>
                          Dauer{" "}
                          {new Date(timelineMaxSeconds * 1000)
                            .toISOString()
                            .slice(11, 19)}
                        </span>
                      </div>
                      <div className={styles.fansubEditTimelineTrack}>
                        <div className={styles.fansubEditTimelineMainContent}>
                          Hauptinhalt
                        </div>
                        {cards.map((card, index) => {
                          const segment = card.segments[0];
                          const startSeconds =
                            parseClockSeconds(segment?.start_time) ??
                            Math.max(
                              0,
                              Math.round(
                                (index / Math.max(cards.length, 1)) *
                                  timelineMaxSeconds,
                              ),
                            );
                          const endSeconds =
                            parseClockSeconds(segment?.end_time) ??
                            Math.min(
                              timelineMaxSeconds,
                              startSeconds +
                                Math.round(
                                  timelineMaxSeconds /
                                    Math.max(cards.length + 2, 4),
                                ),
                            );
                          const left = Math.max(
                            0,
                            Math.min(
                              94,
                              (startSeconds / timelineMaxSeconds) * 100,
                            ),
                          );
                          const width = Math.max(
                            6,
                            Math.min(
                              100 - left,
                              ((endSeconds - startSeconds) /
                                timelineMaxSeconds) *
                                100 || 10,
                            ),
                          );
                          const lockedByJellyfin = card.segments.some(
                            (item) =>
                              item.source_type === "jellyfin_theme" ||
                              item.playback_source_kind === "jellyfin",
                          );
                          const selected =
                            selectedReleaseSegment?.release.release_id ===
                              release.release_id &&
                            selectedReleaseSegment.card.theme_id ===
                              card.theme_id;
                          const themeKind = compactThemeKind(
                            card.theme_type_name,
                          );
                          return (
                            <button
                              key={`${release.release_id}:${card.theme_id}:${index}`}
                              type="button"
                              className={`${styles.fansubEditTimelineSegment} ${styles[`fansubEditTimelineSegment${card.status}`]} ${themeKind === "op" ? styles.fansubEditTimelineSegmentOp : ""} ${themeKind === "ed" ? styles.fansubEditTimelineSegmentEd : ""} ${themeKind === "insert" ? styles.fansubEditTimelineSegmentIn : ""} ${selected ? styles.fansubEditTimelineSegmentActive : ""}`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                              aria-pressed={selected}
                              aria-label={`${timelineLabelFor(card.theme_type_name)} ${timelineStatusLabelFor(card.status)}${lockedByJellyfin ? " Jellyfin-Quelle" : ""}`}
                              onClick={() => {
                                onOpenThemeDrawer(release, card);
                              }}
                              title={
                                lockedByJellyfin
                                  ? "Jellyfin-Quelle gesetzt"
                                  : card.source_label || "Segment"
                              }
                            >
                              {timelineLabelFor(card.theme_type_name)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {hasMoreReleases ? (
          <div className={styles.fansubEditReleaseLoadMore}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={releasesLoading}
              onClick={() => {
                if (!releasePagination) return;
                onLoadMore();
              }}
            >
              Weitere Releases laden
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
