package repository

import (
	"context"
	"fmt"
)

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

// Delete removes an anime contribution inside the route's fansub/anime context. Roles are removed via CASCADE.
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
