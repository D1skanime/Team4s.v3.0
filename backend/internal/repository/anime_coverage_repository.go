package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AnimeCoverageRow enthält Aggregationsdaten für ein Anime innerhalb einer Fansub-Gruppe:
// Anzahl DISTINCT Mitwirkender und die abgedeckten Rollencodes.
type AnimeCoverageRow struct {
	AnimeID          int64    `json:"anime_id"`
	MemberCount      int      `json:"member_count"`
	CoveredRoleCodes []string `json:"covered_role_codes"`
}

// AnimeCoverageRepository berechnet Aggregations-Coverage für alle Anime einer Fansub-Gruppe.
// Wird von FansubAnimeContributionsHandler.GetAnimeCoverage genutzt.
type AnimeCoverageRepository struct {
	db *pgxpool.Pool
}

// NewAnimeCoverageRepository erstellt ein neues AnimeCoverageRepository.
func NewAnimeCoverageRepository(db *pgxpool.Pool) *AnimeCoverageRepository {
	return &AnimeCoverageRepository{db: db}
}

// CoverageByFansub liefert pro Anime der Gruppe die Anzahl DISTINCT Mitwirkender
// und die DISTINCT abgedeckten Rollencodes aus anime_contributions + anime_contribution_roles.
// Eine einzige Query — kein N+1.
// Nur Contributions mit Status != 'rejected' werden berücksichtigt.
func (r *AnimeCoverageRepository) CoverageByFansub(ctx context.Context, fansubGroupID int64) ([]AnimeCoverageRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ac.anime_id,
			COUNT(DISTINCT ac.member_id) AS member_count,
			COALESCE(
				ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL),
				ARRAY[]::text[]
			) AS covered_role_codes
		FROM anime_contributions ac
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.fansub_group_id = $1
		  AND ac.status <> 'rejected'
		GROUP BY ac.anime_id
		ORDER BY ac.anime_id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("anime coverage by fansub: query: %w", err)
	}
	defer rows.Close()

	result := make([]AnimeCoverageRow, 0)
	for rows.Next() {
		var row AnimeCoverageRow
		if err := rows.Scan(&row.AnimeID, &row.MemberCount, &row.CoveredRoleCodes); err != nil {
			return nil, fmt.Errorf("anime coverage by fansub: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("anime coverage by fansub: iterate: %w", err)
	}
	return result, nil
}
