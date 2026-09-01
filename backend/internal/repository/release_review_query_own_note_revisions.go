package repository

import (
	"context"
	"fmt"
)

// PendingOwnNoteRevisionRow is one flat (release-version-note) row belonging to the
// queried member whose most recent review lifecycle is 'rejected'. Grouping by
// (AnimeID, FansubGroupID) into the dashboard's OwnDashboardPendingOwnNoteRevisionGroup
// shape happens one layer up (dashboard_me_handler.go), matching how
// attachPendingReleaseReviewAttention groups PendingReleaseReviewAttention's own flat
// rows today.
type PendingOwnNoteRevisionRow struct {
	AnimeID          int64
	AnimeTitle       string
	FansubGroupID    int64
	FansubGroupName  string
	ReleaseVersionID int64
	EpisodeNumber    string
	NoteTitle        string
}

// PendingOwnNoteRevisionAttention lists the actor's OWN release-version notes whose
// review lifecycle is currently 'rejected', grouped later by (anime, fansub group) for
// ROADMAP Success Criterion 7's dashboard lane. This is the INVERSE of the review-queue
// self-exclusion predicate used by PendingReleaseReviewAttention/List/Counts (RQUE-02/
// D15, Phase 141) -- it explicitly WANTS the actor's own rows, so that predicate must
// NOT be applied here (per 143-PATTERNS.md's explicit warning).
//
// `tombstoned` needs no special-casing: release_review_cleanup_repository.go sets
// deleted_at on tombstone, which the existing rvn.deleted_at IS NULL clause already
// excludes (confirmed 143-CONTEXT.md Kriterium 7).
//
// Security (T-143-13, Information Disclosure): actorMemberID is bound to
// WHERE rvn.member_id = $1 -- the caller (dashboard_me_handler.go) must resolve this
// exclusively via resolveVerifiedMemberIDForAppUser, never from a client-supplied
// parameter, mirroring this handler's existing D-08 ownership-gate contract.
func (r *ReleaseReviewQueryRepository) PendingOwnNoteRevisionAttention(
	ctx context.Context,
	actorMemberID int64,
) ([]PendingOwnNoteRevisionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT anime.id, COALESCE(anime.title_de, anime.title_en, anime.title, ''),
		       fg.id, COALESCE(fg.name, ''),
		       rvn.release_version_id, COALESCE(episode.episode_number, ''), COALESCE(NULLIF(rvn.title, ''), '')
		FROM release_version_notes rvn
		JOIN release_version_note_review_lifecycle lifecycle
		  ON lifecycle.release_version_note_id = rvn.id AND lifecycle.review_state = 'rejected'
		JOIN release_versions version ON version.id = rvn.release_version_id
		JOIN fansub_releases release ON release.id = version.release_id
		JOIN episodes episode ON episode.id = release.episode_id
		JOIN anime ON anime.id = episode.anime_id
		JOIN fansub_groups fg ON fg.id = rvn.fansub_group_id
		WHERE rvn.member_id = $1 AND rvn.deleted_at IS NULL
		ORDER BY anime.id, fg.id, COALESCE(episode.sort_index, 2147483647), episode.id, rvn.release_version_id
	`, actorMemberID)
	if err != nil {
		return nil, fmt.Errorf("list pending own note revision attention: %w", err)
	}
	defer rows.Close()

	items := make([]PendingOwnNoteRevisionRow, 0)
	for rows.Next() {
		var item PendingOwnNoteRevisionRow
		if err := rows.Scan(
			&item.AnimeID, &item.AnimeTitle, &item.FansubGroupID, &item.FansubGroupName,
			&item.ReleaseVersionID, &item.EpisodeNumber, &item.NoteTitle,
		); err != nil {
			return nil, fmt.Errorf("scan pending own note revision attention: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending own note revision attention: %w", err)
	}
	return items, nil
}
