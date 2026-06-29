"use client";

import { ChevronDown, ChevronRight, ExternalLink, Users } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import type { AdminFansubRelease, AnimeContribution } from "@/types/fansub";
import { releaseVersionToolsTarget } from "./fansubEditAccess";
import { timelineLabelFor, timelineStatusLabelFor } from "./fansubEditFormatters";
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
  contributionRows: AnimeContribution[];
  releaseSegmentCards: Record<number, ReleaseSegmentCard[]>;
  releaseSegmentLoading: Record<number, boolean>;
  releaseSegmentErrors: Record<number, string | null>;
  selectedReleaseSegment: SelectedReleaseSegment | null;
  canUseReleaseMedia: boolean;
  canUseReleaseNotes: boolean;
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
  onLoadMore: () => void;
};

function uniqueContributionPeople(contributionRows: AnimeContribution[]) {
  const seen = new Set<number>();
  return contributionRows.filter((row) => {
    if (seen.has(row.member_id)) return false;
    seen.add(row.member_id);
    return true;
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ReleaseRowDetails({
  styles,
  releaseGroup,
  releases,
  releasePagination,
  releasesLoading,
  hasMoreReleases,
  expandedReleaseIds,
  contributionRows,
  releaseSegmentCards,
  releaseSegmentLoading,
  releaseSegmentErrors,
  selectedReleaseSegment,
  canUseReleaseMedia,
  canUseReleaseNotes,
  canOpenReleaseDrawer,
  canOpenReleaseContributors,
  onToggleRelease,
  onOpenReleaseDrawer,
  onOpenContributionDrawer,
  onOpenThemeDrawer,
  onLoadMore,
}: ReleaseRowDetailsProps) {
  const people = uniqueContributionPeople(contributionRows);
  const peopleCount = people.length;

  return (
    <div className={styles.fansubEditReleaseRows}>
      <div className={styles.fansubEditReleaseCardList}>
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
          const title =
            (release.episode_title || "").trim() || "Ohne Episodentitel";
          const visiblePeople = people.slice(0, 5);
          const remainingPeople = Math.max(0, people.length - visiblePeople.length);

          return (
            <article
              key={`${releaseGroup.key}:${release.release_id}:${releaseIndex}`}
              className={styles.fansubEditReleaseItem}
            >
              <button
                type="button"
                className={styles.fansubEditReleaseCardHeader}
                onClick={() => onToggleRelease(release)}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? `Episode ${release.episode_number || release.release_id} einklappen`
                    : `Episode ${release.episode_number || release.release_id} ausklappen`
                }
              >
                <span className={styles.fansubEditReleaseEpisodeBadge}>
                  EP {release.episode_number || "?"}
                </span>
                <span className={styles.fansubEditReleaseCardTitle}>
                  <strong>{title}</strong>
                  <span>Versionen: {release.version_count}</span>
                </span>
                <span className={styles.fansubEditReleaseCardChips}>
                  <Badge variant={peopleCount > 0 ? "info" : "muted"}>
                    {peopleCount} Person{peopleCount === 1 ? "" : "en"}
                  </Badge>
                  <Badge variant={release.has_theme_assets ? "success" : "muted"}>
                    {release.has_theme_assets
                      ? `${Math.max(cards.length, 1)} Theme${Math.max(cards.length, 1) === 1 ? "" : "s"}`
                      : "Keine Themes"}
                  </Badge>
                </span>
                <span className={styles.fansubEditReleaseCardDisclosure} aria-hidden="true">
                  {expanded ? (
                    <ChevronDown size={22} strokeWidth={2.4} />
                  ) : (
                    <ChevronRight size={22} strokeWidth={2.4} />
                  )}
                </span>
              </button>

              {expanded ? (
                <div className={styles.fansubEditReleaseExpanded}>
                  <div className={styles.fansubEditReleasePeopleBox}>
                    <div className={styles.fansubEditReleaseAvatarStack} aria-hidden="true">
                      {visiblePeople.map((person) => (
                        <span key={person.member_id}>
                          {person.member_avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={person.member_avatar_url} alt="" />
                          ) : (
                            initials(person.member_display_name)
                          )}
                        </span>
                      ))}
                      {remainingPeople > 0 ? <span>+{remainingPeople}</span> : null}
                    </div>
                    <div className={styles.fansubEditReleasePeopleNames}>
                      <strong>Besetzung</strong>
                      <span>
                        {people.length > 0
                          ? people.map((person) => person.member_display_name).join(", ")
                          : release.has_override
                            ? "Eigene Besetzung noch nicht geladen"
                            : "Projektteam noch nicht gepflegt"}
                      </span>
                    </div>
                  </div>

                  <section className={styles.fansubEditReleaseThemeBox} aria-label="Theme-Segmente">
                    <div className={styles.fansubEditReleaseThemeBoxHeader}>
                      <strong>Theme-Segmente</strong>
                      <span>{cards.length > 0 ? `${cards.length} Eintrag${cards.length === 1 ? "" : "e"}` : "Keine Themes"}</span>
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
                      <div className={styles.fansubEditReleaseThemeList}>
                        {cards.map((card, index) => {
                          const selected =
                            selectedReleaseSegment?.release.release_id ===
                              release.release_id &&
                            selectedReleaseSegment.card.theme_id === card.theme_id;
                          return (
                            <button
                              key={`${release.release_id}:${card.theme_id}:${index}`}
                              type="button"
                              className={`${styles.fansubEditReleaseThemeItem} ${selected ? styles.fansubEditReleaseThemeItemActive : ""}`}
                              aria-pressed={selected}
                              onClick={() => onOpenThemeDrawer(release, card)}
                            >
                              <span>
                                <strong>{timelineLabelFor(card.theme_type_name)}</strong>
                                <small>{card.theme_title || card.source_label || "Theme"}</small>
                              </span>
                              <Badge
                                variant={
                                  card.status === "release"
                                    ? "success"
                                    : card.status === "global"
                                      ? "info"
                                      : "warning"
                                }
                              >
                                {timelineStatusLabelFor(card.status)}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>

                  <div className={styles.fansubEditReleaseCardActions}>
                    {canOpenReleaseContributors ? (
                      <Button
                        type="button"
                        variant="primary"
                        leftIcon={<Users size={16} />}
                        onClick={() =>
                          onOpenContributionDrawer(
                            release.release_version_id,
                            releaseGroup.anime.id,
                            title,
                          )
                        }
                      >
                        Besetzung bearbeiten
                      </Button>
                    ) : null}
                    {releaseVersionTools ? (
                      <Button
                        href={releaseVersionTools.href}
                        variant="ghost"
                        leftIcon={<ExternalLink size={16} />}
                      >
                        {releaseVersionTools.label} öffnen
                      </Button>
                    ) : canOpenReleaseDrawer ? (
                      <Button
                        type="button"
                        variant="ghost"
                        leftIcon={<ExternalLink size={16} />}
                        onClick={() =>
                          onOpenReleaseDrawer({
                            release,
                            animeID: releaseGroup.anime.id,
                            fansubGroupID: release.fansub_group_id,
                            contextKey: releaseGroup.key,
                          })
                        }
                      >
                        Notizen & Medien öffnen
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
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
