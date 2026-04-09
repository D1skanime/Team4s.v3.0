package repository

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AdminContentRepository) DeleteAnime(
	ctx context.Context,
	id int64,
	actorUserID int64,
) (*models.AdminAnimeDeleteResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin delete anime tx %d: %w", id, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	useV2Schema, err := hasV2AnimeDeleteAssetSchema(ctx, tx)
	if err != nil {
		return nil, err
	}

	result, err := loadAnimeDeleteResult(ctx, tx, id, useV2Schema)
	if err != nil {
		return nil, err
	}

	if err := deleteAnimeAssociations(ctx, tx, id, useV2Schema); err != nil {
		return nil, err
	}

	orphanedCoverImage, err := resolveOrphanedLocalCoverImage(ctx, tx, result.OrphanedLocalCoverImage, useV2Schema)
	if err != nil {
		return nil, err
	}
	result.OrphanedLocalCoverImage = orphanedCoverImage

	auditEntry, err := buildAdminAnimeAuditEntryForDelete(actorUserID, *result)
	if err != nil {
		return nil, err
	}
	if err := insertAdminAnimeAuditEntry(ctx, tx, auditEntry); err != nil {
		return nil, err
	}

	deleteTag, err := tx.Exec(ctx, `DELETE FROM anime WHERE id = $1`, id)
	if err != nil {
		return nil, fmt.Errorf("delete anime %d: %w", id, err)
	}
	if deleteTag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit delete anime tx %d: %w", id, err)
	}

	return result, nil
}

func loadAnimeDeleteResult(
	ctx context.Context,
	tx pgx.Tx,
	id int64,
	useV2Schema bool,
) (*models.AdminAnimeDeleteResult, error) {
	if useV2Schema {
		return loadAnimeDeleteResultV2(ctx, tx, id)
	}

	var result models.AdminAnimeDeleteResult
	if err := tx.QueryRow(
		ctx,
		`SELECT id, title, cover_image FROM anime WHERE id = $1 FOR UPDATE`,
		id,
	).Scan(&result.AnimeID, &result.Title, &result.OrphanedLocalCoverImage); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load anime %d for delete: %w", id, err)
	}

	return &result, nil
}

func loadAnimeDeleteResultV2(ctx context.Context, tx pgx.Tx, id int64) (*models.AdminAnimeDeleteResult, error) {
	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return nil, err
	}

	var result models.AdminAnimeDeleteResult
	query := fmt.Sprintf(
		`
		SELECT
			a.id,
			COALESCE(
				(
					SELECT at.title
					FROM anime_titles at
					JOIN languages l ON l.id = at.language_id
					JOIN title_types tt ON tt.id = at.title_type_id
					WHERE at.anime_id = a.id
					ORDER BY
						CASE l.code
							WHEN 'ja' THEN 0
							WHEN 'romaji' THEN 1
							WHEN 'en' THEN 2
							WHEN 'de' THEN 3
							ELSE 10
						END,
						CASE tt.name
							WHEN 'main' THEN 0
							WHEN 'romaji' THEN 1
							WHEN 'official' THEN 2
							WHEN 'synonym' THEN 3
							WHEN 'short' THEN 4
							ELSE 10
						END,
						at.title ASC
					LIMIT 1
				),
				%s
			) AS display_title,
			(
				SELECT ma.file_path
				FROM anime_media am
				JOIN media_assets ma ON ma.id = am.media_id
				JOIN media_types mt ON mt.id = ma.media_type_id
				WHERE am.anime_id = a.id
				  AND mt.name = 'poster'
				ORDER BY am.sort_order ASC, ma.id ASC
				LIMIT 1
			) AS cover_file_path
		FROM anime a
		WHERE a.id = $1
		FOR UPDATE
		`,
		v2AnimeTitleFallbackSQL(schema),
	)
	if err := tx.QueryRow(
		ctx,
		query,
		id,
	).Scan(&result.AnimeID, &result.Title, &result.OrphanedLocalCoverImage); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load anime %d for v2 delete: %w", id, err)
	}

	return &result, nil
}

func deleteAnimeAssociations(ctx context.Context, tx pgx.Tx, animeID int64, useV2Schema bool) error {
	if useV2Schema {
		return deleteAnimeAssociationsV2(ctx, tx, animeID)
	}

	statements := []string{
		`DELETE FROM anime_relations WHERE source_anime_id = $1 OR target_anime_id = $1`,
		`DELETE FROM anime_titles WHERE anime_id = $1`,
		`DELETE FROM anime_genres WHERE anime_id = $1`,
		`DELETE FROM anime_tags WHERE anime_id = $1`,
		`DELETE FROM anime_media WHERE anime_id = $1`,
	}

	for _, statement := range statements {
		if _, err := tx.Exec(ctx, statement, animeID); err != nil {
			return fmt.Errorf("delete anime associations %d: %w", animeID, err)
		}
	}

	return nil
}

func deleteAnimeAssociationsV2(ctx context.Context, tx pgx.Tx, animeID int64) error {
	rows, err := tx.Query(ctx, `SELECT media_id FROM anime_media WHERE anime_id = $1`, animeID)
	if err != nil {
		return fmt.Errorf("query anime media ids %d: %w", animeID, err)
	}
	defer rows.Close()

	mediaIDs := make([]int64, 0)
	for rows.Next() {
		var mediaID int64
		if err := rows.Scan(&mediaID); err != nil {
			return fmt.Errorf("scan anime media id %d: %w", animeID, err)
		}
		mediaIDs = append(mediaIDs, mediaID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate anime media ids %d: %w", animeID, err)
	}

	statements := []string{
		`DELETE FROM anime_relations WHERE source_anime_id = $1 OR target_anime_id = $1`,
		`DELETE FROM anime_titles WHERE anime_id = $1`,
		`DELETE FROM anime_genres WHERE anime_id = $1`,
		`DELETE FROM anime_tags WHERE anime_id = $1`,
		`DELETE FROM anime_media WHERE anime_id = $1`,
	}
	for _, statement := range statements {
		if _, err := tx.Exec(ctx, statement, animeID); err != nil {
			return fmt.Errorf("delete v2 anime associations %d: %w", animeID, err)
		}
	}

	for _, mediaID := range mediaIDs {
		if _, err := tx.Exec(ctx, `DELETE FROM media_external WHERE media_id = $1`, mediaID); err != nil {
			return fmt.Errorf("delete unreferenced anime media external %d/%d: %w", animeID, mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_files WHERE media_id = $1`, mediaID); err != nil {
			return fmt.Errorf("delete unreferenced anime media files %d/%d: %w", animeID, mediaID, err)
		}
		tag, err := tx.Exec(ctx, `
			DELETE FROM media_assets ma
			WHERE ma.id = $1
			  AND NOT EXISTS (SELECT 1 FROM anime_media am WHERE am.media_id = ma.id)
			  AND NOT EXISTS (SELECT 1 FROM episode_media em WHERE em.media_id = ma.id)
			  AND NOT EXISTS (SELECT 1 FROM fansub_group_media fgm WHERE fgm.media_id = ma.id)
			  AND NOT EXISTS (SELECT 1 FROM release_media rm WHERE rm.media_id = ma.id)
		`, mediaID)
		if err != nil {
			return fmt.Errorf("delete unreferenced anime media %d/%d: %w", animeID, mediaID, err)
		}
		_ = tag
	}

	if err := deleteAnimeOwnedMediaByPathPrefixV2(ctx, tx, animeID); err != nil {
		return err
	}

	return nil
}

func deleteAnimeOwnedMediaByPathPrefixV2(ctx context.Context, tx pgx.Tx, animeID int64) error {
	pathPrefix := fmt.Sprintf("/media/anime/%d/", animeID)

	rows, err := tx.Query(ctx, `
		SELECT ma.id
		FROM media_assets ma
		WHERE ma.file_path LIKE $1
		  AND NOT EXISTS (SELECT 1 FROM anime_media am WHERE am.media_id = ma.id)
		  AND NOT EXISTS (SELECT 1 FROM episode_media em WHERE em.media_id = ma.id)
		  AND NOT EXISTS (SELECT 1 FROM fansub_group_media fgm WHERE fgm.media_id = ma.id)
		  AND NOT EXISTS (SELECT 1 FROM release_media rm WHERE rm.media_id = ma.id)
	`, pathPrefix+"%")
	if err != nil {
		return fmt.Errorf("query anime-owned media by path prefix %d: %w", animeID, err)
	}
	defer rows.Close()

	mediaIDs := make([]int64, 0)
	for rows.Next() {
		var mediaID int64
		if err := rows.Scan(&mediaID); err != nil {
			return fmt.Errorf("scan anime-owned media id by path prefix %d: %w", animeID, err)
		}
		mediaIDs = append(mediaIDs, mediaID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate anime-owned media ids by path prefix %d: %w", animeID, err)
	}

	for _, mediaID := range mediaIDs {
		if _, err := tx.Exec(ctx, `DELETE FROM media_external WHERE media_id = $1`, mediaID); err != nil {
			return fmt.Errorf("delete anime-owned media external by path prefix %d/%d: %w", animeID, mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_files WHERE media_id = $1`, mediaID); err != nil {
			return fmt.Errorf("delete anime-owned media files by path prefix %d/%d: %w", animeID, mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, mediaID); err != nil {
			return fmt.Errorf("delete anime-owned media asset by path prefix %d/%d: %w", animeID, mediaID, err)
		}
	}

	return nil
}

func resolveOrphanedLocalCoverImage(
	ctx context.Context,
	tx pgx.Tx,
	coverImage *string,
	useV2Schema bool,
) (*string, error) {
	if !isLocalUploadedCoverImage(coverImage) {
		return nil, nil
	}

	if useV2Schema {
		return resolveOrphanedLocalCoverImageV2(ctx, tx, coverImage)
	}

	var referenceCount int64
	if err := tx.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM anime WHERE cover_image = $1`,
		strings.TrimSpace(*coverImage),
	).Scan(&referenceCount); err != nil {
		return nil, fmt.Errorf("count cover_image references %q: %w", strings.TrimSpace(*coverImage), err)
	}
	if referenceCount > 0 {
		return nil, nil
	}

	trimmed := strings.TrimSpace(*coverImage)
	return &trimmed, nil
}

func resolveOrphanedLocalCoverImageV2(ctx context.Context, tx pgx.Tx, coverImage *string) (*string, error) {
	var referenceCount int64
	if err := tx.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM media_assets WHERE file_path = $1`,
		strings.TrimSpace(*coverImage),
	).Scan(&referenceCount); err != nil {
		return nil, fmt.Errorf("count v2 media file_path references %q: %w", strings.TrimSpace(*coverImage), err)
	}
	if referenceCount > 0 {
		return nil, nil
	}

	trimmed := strings.TrimSpace(*coverImage)
	return &trimmed, nil
}

func hasV2AnimeDeleteAssetSchema(ctx context.Context, tx pgx.Tx) (bool, error) {
	hasAnimeMedia, err := hasAnimeMediaTableTx(ctx, tx)
	if err != nil {
		return false, fmt.Errorf("detect anime delete asset schema tables: %w", err)
	}
	if !hasAnimeMedia {
		return false, nil
	}

	return true, nil
}

func hasAnimeMediaTableTx(ctx context.Context, tx pgx.Tx) (bool, error) {
	var hasAnimeMedia bool
	if err := tx.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = 'anime_media'
		)
		`,
	).Scan(&hasAnimeMedia); err != nil {
		return false, fmt.Errorf("detect anime_media table: %w", err)
	}

	return hasAnimeMedia, nil
}

func isLocalUploadedCoverImage(value *string) bool {
	trimmed := strings.TrimSpace(derefString(value))
	if trimmed == "" {
		return false
	}
	if strings.Contains(trimmed, "://") || strings.HasPrefix(trimmed, "/") || strings.HasPrefix(trimmed, `\`) {
		return false
	}
	if strings.Contains(trimmed, "/") || strings.Contains(trimmed, `\`) {
		return false
	}

	base := filepath.Base(trimmed)
	return base == trimmed
}
