package repository

import (
	"context"
	"fmt"
)

// AnimeRelation represents a related anime with its title and relation type
type AnimeRelation struct {
	AnimeID      int64   `json:"anime_id"`
	Title        string  `json:"title"`
	RelationType string  `json:"relation_type"`
	CoverImage   *string `json:"cover_image"`
	Year         *int16  `json:"year"`
	Type         string  `json:"type"`
}

// GetAnimeRelations returns all anime related to the given anime ID
// Queries both directions: where anime is source OR target
// Only returns relations to active anime (not disabled)
func (r *AnimeRepository) GetAnimeRelations(ctx context.Context, animeID int64) ([]AnimeRelation, error) {
	query := `
		SELECT
			CASE
				WHEN ar.source_anime_id = $1 THEN ar.target_anime_id
				ELSE ar.source_anime_id
			END AS anime_id,
			a.title,
			rt.name AS relation_type,
			a.cover_image,
			a.year,
			a.type
		FROM anime_relations ar
		JOIN relation_types rt ON ar.relation_type_id = rt.id
		JOIN anime a ON (
			CASE
				WHEN ar.source_anime_id = $1 THEN ar.target_anime_id
				ELSE ar.source_anime_id
			END = a.id
		)
		WHERE (ar.source_anime_id = $1 OR ar.target_anime_id = $1)
		  AND a.status != 'disabled'
		ORDER BY a.year DESC NULLS LAST, a.title
	`

	rows, err := r.db.Query(ctx, query, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime relations: %w", err)
	}
	defer rows.Close()

	relations := make([]AnimeRelation, 0)
	for rows.Next() {
		var rel AnimeRelation
		if err := rows.Scan(&rel.AnimeID, &rel.Title, &rel.RelationType, &rel.CoverImage, &rel.Year, &rel.Type); err != nil {
			return nil, fmt.Errorf("scan anime relation: %w", err)
		}
		relations = append(relations, rel)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime relations: %w", err)
	}

	return relations, nil
}
