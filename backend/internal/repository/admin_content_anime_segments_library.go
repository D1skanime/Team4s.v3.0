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

func (r *AdminContentRepository) ListSegmentLibraryCandidates(
	ctx context.Context,
	animeID int64,
	fansubGroupID int64,
	segmentKind string,
	segmentName string,
) ([]models.SegmentLibraryCandidate, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}
	if fansubGroupID <= 0 {
		return []models.SegmentLibraryCandidate{}, nil
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	ok, err := r.segmentLibraryTablesAvailable(ctx)
	if err != nil {
		return nil, err
	}
	if !ok {
		return []models.SegmentLibraryCandidate{}, nil
	}

	source, err := r.loadStableSegmentAnimeSource(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return []models.SegmentLibraryCandidate{}, nil
	}

	normalizedKind := normalizeSegmentLibraryKind(segmentKind)
	normalizedName := normalizeSegmentLibraryName(segmentName)
	rows, err := r.db.Query(ctx, `
		SELECT
			sld.id,
			sla.id,
			sla.media_asset_id,
			sld.anime_source_provider,
			sld.anime_source_external_id,
			sld.fansub_group_id,
			sld.segment_kind,
			sld.segment_name,
			sld.identity_status,
			sld.ownership_scope,
			sla.source_ref,
			sla.source_label,
			sla.attach_source,
			(
				SELECT sla2.attach_source
				FROM segment_library_assignments sla2
				WHERE sla2.asset_id = sla.id
				  AND sla2.detached_at IS NULL
				ORDER BY sla2.attached_at DESC, sla2.id DESC
				LIMIT 1
			) AS current_attach_source,
			(
				SELECT COUNT(*)::INTEGER
				FROM segment_library_assignments sla2
				WHERE sla2.asset_id = sla.id
				  AND sla2.detached_at IS NULL
			) AS active_assignment_count,
			(
				SELECT MAX(sla2.attached_at)
				FROM segment_library_assignments sla2
				WHERE sla2.asset_id = sla.id
			) AS last_attached_at
		FROM segment_library_definitions sld
		JOIN segment_library_assets sla ON sla.definition_id = sld.id
		WHERE sld.anime_source_provider = $1
		  AND sld.anime_source_external_id = $2
		  AND sld.fansub_group_id = $3
		  AND sld.ownership_scope = 'reusable'
		  AND sld.segment_kind = $4
		  AND ($5 = '' OR sld.normalized_segment_name = $5)
		ORDER BY
			sla.is_primary DESC,
			last_attached_at DESC NULLS LAST,
			sla.id DESC
	`, source.Provider, source.ExternalID, fansubGroupID, normalizedKind, normalizedName)
	if err != nil {
		return nil, fmt.Errorf("list segment library candidates anime=%d group=%d: %w", animeID, fansubGroupID, err)
	}
	defer rows.Close()

	items := make([]models.SegmentLibraryCandidate, 0)
	for rows.Next() {
		var item models.SegmentLibraryCandidate
		if err := rows.Scan(
			&item.DefinitionID,
			&item.AssetID,
			&item.MediaAssetID,
			&item.AnimeSourceProvider,
			&item.AnimeSourceExternalID,
			&item.FansubGroupID,
			&item.SegmentKind,
			&item.SegmentName,
			&item.IdentityStatus,
			&item.OwnershipScope,
			&item.SourceRef,
			&item.SourceLabel,
			&item.AssetAttachSource,
			&item.CurrentAttachSource,
			&item.ActiveAssignmentCount,
			&item.LastAttachedAt,
		); err != nil {
			return nil, fmt.Errorf("scan segment library candidate anime=%d group=%d: %w", animeID, fansubGroupID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate segment library candidates anime=%d group=%d: %w", animeID, fansubGroupID, err)
	}

	return items, nil
}

func (r *AdminContentRepository) AttachSegmentLibraryAsset(
	ctx context.Context,
	animeID int64,
	segmentID int64,
	input models.SegmentLibraryAttachInput,
) (*models.AdminThemeSegment, error) {
	if animeID <= 0 || segmentID <= 0 || input.AssetID <= 0 {
		return nil, ErrNotFound
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin attach segment library asset tx anime=%d segment=%d: %w", animeID, segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	ok, err := hasTableTx(ctx, tx, "segment_library_assignments")
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}

	segment, err := r.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
	if err != nil {
		return nil, err
	}

	source, err := r.loadStableSegmentAnimeSourceTx(ctx, tx, animeID)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return nil, ErrConflict
	}

	var (
		definitionID          int64
		assetDefinitionID     int64
		sourceRef             string
		sourceLabel           *string
		fansubGroupID         int64
		animeSourceProvider   string
		animeSourceExternalID string
		reusableOwnership     string
	)
	if err := tx.QueryRow(ctx, `
		SELECT
			sla.id,
			sla.definition_id,
			sla.source_ref,
			sla.source_label,
			sld.fansub_group_id,
			sld.anime_source_provider,
			sld.anime_source_external_id,
			sld.ownership_scope
		FROM segment_library_assets sla
		JOIN segment_library_definitions sld ON sld.id = sla.definition_id
		WHERE sla.id = $1
	`, input.AssetID).Scan(
		&input.AssetID,
		&assetDefinitionID,
		&sourceRef,
		&sourceLabel,
		&fansubGroupID,
		&animeSourceProvider,
		&animeSourceExternalID,
		&reusableOwnership,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load segment library asset %d: %w", input.AssetID, err)
	}
	definitionID = assetDefinitionID

	if animeSourceProvider != source.Provider || animeSourceExternalID != source.ExternalID {
		return nil, ErrConflict
	}
	if reusableOwnership != string(models.SegmentLibraryOwnershipScopeReusable) {
		return nil, ErrConflict
	}
	if segment.FansubGroupID != nil && *segment.FansubGroupID > 0 && fansubGroupID != *segment.FansubGroupID {
		return nil, ErrConflict
	}

	sourceType := themeSegmentSourceTypeReleaseAsset
	encodedSource := encodeThemeSegmentSource(&sourceType, &sourceRef, sourceLabel, nil)
	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments
		SET source_jellyfin_item_id = $1,
		    source_type = $2,
		    source_ref = $3,
		    source_label = $4
		WHERE id = $5
	`, encodedSource, sourceType, sourceRef, sourceLabel, segmentID); err != nil {
		return nil, fmt.Errorf("attach segment library asset segment=%d asset=%d: %w", segmentID, input.AssetID, err)
	}
	if err := r.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE segment_library_assignments
		SET detached_at = NOW()
		WHERE theme_segment_id = $1
		  AND asset_id IS DISTINCT FROM $2
		  AND detached_at IS NULL
	`, segmentID, input.AssetID); err != nil {
		return nil, fmt.Errorf("detach previous segment library assignments segment=%d: %w", segmentID, err)
	}

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
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), 'reuse_attach', NOW(), NULL)
		ON CONFLICT (theme_segment_id) WHERE theme_segment_id IS NOT NULL
		DO UPDATE SET
			definition_id = EXCLUDED.definition_id,
			asset_id = EXCLUDED.asset_id,
			anime_id = EXCLUDED.anime_id,
			release_version = EXCLUDED.release_version,
			attach_source = EXCLUDED.attach_source,
			attached_at = EXCLUDED.attached_at,
			detached_at = NULL
	`, definitionID, input.AssetID, animeID, segmentID, strings.TrimSpace(segment.Version)); err != nil {
		return nil, fmt.Errorf("upsert segment library assignment segment=%d asset=%d: %w", segmentID, input.AssetID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit attach segment library asset segment=%d asset=%d: %w", segmentID, input.AssetID, err)
	}

	return loadSegmentByID(ctx, r, segmentID, 0)
}

func (r *AdminContentRepository) IsReusableSegmentAsset(ctx context.Context, sourceRef string) (bool, error) {
	trimmed := strings.TrimSpace(filepath.ToSlash(sourceRef))
	if trimmed == "" {
		return false, nil
	}

	ok, err := r.segmentLibraryTablesAvailable(ctx)
	if err != nil || !ok {
		return false, err
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM segment_library_assets sla
			JOIN segment_library_definitions sld ON sld.id = sla.definition_id
			WHERE sla.source_ref = $1
			  AND sld.ownership_scope = 'reusable'
		)
	`, trimmed).Scan(&exists); err != nil {
		return false, fmt.Errorf("check reusable segment asset ref=%q: %w", trimmed, err)
	}
	return exists, nil
}

func (r *AdminContentRepository) hydrateSegmentLibraryMetadataList(ctx context.Context, segments []models.AdminThemeSegment) error {
	for i := range segments {
		if err := r.hydrateSegmentLibraryMetadata(ctx, &segments[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *AdminContentRepository) hydrateSegmentLibraryMetadata(ctx context.Context, seg *models.AdminThemeSegment) error {
	if seg == nil || seg.ID <= 0 {
		return nil
	}

	ok, err := r.segmentLibraryTablesAvailable(ctx)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	if err := r.db.QueryRow(ctx, `
		SELECT
			sld.id,
			sla.id,
			sld.segment_kind,
			sld.segment_name,
			sld.anime_source_provider,
			sld.anime_source_external_id,
			sld.identity_status,
			sld.ownership_scope,
			sla2.attach_source
		FROM segment_library_assignments sla2
		JOIN segment_library_definitions sld ON sld.id = sla2.definition_id
		LEFT JOIN segment_library_assets sla ON sla.id = sla2.asset_id
		WHERE sla2.theme_segment_id = $1
		  AND sla2.detached_at IS NULL
		ORDER BY sla2.attached_at DESC, sla2.id DESC
		LIMIT 1
	`, seg.ID).Scan(
		&seg.LibraryDefinitionID,
		&seg.LibraryAssetID,
		&seg.LibrarySegmentKind,
		&seg.LibrarySegmentName,
		&seg.LibraryAnimeProvider,
		&seg.LibraryAnimeExternal,
		&seg.LibraryIdentity,
		&seg.LibraryOwnership,
		&seg.LibraryAttachSource,
	); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("hydrate segment library metadata segment=%d: %w", seg.ID, err)
	}

	return nil
}

func (r *AdminContentRepository) segmentLibraryTablesAvailable(ctx context.Context) (bool, error) {
	hasDefinitions, err := r.hasTable(ctx, "segment_library_definitions")
	if err != nil || !hasDefinitions {
		return hasDefinitions, err
	}
	hasAssets, err := r.hasTable(ctx, "segment_library_assets")
	if err != nil || !hasAssets {
		return hasAssets, err
	}
	return r.hasTable(ctx, "segment_library_assignments")
}

func (r *AdminContentRepository) BindUploadedSegmentAsset(
	ctx context.Context,
	animeID int64,
	segmentID int64,
	mediaAssetID int64,
	sourceRef string,
	sourceLabel *string,
) (*models.AdminThemeSegment, error) {
	if animeID <= 0 || segmentID <= 0 || mediaAssetID <= 0 {
		return nil, ErrNotFound
	}

	segment, err := r.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
	if err != nil {
		return nil, err
	}

	trimmedRef := strings.TrimSpace(filepath.ToSlash(sourceRef))
	if trimmedRef == "" {
		return nil, ErrConflict
	}
	trimmedLabel := strings.TrimSpace(derefString(sourceLabel))

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin bind uploaded segment asset tx anime=%d segment=%d: %w", animeID, segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	sourceType := themeSegmentSourceTypeReleaseAsset
	encodedSource := encodeThemeSegmentSource(&sourceType, &trimmedRef, sourceLabel, nil)
	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments
		SET source_jellyfin_item_id = $1,
		    source_type = $2,
		    source_ref = $3,
		    source_label = NULLIF($4, '')
		WHERE id = $5
	`, encodedSource, sourceType, trimmedRef, trimmedLabel, segmentID); err != nil {
		return nil, fmt.Errorf("update uploaded segment asset source anime=%d segment=%d: %w", animeID, segmentID, err)
	}
	if err := r.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID); err != nil {
		return nil, err
	}

	hasAssignments, err := hasTableTx(ctx, tx, "segment_library_assignments")
	if err != nil {
		return nil, fmt.Errorf("detect segment library assignments table: %w", err)
	}
	if hasAssignments {
		stableSource, err := r.loadStableSegmentAnimeSourceTx(ctx, tx, animeID)
		if err != nil {
			return nil, err
		}
		if stableSource != nil && segment.FansubGroupID != nil && *segment.FansubGroupID > 0 {
			row := segmentDeleteMirrorRow{
				ThemeSegmentID: segment.ID,
				AnimeID:        segment.AnimeID,
				FansubGroupID:  segment.FansubGroupID,
				Version:        segment.Version,
				ThemeTitle:     segment.ThemeTitle,
				ThemeTypeName:  segment.ThemeTypeName,
				SourceRef:      &trimmedRef,
				SourceLabel:    sourceLabel,
			}

			definitionID, err := findOrCreateSegmentLibraryDefinitionForDelete(ctx, tx, *stableSource, row)
			if err != nil {
				return nil, err
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
					VALUES ($1, $2, $3, NULLIF($4, ''), 'upload', TRUE, NOW())
					ON CONFLICT (definition_id, source_ref)
					DO UPDATE SET
						media_asset_id = EXCLUDED.media_asset_id,
						source_label = COALESCE(EXCLUDED.source_label, segment_library_assets.source_label),
						attach_source = 'upload',
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
			`, definitionID, mediaAssetID, trimmedRef, trimmedLabel).Scan(&assetID); err != nil {
				return nil, fmt.Errorf("upsert uploaded segment library asset definition=%d ref=%q: %w", definitionID, trimmedRef, err)
			}

			if _, err := tx.Exec(ctx, `
				UPDATE segment_library_assignments
				SET detached_at = NOW()
				WHERE theme_segment_id = $1
				  AND asset_id IS DISTINCT FROM $2
				  AND detached_at IS NULL
			`, segmentID, assetID); err != nil {
				return nil, fmt.Errorf("detach previous uploaded segment library assignments segment=%d: %w", segmentID, err)
			}

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
					asset_id = EXCLUDED.asset_id,
					anime_id = EXCLUDED.anime_id,
					release_version = EXCLUDED.release_version,
					attach_source = EXCLUDED.attach_source,
					attached_at = EXCLUDED.attached_at,
					detached_at = NULL
			`, definitionID, assetID, animeID, segmentID, strings.TrimSpace(segment.Version)); err != nil {
				return nil, fmt.Errorf("upsert uploaded segment library assignment segment=%d asset=%d: %w", segmentID, assetID, err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit uploaded segment asset anime=%d segment=%d: %w", animeID, segmentID, err)
	}

	return loadSegmentByID(ctx, r, segmentID, 0)
}

// ClearSegmentAsset setzt source_type, source_ref und source_label auf NULL und
// gibt den vorherigen source_ref-Wert zurueck (relativer Pfad des Assets).
func (r *AdminContentRepository) ClearSegmentAsset(ctx context.Context, animeID int64, segmentID int64) (*string, error) {
	if animeID <= 0 || segmentID <= 0 {
		return nil, ErrNotFound
	}

	// Sicherstellen, dass das Segment zum Anime gehoert, und alten source_ref lesen
	seg, err := r.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
	if err != nil {
		return nil, err
	}
	previousRef := seg.SourceRef

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin clear segment asset id=%d: %w", segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	tag, err := tx.Exec(ctx, `
		UPDATE theme_segments
		SET source_type = NULL, source_ref = NULL, source_label = NULL
		WHERE id = $1
	`, segmentID)
	if err != nil {
		return nil, fmt.Errorf("clear segment asset id=%d: %w", segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if err := r.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit clear segment asset id=%d: %w", segmentID, err)
	}

	return previousRef, nil
}
