import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import type { MeAnimeContribution } from "@/types/contributions";
import type {
  OwnDashboardPendingClaim,
  OwnDashboardPendingGroupMediaReview,
  OwnDashboardPendingOwnNoteRevisionGroup,
  OwnDashboardPendingReleaseReview,
} from "@/types/dashboard";

import {
  ATTENTION_WINDOW_DAYS,
  groupAttentionContributions,
  isRecentlyAssigned,
  presentAttentionContribution,
  resolveWorkspaceHref,
} from "./attentionHelpers";
import styles from "./AttentionSection.module.css";

export interface AttentionSectionProps {
  contributions: MeAnimeContribution[];
  pendingClaims: OwnDashboardPendingClaim[];
  pendingGroupMediaReviews?: OwnDashboardPendingGroupMediaReview[];
  pendingReleaseReviews?: OwnDashboardPendingReleaseReview[];
  pendingOwnNoteRevisions?: OwnDashboardPendingOwnNoteRevisionGroup[];
}

/**
 * "Braucht deine Aufmerksamkeit" (D-02): zeigt kuerzlich zugewiesene Projekt-/Release-
 * Contributions als Card-Liste, neueste zuerst. Verwendet ausschliesslich die in Plan
 * 116-01 gebauten reinen Helfer (isRecentlyAssigned/resolveWorkspaceHref) statt die
 * "neu"-Logik oder Link-Aufloesung hier erneut zu implementieren.
 */
export function AttentionSection({
  contributions,
  pendingClaims,
  pendingGroupMediaReviews = [],
  pendingReleaseReviews = [],
  pendingOwnNoteRevisions = [],
}: AttentionSectionProps) {
  const contributionProjects = groupAttentionContributions(contributions);

  return (
    <section className={styles.section}>
      <SectionHeader title="Braucht deine Aufmerksamkeit" />
      {contributionProjects.length === 0 &&
      pendingClaims.length === 0 &&
      pendingGroupMediaReviews.length === 0 &&
      pendingReleaseReviews.length === 0 &&
      pendingOwnNoteRevisions.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Nichts Neues im Moment"
          description="Du hast in den letzten 14 Tagen keine neuen Projekt- oder Release-Zuweisungen erhalten."
        />
      ) : (
        <ul className={styles.list}>
          {pendingGroupMediaReviews.map((review) => (
            <li key={"group-media-review-" + review.fansub_group_id}>
              <Card variant="interactive" className={styles.itemCard}>
                <Link
                  className={styles.itemLink}
                  href={
                    "/admin/fansubs/" +
                    review.fansub_group_id +
                    "/edit?tab=media"
                  }
                >
                  <span className={styles.itemTitle}>
                    <strong>
                      {review.count} Gruppenbild{review.count === 1 ? "" : "er"}{" "}
                      prüfen
                    </strong>
                    <span> in {review.fansub_group_name}</span>
                  </span>
                  <Badge variant="warning">Offen</Badge>
                  <span className={styles.itemAction}>
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </Card>
            </li>
          ))}
          {pendingReleaseReviews.map((review) => (
            <li
              key={
                "release-review-" +
                review.fansub_group_id +
                "-" +
                review.anime_id
              }
            >
              <Card variant="interactive" className={styles.itemCard}>
                <Link
                  className={styles.itemLink}
                  href={
                    "/admin/fansubs/" +
                    review.fansub_group_id +
                    "/edit?tab=pruefungen"
                  }
                >
                  <span className={styles.itemTitle}>
                    <strong>{review.anime_title}</strong>
                    <span> · {formatReleaseReviewCounts(review)} prüfen</span>
                  </span>
                  <Badge variant="warning">Offen</Badge>
                  <span className={styles.itemAction}>
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </Card>
            </li>
          ))}
          {pendingClaims.map((claim) => (
            <li key={"claim-" + claim.claim_id}>
              <Card variant="interactive" className={styles.itemCard}>
                <Link
                  className={styles.itemLink}
                  href={
                    "/admin/fansubs/" +
                    claim.fansub_group_id +
                    "/edit?tab=collaboration"
                  }
                >
                  <span className={styles.itemTitle}>
                    <strong>Claim von {claim.member_nickname} prüfen</strong>
                    <span> in {claim.fansub_group_name}</span>
                  </span>
                  <Badge variant="warning">Offen</Badge>
                  <span className={styles.itemAction}>
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </Card>
            </li>
          ))}
          {pendingOwnNoteRevisions.map((group) => (
            <li
              key={
                "own-note-revision-" +
                group.anime_id +
                "-" +
                group.fansub_group_id
              }
            >
              <Card variant="default" className={styles.itemCard}>
                <div className={styles.noteGroupHeader}>
                  <span className={styles.itemTitle}>
                    <strong>{group.anime_title}</strong>
                    <span> · {group.fansub_group_name}</span>
                  </span>
                  <Badge variant="danger">Abgelehnt</Badge>
                </div>
                <ul
                  className={
                    group.items.length === 1
                      ? `${styles.noteRevisionList} ${styles.noteRevisionListSingle}`
                      : styles.noteRevisionList
                  }
                >
                  {group.items.map((item) => {
                    const episode = item.episode_number
                      ? `Folge ${item.episode_number}`
                      : "Release-Version";
                    const title = item.note_title || "Ohne Titel";
                    return (
                      <li key={item.release_version_id}>
                        <Link
                          className={styles.noteRevisionRow}
                          href={`/me/releases/${item.release_version_id}/workspace?tab=notes`}
                          aria-label={`${episode} · ${title} überarbeiten öffnen`}
                        >
                          <span className={styles.noteRevisionEpisode}>
                            {episode}
                          </span>
                          <span className={styles.noteRevisionTitle}>
                            {title}
                          </span>
                          <span className={styles.itemAction}>
                            <ArrowRight size={15} aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          ))}
          {contributionProjects.map((project) => (
            <li key={project.key}>
              <Card variant="interactive" className={styles.itemCard}>
                <Link className={styles.itemLink} href={project.href}>
                  <span className={styles.itemTitle}>
                    <strong>{project.animeTitle}</strong>
                    {project.fansubGroupName ? <span> · {project.fansubGroupName}</span> : null}
                    <span className={styles.taskList}>
                      {project.contributions.map((contribution) => (
                        <span key={contribution.id} className={styles.taskChip}>
                          {presentAttentionContribution(contribution).detail}
                        </span>
                      ))}
                    </span>
                  </span>
                  {project.hasRecentAssignment ? <Badge variant="info">Neu</Badge> : null}
                  <span className={styles.itemAction}>
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatReleaseReviewCounts(
  review: OwnDashboardPendingReleaseReview,
): string {
  const parts: string[] = [];
  if (review.image_count > 0) {
    parts.push(
      `${review.image_count} Bild${review.image_count === 1 ? "" : "er"}`,
    );
  }
  if (review.text_count > 0) {
    parts.push(
      `${review.text_count} Text${review.text_count === 1 ? "" : "e"}`,
    );
  }
  return parts.join(" und ");
}
