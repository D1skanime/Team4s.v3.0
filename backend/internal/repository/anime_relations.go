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

// inverseRelationTypeSQL dreht einen gespeicherten Relationstyp auf die Sicht des
// Ziel-Anime. Gespeichert wird immer "Ziel aus Sicht der Quelle" (Admin-Semantik).
// Für die vier Admin-Typen gilt die Team4s-Taxonomie: Wer Nebengeschichte,
// Fortsetzung oder Zusammenfassung hat, ist aus deren Sicht die Hauptgeschichte.
// Alle übrigen Typen bleiben unverändert.
const inverseRelationTypeSQL = `
	CASE rt.name
		WHEN 'side-story' THEN 'full-story'
		WHEN 'full-story' THEN 'side-story'
		WHEN 'sequel' THEN 'full-story'
		WHEN 'summary' THEN 'full-story'
		ELSE rt.name
	END`

// GetAnimeRelations returns all anime related to the given anime ID
// Queries both directions: where anime is source OR target
// Only returns relations to active anime (not disabled)
func (r *AnimeRepository) GetAnimeRelations(ctx context.Context, animeID int64) ([]AnimeRelation, error) {
	// DISTINCT ON ensures each related anime appears once even when both
	// directions (A→B and B→A) exist; the relation stored from this anime's
	// own perspective wins. relation_type always describes the related anime
	// from the viewed anime's perspective.
	query := `
		SELECT DISTINCT ON (anime_id)
			anime_id, title, relation_type, cover_image, year, type
		FROM (
			SELECT
				a.id AS anime_id,
				ar.source_anime_id = $1 AS is_outgoing,
				a.title,
				CASE
					WHEN ar.source_anime_id = $1 THEN rt.name
					ELSE ` + inverseRelationTypeSQL + `
				END AS relation_type,
				` + animeCoverImageSelectSQL("a") + ` AS cover_image,
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
			LEFT JOIN LATERAL (
				SELECT ma.file_path
				FROM anime_media am
				JOIN media_assets ma ON ma.id = am.media_id
				JOIN media_types mt ON mt.id = ma.media_type_id
				WHERE am.anime_id = a.id
				  AND mt.name = 'poster'
				ORDER BY am.sort_order ASC, ma.id ASC
				LIMIT 1
			) poster ON true
			WHERE (ar.source_anime_id = $1 OR ar.target_anime_id = $1)
			  AND a.status != 'disabled'
		) sub
		ORDER BY anime_id, is_outgoing DESC, year DESC NULLS LAST, title
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
