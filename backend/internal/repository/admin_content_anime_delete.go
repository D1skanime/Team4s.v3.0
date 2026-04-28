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

	if err := preserveReusableSegmentLibraryRowsForAnimeDelete(ctx, tx, id); err != nil {
		return nil, err
	}

	if err := deleteAnimeAssociations(ctx, tx, id, useV2Schema); err != nil {
		return nil, err
	}
	if err := detachSegmentLibraryAssignmentsForAnimeDelete(ctx, tx, id); err != nil {
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
	if useV2Schema {
		if err := cleanupAfterAnimeDeleteV2(ctx, tx, id); err != nil {
			return nil, err
		}
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
			anime.id,
			COALESCE(
				(
					SELECT at.title
					FROM anime_titles at
					JOIN languages l ON l.id = at.language_id
					JOIN title_types tt ON tt.id = at.title_type_id
					WHERE at.anime_id = anime.id
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
				WHERE am.anime_id = anime.id
				  AND mt.name = 'poster'
				ORDER BY am.sort_order ASC, ma.id ASC
				LIMIT 1
			) AS cover_file_path
		FROM anime
		WHERE anime.id = $1
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
	hasSegmentLibraryAssets, err := hasTableTx(ctx, tx, "segment_library_assets")
	if err != nil {
		return fmt.Errorf("detect segment_library_assets table: %w", err)
	}

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
		deleteMediaSQL := `
			DELETE FROM media_assets ma
			WHERE ma.id = $1
			  AND NOT EXISTS (SELECT 1 FROM anime_media am WHERE am.media_id = ma.id)
			  AND NOT EXISTS (SELECT 1 FROM episode_media em WHERE em.media_id = ma.id)
			  AND NOT EXISTS (SELECT 1 FROM fansub_group_media fgm WHERE fgm.media_id = ma.id)
			  AND NOT EXISTS (SELECT 1 FROM release_media rm WHERE rm.media_id = ma.id)`
		if hasSegmentLibraryAssets {
			deleteMediaSQL += `
			  AND NOT EXISTS (SELECT 1 FROM segment_library_assets sla WHERE sla.media_asset_id = ma.id)`
		}
		tag, err := tx.Exec(ctx, deleteMediaSQL, mediaID)
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
	hasSegmentLibraryAssets, err := hasTableTx(ctx, tx, "segment_library_assets")
	if err != nil {
		return fmt.Errorf("detect segment_library_assets table: %w", err)
	}

	query := `
		SELECT ma.id
		FROM media_assets ma
		WHERE ma.file_path LIKE $1
		  AND NOT EXISTS (SELECT 1 FROM anime_media am WHERE am.media_id = ma.id)
		  AND NOT EXISTS (SELECT 1 FROM episode_media em WHERE em.media_id = ma.id)
		  AND NOT EXISTS (SELECT 1 FROM fansub_group_media fgm WHERE fgm.media_id = ma.id)
		  AND NOT EXISTS (SELECT 1 FROM release_media rm WHERE rm.media_id = ma.id)`
	if hasSegmentLibraryAssets {
		query += `
		  AND NOT EXISTS (SELECT 1 FROM segment_library_assets sla WHERE sla.media_asset_id = ma.id)`
	}

	rows, err := tx.Query(ctx, query, pathPrefix+"%")
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

func cleanupAfterAnimeDeleteV2(ctx context.Context, tx pgx.Tx, animeID int64) error {
	if err := deleteAnimeOwnedMediaByPathPrefixV2(ctx, tx, animeID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM stream_sources ss
		WHERE NOT EXISTS (
			SELECT 1 FROM release_streams rs
			WHERE rs.stream_source_id = ss.id
		)
	`); err != nil {
		return fmt.Errorf("delete orphaned stream sources after anime delete %d: %w", animeID, err)
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

type segmentStableAnimeSource struct {
	Provider   string
	ExternalID string
}

type segmentDeleteMirrorRow struct {
	ThemeSegmentID int64
	AnimeID        int64
	FansubGroupID  *int64
	Version        string
	ThemeTitle     *string
	ThemeTypeName  string
	SourceRef      *string
	SourceLabel    *string
}

func preserveReusableSegmentLibraryRowsForAnimeDelete(ctx context.Context, tx pgx.Tx, animeID int64) error {
	hasDefinitions, err := hasTableTx(ctx, tx, "segment_library_definitions")
	if err != nil {
		return fmt.Errorf("detect segment library definitions table: %w", err)
	}
	if !hasDefinitions {
		return nil
	}

	source, err := loadStableSegmentAnimeSourceForDelete(ctx, tx, animeID)
	if err != nil {
		return err
	}
	if source == nil {
		return nil
	}

	rows, err := tx.Query(ctx, `
		SELECT
			ts.id,
			t.anime_id,
			ts.fansub_group_id,
			COALESCE(ts.version, 'v1') AS version,
			t.title AS theme_title,
			tt.name AS theme_type_name,
			ts.source_ref,
			ts.source_label
		FROM theme_segments ts
		JOIN themes t ON t.id = ts.theme_id
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE t.anime_id = $1
	`, animeID)
	if err != nil {
		return fmt.Errorf("query reusable segment rows anime=%d: %w", animeID, err)
	}
	mirrorRows := make([]segmentDeleteMirrorRow, 0)
	for rows.Next() {
		var row segmentDeleteMirrorRow
		if err := rows.Scan(
			&row.ThemeSegmentID,
			&row.AnimeID,
			&row.FansubGroupID,
			&row.Version,
			&row.ThemeTitle,
			&row.ThemeTypeName,
			&row.SourceRef,
			&row.SourceLabel,
		); err != nil {
			return fmt.Errorf("scan reusable segment row anime=%d: %w", animeID, err)
		}
		mirrorRows = append(mirrorRows, row)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate reusable segment rows anime=%d: %w", animeID, err)
	}
	rows.Close()

	for _, row := range mirrorRows {
		if row.FansubGroupID == nil || *row.FansubGroupID <= 0 {
			continue
		}

		definitionID, err := findOrCreateSegmentLibraryDefinitionForDelete(ctx, tx, *source, row)
		if err != nil {
			return err
		}

		var assetID *int64
		if strings.TrimSpace(derefString(row.SourceRef)) != "" {
			assetID, err = findOrCreateSegmentLibraryAssetForDelete(ctx, tx, definitionID, row)
			if err != nil {
				return err
			}
		}

		if err := findOrCreateSegmentLibraryAssignmentForDelete(ctx, tx, definitionID, assetID, row); err != nil {
			return err
		}
	}

	return nil
}

func detachSegmentLibraryAssignmentsForAnimeDelete(ctx context.Context, tx pgx.Tx, animeID int64) error {
	hasAssignments, err := hasTableTx(ctx, tx, "segment_library_assignments")
	if err != nil {
		return fmt.Errorf("detect segment library assignments table: %w", err)
	}
	if !hasAssignments {
		return nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE segment_library_assignments
		SET anime_id = NULL,
		    theme_segment_id = NULL,
		    detached_at = COALESCE(detached_at, NOW())
		WHERE anime_id = $1
	`, animeID); err != nil {
		return fmt.Errorf("detach segment library assignments anime=%d: %w", animeID, err)
	}
	return nil
}

func loadStableSegmentAnimeSourceForDelete(ctx context.Context, tx pgx.Tx, animeID int64) (*segmentStableAnimeSource, error) {
	rows, err := tx.Query(ctx, `
		SELECT source
		FROM anime_source_links
		WHERE anime_id = $1
		ORDER BY CASE WHEN source LIKE 'anisearch:%' THEN 0 ELSE 1 END, source ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime source links for delete anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("scan anime source link for delete anime=%d: %w", animeID, err)
		}
		if source := parseStableSegmentAnimeSource(raw); source != nil {
			return source, nil
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime source links for delete anime=%d: %w", animeID, err)
	}

	return nil, nil
}

func parseStableSegmentAnimeSource(raw string) *segmentStableAnimeSource {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	parts := strings.SplitN(trimmed, ":", 2)
	if len(parts) != 2 {
		return nil
	}
	provider := strings.ToLower(strings.TrimSpace(parts[0]))
	externalID := strings.TrimSpace(parts[1])
	if provider != "anisearch" || externalID == "" {
		return nil
	}
	return &segmentStableAnimeSource{Provider: provider, ExternalID: externalID}
}

func findOrCreateSegmentLibraryDefinitionForDelete(
	ctx context.Context,
	tx pgx.Tx,
	source segmentStableAnimeSource,
	row segmentDeleteMirrorRow,
) (int64, error) {
	segmentKind := normalizeSegmentLibraryKind(row.ThemeTypeName)
	normalizedName := normalizeSegmentLibraryName(derefString(row.ThemeTitle))

	var id int64
	if err := tx.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO segment_library_definitions (
				anime_source_provider,
				anime_source_external_id,
				fansub_group_id,
				segment_kind,
				segment_name,
				normalized_segment_name,
				identity_status,
				ownership_scope,
				created_at,
				updated_at
			)
			VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, 'verified', 'reusable', NOW(), NOW())
			ON CONFLICT (anime_source_provider, anime_source_external_id, fansub_group_id, segment_kind, normalized_segment_name)
			DO UPDATE SET updated_at = NOW()
			RETURNING id
		)
		SELECT id FROM inserted
		UNION ALL
		SELECT id
		FROM segment_library_definitions
		WHERE anime_source_provider = $1
		  AND anime_source_external_id = $2
		  AND fansub_group_id = $3
		  AND segment_kind = $4
		  AND normalized_segment_name = $6
		LIMIT 1
	`,
		source.Provider,
		source.ExternalID,
		*row.FansubGroupID,
		segmentKind,
		strings.TrimSpace(derefString(row.ThemeTitle)),
		normalizedName,
	).Scan(&id); err != nil {
		return 0, fmt.Errorf("find or create segment library definition anime=%d segment=%d: %w", row.AnimeID, row.ThemeSegmentID, err)
	}
	return id, nil
}

func findOrCreateSegmentLibraryAssetForDelete(
	ctx context.Context,
	tx pgx.Tx,
	definitionID int64,
	row segmentDeleteMirrorRow,
) (*int64, error) {
	sourceRef := strings.TrimSpace(derefString(row.SourceRef))
	if sourceRef == "" {
		return nil, nil
	}
	sourceLabel := strings.TrimSpace(derefString(row.SourceLabel))

	var mediaAssetID *int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM media_assets
		WHERE file_path = $1
		   OR file_path = $2
		ORDER BY id DESC
		LIMIT 1
	`, sourceRef, "/app/media/"+sourceRef).Scan(&mediaAssetID); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("resolve segment library media asset ref=%q: %w", sourceRef, err)
	}

	var assetID int64
	if err := tx.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO segment_library_assets (
				definition_id,
				media_asset_id,
				source_ref,
				source_label,
				attach_source,
				is_primary,
				created_at
			)
			VALUES ($1, $2, $3, NULLIF($4, ''), 'migrated', TRUE, NOW())
			ON CONFLICT (definition_id, source_ref)
			DO UPDATE SET
				media_asset_id = COALESCE(segment_library_assets.media_asset_id, EXCLUDED.media_asset_id),
				source_label = COALESCE(segment_library_assets.source_label, EXCLUDED.source_label),
				is_primary = TRUE
			RETURNING id
		)
		SELECT id FROM inserted
		UNION ALL
		SELECT id
		FROM segment_library_assets
		WHERE definition_id = $1
		  AND source_ref = $3
		LIMIT 1
	`, definitionID, mediaAssetID, sourceRef, sourceLabel).Scan(&assetID); err != nil {
		return nil, fmt.Errorf("find or create segment library asset definition=%d ref=%q: %w", definitionID, sourceRef, err)
	}

	return &assetID, nil
}

func findOrCreateSegmentLibraryAssignmentForDelete(
	ctx context.Context,
	tx pgx.Tx,
	definitionID int64,
	assetID *int64,
	row segmentDeleteMirrorRow,
) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO segment_library_assignments (
			definition_id,
			asset_id,
			anime_id,
			theme_segment_id,
			release_version,
			attach_source,
			attached_at,
			detached_at
		)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), 'local_segment', NOW(), NULL)
		ON CONFLICT (theme_segment_id) WHERE theme_segment_id IS NOT NULL
		DO UPDATE SET
			definition_id = EXCLUDED.definition_id,
			asset_id = COALESCE(EXCLUDED.asset_id, segment_library_assignments.asset_id),
			anime_id = EXCLUDED.anime_id,
			release_version = EXCLUDED.release_version,
			detached_at = NULL
	`, definitionID, assetID, row.AnimeID, row.ThemeSegmentID, strings.TrimSpace(row.Version)); err != nil {
		return fmt.Errorf("find or create segment library assignment anime=%d segment=%d: %w", row.AnimeID, row.ThemeSegmentID, err)
	}
	return nil
}

func normalizeSegmentLibraryKind(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "opening", "op":
		return "op"
	case "ending", "ed":
		return "ed"
	case "insert", "insert_song", "insert-song", "insert song":
		return "insert"
	case "outro":
		return "outro"
	default:
		trimmed := strings.ToLower(strings.TrimSpace(raw))
		if trimmed == "" {
			return "unknown"
		}
		return trimmed
	}
}

func normalizeSegmentLibraryName(raw string) string {
	trimmed := strings.ToLower(strings.TrimSpace(raw))
	if trimmed == "" {
		return ""
	}
	return strings.Join(strings.Fields(trimmed), " ")
}

func hasTableTx(ctx context.Context, tx pgx.Tx, tableName string) (bool, error) {
	var exists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = $1
		)
	`, tableName).Scan(&exists); err != nil {
		return false, fmt.Errorf("detect table %s: %w", tableName, err)
	}
	return exists, nil
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
