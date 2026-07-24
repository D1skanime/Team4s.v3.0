package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func deleteProjectRosterInTx(ctx context.Context, tx pgx.Tx, fansubGroupID, animeID, id int64) (*ProjectRosterMutationResult, error) {
	var memberID int64
	var status string
	var releaseVersionID *int64
	err := tx.QueryRow(ctx, `
		SELECT member_id,status,release_version_id
		FROM anime_contributions
		WHERE id=$1 AND fansub_group_id=$2 AND anime_id=$3
		FOR UPDATE
	`, id, fansubGroupID, animeID).Scan(&memberID, &status, &releaseVersionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("delete project roster load: %w", err)
	}
	if releaseVersionID != nil {
		return nil, ErrValidation
	}
	if _, err := tx.Exec(ctx, `DELETE FROM anime_contributions WHERE id=$1 AND fansub_group_id=$2 AND anime_id=$3 AND release_version_id IS NULL`, id, fansubGroupID, animeID); err != nil {
		return nil, fmt.Errorf("delete project roster: %w", err)
	}
	return &ProjectRosterMutationResult{
		ContributionID: id, MemberID: memberID,
		WasConfirmed: status == "confirmed", IsConfirmed: false,
	}, nil
}

// ListByMemberID returns anime contributions for the given member (used by Me-routes).
// Ausgelagert aus anime_contributions_repository.go fuer das 450-Zeilen-Limit.
func (r *AnimeContributionsRepository) ListByMemberID(ctx context.Context, memberID int64) ([]AnimeContributionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+animeContributionSelectCols+`
		FROM anime_contributions ac
		LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
		GROUP BY ac.id
		ORDER BY ac.created_at DESC
		LIMIT 50
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("list anime contributions by member id: %w", err)
	}
	defer rows.Close()

	result := make([]AnimeContributionRow, 0)
	for rows.Next() {
		row, err := scanAnimeContributionRow(rows)
		if err != nil {
			return nil, fmt.Errorf("list anime contributions by member id: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list anime contributions by member id: iterate: %w", err)
	}
	return result, nil
}

// Delete entfernt eine Contribution physisch (Hard-DELETE, kein Soft-Delete).
// CONSTRAINT D-16: Leader-Löschen soll langfristig Soft-Delete nutzen (deleted_at-Feld).
// Da anime_contributions kein deleted_at-Schema-Slot hat, bleibt dies Folgearbeit.
// Audit-Logs für gelöschte Contributions enthalten keine Tombstone-Records.
// Roles are removed via CASCADE.
func (r *AnimeContributionsRepository) Delete(ctx context.Context, fansubGroupID int64, animeID int64, id int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM anime_contributions WHERE id = $1 AND fansub_group_id = $2 AND anime_id = $3`, id, fansubGroupID, animeID)
	if err != nil {
		return fmt.Errorf("delete anime contribution: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
