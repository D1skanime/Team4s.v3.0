package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgconn"
)

var adminAnimeRelationTypeToDB = map[string]string{
	"Hauptgeschichte": "full-story",
	"Nebengeschichte": "side-story",
	"Fortsetzung":     "sequel",
	"Zusammenfassung": "summary",
}

var dbAnimeRelationTypeToAdmin = map[string]string{
	"full-story": "Hauptgeschichte",
	"side-story": "Nebengeschichte",
	"sequel":     "Fortsetzung",
	"summary":    "Zusammenfassung",
}

func mapAdminRelationLabelToDB(label string) (string, bool) {
	dbName, ok := adminAnimeRelationTypeToDB[strings.TrimSpace(label)]
	return dbName, ok
}

func mapDBRelationTypeToAdmin(name string) (string, bool) {
	label, ok := dbAnimeRelationTypeToAdmin[strings.TrimSpace(name)]
	return label, ok
}

func (r *AdminContentRepository) ListAdminAnimeRelations(ctx context.Context, animeID int64) ([]models.AdminAnimeRelation, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			ar.target_anime_id,
			rt.name,
			a.title,
			a.type,
			a.year,
			a.status,
			a.cover_image
		FROM anime_relations ar
		JOIN relation_types rt ON rt.id = ar.relation_type_id
		JOIN anime a ON a.id = ar.target_anime_id
		WHERE ar.source_anime_id = $1
		  AND a.status <> 'disabled'
		ORDER BY a.year DESC NULLS LAST, a.title ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("list admin anime relations anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	relations := make([]models.AdminAnimeRelation, 0)
	for rows.Next() {
		var relation models.AdminAnimeRelation
		var relationType string
		if err := rows.Scan(
			&relation.TargetAnimeID,
			&relationType,
			&relation.TargetTitle,
			&relation.TargetType,
			&relation.TargetYear,
			&relation.TargetStatus,
			&relation.TargetCoverURL,
		); err != nil {
			return nil, fmt.Errorf("scan admin anime relation anime=%d: %w", animeID, err)
		}

		label, ok := mapDBRelationTypeToAdmin(relationType)
		if !ok {
			continue
		}
		relation.RelationLabel = label
		relations = append(relations, relation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime relations anime=%d: %w", animeID, err)
	}

	return relations, nil
}

func (r *AdminContentRepository) SearchAdminAnimeRelationTargets(
	ctx context.Context,
	currentAnimeID int64,
	query string,
	limit int,
) ([]models.AdminAnimeRelationTarget, error) {
	if currentAnimeID <= 0 {
		return nil, ErrNotFound
	}
	if limit <= 0 || limit > 25 {
		limit = 10
	}

	q := strings.TrimSpace(query)
	if q == "" {
		return []models.AdminAnimeRelationTarget{}, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			a.id,
			`+primaryNormalizedTitleSQL("a.id", "a.title")+`,
			a.type,
			a.status,
			a.year,
			a.cover_image
		FROM anime a
		WHERE a.id <> $1
		  AND a.status <> 'disabled'
		  AND (
			`+primaryNormalizedTitleSQL("a.id", "a.title")+` ILIKE $2
			OR a.title_de ILIKE $2
			OR a.title_en ILIKE $2
			OR EXISTS (
				SELECT 1
				FROM anime_titles at
				WHERE at.anime_id = a.id
				  AND at.title ILIKE $2
			)
		  )
		ORDER BY
			CASE
				WHEN `+primaryNormalizedTitleSQL("a.id", "a.title")+` ILIKE $3 THEN 0
				ELSE 1
			END,
			a.year DESC NULLS LAST,
			`+primaryNormalizedTitleSQL("a.id", "a.title")+` ASC
		LIMIT $4
	`, currentAnimeID, "%"+q+"%", q+"%", limit)
	if err != nil {
		return nil, fmt.Errorf("search admin anime relation targets anime=%d: %w", currentAnimeID, err)
	}
	defer rows.Close()

	targets := make([]models.AdminAnimeRelationTarget, 0)
	for rows.Next() {
		var target models.AdminAnimeRelationTarget
		if err := rows.Scan(&target.AnimeID, &target.Title, &target.Type, &target.Status, &target.Year, &target.CoverURL); err != nil {
			return nil, fmt.Errorf("scan admin anime relation target anime=%d: %w", currentAnimeID, err)
		}
		targets = append(targets, target)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime relation targets anime=%d: %w", currentAnimeID, err)
	}

	return targets, nil
}

func (r *AdminContentRepository) CreateAdminAnimeRelation(
	ctx context.Context,
	sourceAnimeID int64,
	targetAnimeID int64,
	relationLabel string,
) error {
	if sourceAnimeID <= 0 || targetAnimeID <= 0 {
		return ErrNotFound
	}
	if sourceAnimeID == targetAnimeID {
		return ErrConflict
	}

	relationTypeName, ok := mapAdminRelationLabelToDB(relationLabel)
	if !ok {
		return ErrConflict
	}

	exists, err := r.ensureAnimeRelationEndpointsExist(ctx, sourceAnimeID, targetAnimeID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `
		INSERT INTO anime_relations (source_anime_id, target_anime_id, relation_type_id)
		SELECT $1, $2, rt.id
		FROM relation_types rt
		WHERE rt.name = $3
	`, sourceAnimeID, targetAnimeID, relationTypeName)
	if err != nil {
		if isRelationConflict(err) {
			return ErrConflict
		}
		return fmt.Errorf("create admin anime relation %d->%d: %w", sourceAnimeID, targetAnimeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *AdminContentRepository) UpdateAdminAnimeRelation(
	ctx context.Context,
	sourceAnimeID int64,
	targetAnimeID int64,
	relationLabel string,
) error {
	relationTypeName, ok := mapAdminRelationLabelToDB(relationLabel)
	if !ok {
		return ErrConflict
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime_relations ar
		SET relation_type_id = rt.id
		FROM relation_types rt
		WHERE ar.source_anime_id = $1
		  AND ar.target_anime_id = $2
		  AND rt.name = $3
	`, sourceAnimeID, targetAnimeID, relationTypeName)
	if err != nil {
		return fmt.Errorf("update admin anime relation %d->%d: %w", sourceAnimeID, targetAnimeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *AdminContentRepository) DeleteAdminAnimeRelation(ctx context.Context, sourceAnimeID int64, targetAnimeID int64) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM anime_relations
		WHERE source_anime_id = $1
		  AND target_anime_id = $2
	`, sourceAnimeID, targetAnimeID)
	if err != nil {
		return fmt.Errorf("delete admin anime relation %d->%d: %w", sourceAnimeID, targetAnimeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *AdminContentRepository) ensureAnimeRelationEndpointsExist(ctx context.Context, sourceAnimeID int64, targetAnimeID int64) (bool, error) {
	var count int
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM anime
		WHERE id = ANY($1)
	`, []int64{sourceAnimeID, targetAnimeID}).Scan(&count); err != nil {
		return false, fmt.Errorf("check anime relation endpoints %d->%d: %w", sourceAnimeID, targetAnimeID, err)
	}
	return count == 2, nil
}

func isRelationConflict(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505" || pgErr.Code == "23514"
	}
	return false
}
