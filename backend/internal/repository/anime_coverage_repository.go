package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AnimeCoverageRow enthält Aggregationsdaten für ein Anime innerhalb einer Fansub-Gruppe:
// Anzahl DISTINCT Mitwirkender, abgedeckte Rollencodes und ob ein Projekt-Einblick existiert.
type AnimeCoverageRow struct {
	AnimeID          int64    `json:"anime_id"`
	MemberCount      int      `json:"member_count"`
	CoveredRoleCodes []string `json:"covered_role_codes"`
	HasProjectNote   bool     `json:"has_project_note"`
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

// CoverageByFansub liefert pro Anime der Gruppe die Anzahl DISTINCT Mitwirkender,
// die DISTINCT abgedeckten Rollencodes und den Projekt-Einblick-Status.
// Eine einzige Query — kein N+1. Nur Contributions mit Status != 'rejected' werden berücksichtigt.
func (r *AnimeCoverageRepository) CoverageByFansub(ctx context.Context, fansubGroupID int64) ([]AnimeCoverageRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			afg.anime_id,
			COUNT(DISTINCT ac.member_id) AS member_count,
			COALESCE(
				ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL),
				ARRAY[]::text[]
			) AS covered_role_codes,
			EXISTS (
				SELECT 1
				FROM anime_fansub_project_notes afpn
				WHERE afpn.anime_id = afg.anime_id
				  AND afpn.fansub_group_id = afg.fansub_group_id
				  AND afpn.deleted_at IS NULL
				  AND afpn.status <> 'deleted'
			) AS has_project_note
		FROM anime_fansub_groups afg
		LEFT JOIN anime_contributions ac
			ON ac.anime_id = afg.anime_id
			AND ac.fansub_group_id = afg.fansub_group_id
			AND ac.status <> 'rejected'
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE afg.fansub_group_id = $1
		GROUP BY afg.anime_id, afg.fansub_group_id
		ORDER BY afg.anime_id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("anime coverage by fansub: query: %w", err)
	}
	defer rows.Close()

	result := make([]AnimeCoverageRow, 0)
	for rows.Next() {
		var row AnimeCoverageRow
		if err := rows.Scan(&row.AnimeID, &row.MemberCount, &row.CoveredRoleCodes, &row.HasProjectNote); err != nil {
			return nil, fmt.Errorf("anime coverage by fansub: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("anime coverage by fansub: iterate: %w", err)
	}
	return result, nil
}
