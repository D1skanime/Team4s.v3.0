package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnimeAssetRepository struct {
	db *pgxpool.Pool
}

type animeAssetLinkSpec struct {
	Slot      string
	MediaType string
	Singular  bool
}

var animeAssetLinkSpecs = map[string]animeAssetLinkSpec{
	"cover":            {Slot: "cover", MediaType: "poster", Singular: true},
	"banner":           {Slot: "banner", MediaType: "banner", Singular: true},
	"logo":             {Slot: "logo", MediaType: "logo", Singular: true},
	"background":       {Slot: "background", MediaType: "background", Singular: false},
	"background_video": {Slot: "background_video", MediaType: "video", Singular: true},
}

func NewAnimeAssetRepository(db *pgxpool.Pool) *AnimeAssetRepository {
	return &AnimeAssetRepository{db: db}
}

func lookupAnimeAssetLinkSpec(slot string) (animeAssetLinkSpec, bool) {
	spec, ok := animeAssetLinkSpecs[strings.TrimSpace(strings.ToLower(slot))]
	return spec, ok
}

func validateAnimeAssetLinkMediaType(spec animeAssetLinkSpec, mediaType string) error {
	if spec.MediaType == strings.TrimSpace(strings.ToLower(mediaType)) {
		return nil
	}
	return ErrAnimeAssetMediaTypeMismatch
}

func (r *AnimeAssetRepository) GetResolvedAssets(ctx context.Context, animeID int64) (*models.AnimeResolvedAssets, error) {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return nil, err
	}
	if useV2Schema {
		return r.getResolvedAssetsV2(ctx, animeID)
	}

	row := r.db.QueryRow(ctx, `
		SELECT
			a.cover_asset_id,
			a.cover_source,
			a.cover_resolved_url,
			a.cover_provider_key,
			cover_mf.path,
			a.banner_asset_id,
			a.banner_source,
			a.banner_resolved_url,
			a.banner_provider_key,
			banner_mf.path
		FROM anime a
		LEFT JOIN media_files cover_mf
			ON cover_mf.media_id = a.cover_asset_id
			AND (cover_mf.variant = 'original' OR cover_mf.variant IS NULL)
		LEFT JOIN media_files banner_mf
			ON banner_mf.media_id = a.banner_asset_id
			AND (banner_mf.variant = 'original' OR banner_mf.variant IS NULL)
		WHERE a.id = $1
		ORDER BY cover_mf.id ASC NULLS LAST, banner_mf.id ASC NULLS LAST
		LIMIT 1
	`, animeID)

	var coverMediaID *string
	var coverSource *string
	var coverResolvedURL *string
	var coverProviderKey *string
	var coverMediaPath *string
	var bannerMediaID *string
	var bannerSource *string
	var bannerResolvedURL *string
	var bannerProviderKey *string
	var bannerMediaPath *string
	if err := row.Scan(
		&coverMediaID,
		&coverSource,
		&coverResolvedURL,
		&coverProviderKey,
		&coverMediaPath,
		&bannerMediaID,
		&bannerSource,
		&bannerResolvedURL,
		&bannerProviderKey,
		&bannerMediaPath,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load anime assets %d: %w", animeID, err)
	}

	result := &models.AnimeResolvedAssets{
		Backgrounds: make([]models.AnimeBackgroundAsset, 0),
	}
	if cover := resolveAnimeResolvedAsset(coverMediaID, coverSource, coverResolvedURL, coverProviderKey, coverMediaPath); cover != nil {
		result.Cover = cover
	}
	if banner := resolveAnimeBannerAsset(bannerMediaID, bannerSource, bannerResolvedURL, bannerProviderKey, bannerMediaPath); banner != nil {
		result.Banner = banner
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			aba.id,
			aba.media_asset_id,
			aba.source,
			aba.resolved_url,
			aba.provider_key,
			aba.sort_order,
			aba.created_at,
			aba.updated_at,
			mf.path
		FROM anime_background_assets aba
		LEFT JOIN media_files mf
			ON mf.media_id = aba.media_asset_id
			AND (mf.variant = 'original' OR mf.variant IS NULL)
		WHERE aba.anime_id = $1
		ORDER BY aba.sort_order ASC, aba.id ASC, mf.id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime background assets %d: %w", animeID, err)
	}
	defer rows.Close()

	seen := make(map[int64]struct{})
	for rows.Next() {
		var item models.AnimeBackgroundAsset
		var source string
		var resolvedURL *string
		var mediaPath *string
		if err := rows.Scan(
			&item.ID,
			&item.MediaID,
			&source,
			&resolvedURL,
			&item.ProviderKey,
			&item.SortOrder,
			&item.CreatedAt,
			&item.UpdatedAt,
			&mediaPath,
		); err != nil {
			return nil, fmt.Errorf("scan anime background asset %d: %w", animeID, err)
		}
		if _, ok := seen[item.ID]; ok {
			continue
		}
		seen[item.ID] = struct{}{}

		urlValue := resolveAnimeAssetURL(item.MediaID, resolvedURL, mediaPath)
		if urlValue == "" {
			continue
		}
		item.URL = urlValue
		item.Ownership = models.AnimeAssetOwnership(strings.TrimSpace(source))
		result.Backgrounds = append(result.Backgrounds, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime background assets %d: %w", animeID, err)
	}

	return result, nil
}

func (r *AnimeAssetRepository) getResolvedAssetsV2(ctx context.Context, animeID int64) (*models.AnimeResolvedAssets, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`, animeID).Scan(&exists); err != nil {
		return nil, fmt.Errorf("check anime asset subject %d: %w", animeID, err)
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			ma.id,
			mt.name,
			am.sort_order,
			ma.file_path,
			mf.path,
			me.provider,
			me.external_id,
			ma.created_at,
			COALESCE(ma.modified_at, ma.created_at)
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN LATERAL (
			SELECT path
			FROM media_files
			WHERE media_id = ma.id
			ORDER BY
				CASE WHEN variant = 'original' THEN 0 ELSE 1 END,
				id ASC
			LIMIT 1
		) mf ON true
		LEFT JOIN LATERAL (
			SELECT provider, external_id
			FROM media_external
			WHERE media_id = ma.id
			ORDER BY id ASC
			LIMIT 1
		) me ON true
		WHERE am.anime_id = $1
		ORDER BY am.sort_order ASC, ma.id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query v2 anime assets %d: %w", animeID, err)
	}
	defer rows.Close()

	result := &models.AnimeResolvedAssets{
		Backgrounds: make([]models.AnimeBackgroundAsset, 0),
	}

	for rows.Next() {
		var mediaID int64
		var mediaType string
		var sortOrder int32
		var filePath string
		var mediaPath *string
		var provider *string
		var externalID *string
		var createdAt time.Time
		var modifiedAt time.Time
		if err := rows.Scan(
			&mediaID,
			&mediaType,
			&sortOrder,
			&filePath,
			&mediaPath,
			&provider,
			&externalID,
			&createdAt,
			&modifiedAt,
		); err != nil {
			return nil, fmt.Errorf("scan v2 anime asset %d: %w", animeID, err)
		}

		resolvedURL := strings.TrimSpace(derefString(mediaPath))
		if resolvedURL == "" {
			resolvedURL = strings.TrimSpace(filePath)
		}
		if resolvedURL == "" {
			continue
		}

		ownership, providerKey := resolveV2AssetOwnership(provider, externalID)
		mediaIDText := fmt.Sprintf("%d", mediaID)
		asset := &models.AnimeResolvedAsset{
			MediaID:     &mediaIDText,
			URL:         resolvedURL,
			Ownership:   ownership,
			ProviderKey: providerKey,
		}

		switch strings.TrimSpace(strings.ToLower(mediaType)) {
		case "poster":
			if result.Cover == nil {
				result.Cover = asset
			}
		case "banner":
			if result.Banner == nil {
				result.Banner = asset
			}
		case "logo":
			if result.Logo == nil {
				result.Logo = asset
			}
		case "video":
			if result.BackgroundVideo == nil {
				result.BackgroundVideo = asset
			}
			result.BackgroundVideos = append(result.BackgroundVideos, *asset)
		case "background":
			item := models.AnimeBackgroundAsset{
				ID:          mediaID,
				MediaID:     asset.MediaID,
				URL:         asset.URL,
				Ownership:   asset.Ownership,
				ProviderKey: asset.ProviderKey,
				SortOrder:   sortOrder,
			}
			item.CreatedAt = createdAt
			item.UpdatedAt = modifiedAt
			result.Backgrounds = append(result.Backgrounds, item)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate v2 anime assets %d: %w", animeID, err)
	}

	return result, nil
}

func (r *AnimeAssetRepository) AssignManualCover(ctx context.Context, animeID int64, mediaID string) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.assignManualCoverV2(ctx, animeID, mediaID)
	}

	trimmedMediaID := strings.TrimSpace(mediaID)
	if trimmedMediaID == "" {
		return ErrNotFound
	}
	if err := r.ensureAnimeMediaAsset(ctx, animeID, trimmedMediaID); err != nil {
		return err
	}

	var coverPath *string
	if err := r.db.QueryRow(ctx, `
		SELECT path
		FROM media_files
		WHERE media_id = $1 AND (variant = 'original' OR variant IS NULL)
		ORDER BY id ASC
		LIMIT 1
	`, trimmedMediaID).Scan(&coverPath); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("load manual anime cover path %q: %w", trimmedMediaID, err)
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			cover_asset_id = $2,
			cover_source = 'manual',
			cover_resolved_url = NULL,
			cover_provider_key = NULL,
			cover_image = $3,
			updated_at = NOW()
		WHERE id = $1
	`, animeID, trimmedMediaID, normalizeNullableTrimmedString(coverPath))
	if err != nil {
		return fmt.Errorf("assign manual anime cover %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) ClearCover(ctx context.Context, animeID int64) error {
	_, err := r.ClearCoverWithResult(ctx, animeID)
	return err
}

func (r *AnimeAssetRepository) ClearCoverWithResult(
	ctx context.Context,
	animeID int64,
) (*models.AnimeAssetRemovalResult, error) {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return nil, err
	}
	if useV2Schema {
		return r.clearCoverV2(ctx, animeID)
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			cover_asset_id = NULL,
			cover_source = NULL,
			cover_resolved_url = NULL,
			cover_provider_key = NULL,
			cover_image = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("clear anime cover %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return &models.AnimeAssetRemovalResult{}, nil
}

func (r *AnimeAssetRepository) assignManualCoverV2(ctx context.Context, animeID int64, mediaRef string) error {
	trimmedMediaRef := strings.TrimSpace(mediaRef)
	if trimmedMediaRef == "" {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin assign anime cover v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return err
	}
	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, trimmedMediaRef, "poster")
	if err != nil {
		return err
	}
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, "poster"); err != nil {
		return err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
		return err
	}
	if err := syncLegacyAnimeCoverImageV2(ctx, tx, animeID, mediaID, schema); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit assign anime cover v2 tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) clearCoverV2(
	ctx context.Context,
	animeID int64,
) (*models.AnimeAssetRemovalResult, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin clear anime cover v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return nil, err
	}
	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return nil, err
	}
	result, err := removeAnimePosterAssetsV2(ctx, tx, animeID, schema)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit clear anime cover v2 tx: %w", err)
	}
	return result, nil
}

func removeAnimePosterAssetsV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	schema animeV2SchemaInfo,
) (*models.AnimeAssetRemovalResult, error) {
	rows, err := tx.Query(ctx, `
		SELECT
			ma.id,
			COALESCE(mf.path, ma.file_path) AS resolved_path
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN LATERAL (
			SELECT path
			FROM media_files
			WHERE media_id = ma.id
			ORDER BY
				CASE WHEN variant = 'original' THEN 0 ELSE 1 END,
				id ASC
			LIMIT 1
		) mf ON true
		WHERE am.anime_id = $1
		  AND mt.name = 'poster'
		ORDER BY am.sort_order ASC, ma.id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime poster assets %d: %w", animeID, err)
	}
	defer rows.Close()

	type posterAsset struct {
		mediaID int64
		path    string
	}
	assets := make([]posterAsset, 0)
	for rows.Next() {
		var item posterAsset
		if err := rows.Scan(&item.mediaID, &item.path); err != nil {
			return nil, fmt.Errorf("scan anime poster asset %d: %w", animeID, err)
		}
		assets = append(assets, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime poster assets %d: %w", animeID, err)
	}

	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, "poster"); err != nil {
		return nil, err
	}
	if schema.HasCoverImage {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET cover_image = NULL, updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return nil, fmt.Errorf("clear legacy anime cover image %d: %w", animeID, err)
		}
	}

	result := &models.AnimeAssetRemovalResult{RemovedPaths: make([]string, 0, len(assets))}
	for _, asset := range assets {
		var stillReferenced bool
		if err := tx.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1
				FROM anime_media
				WHERE media_id = $1
				UNION ALL
				SELECT 1 FROM episode_media WHERE media_id = $1
				UNION ALL
				SELECT 1 FROM fansub_group_media WHERE media_id = $1
				UNION ALL
				SELECT 1 FROM release_media WHERE media_id = $1
			)
		`, asset.mediaID).Scan(&stillReferenced); err != nil {
			return nil, fmt.Errorf("check poster media references anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}
		if stillReferenced {
			continue
		}

		if _, err := tx.Exec(ctx, `DELETE FROM media_external WHERE media_id = $1`, asset.mediaID); err != nil {
			return nil, fmt.Errorf("delete poster media external anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_files WHERE media_id = $1`, asset.mediaID); err != nil {
			return nil, fmt.Errorf("delete poster media files anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, asset.mediaID); err != nil {
			return nil, fmt.Errorf("delete poster media asset anime=%d media=%d: %w", animeID, asset.mediaID, err)
		}

		if strings.TrimSpace(asset.path) != "" {
			result.RemovedPaths = append(result.RemovedPaths, strings.TrimSpace(asset.path))
		}
	}

	return result, nil
}

func syncLegacyAnimeCoverImageV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	mediaID int64,
	schema animeV2SchemaInfo,
) error {
	if !schema.HasCoverImage {
		return nil
	}

	var coverPath string
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(mf.path, ma.file_path)
		FROM media_assets ma
		LEFT JOIN LATERAL (
			SELECT path
			FROM media_files
			WHERE media_id = ma.id
			ORDER BY
				CASE WHEN variant = 'original' THEN 0 ELSE 1 END,
				id ASC
			LIMIT 1
		) mf ON true
		WHERE ma.id = $1
	`, mediaID).Scan(&coverPath); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("load legacy anime cover image path %d: %w", mediaID, err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE anime
		SET cover_image = $2, updated_at = NOW()
		WHERE id = $1
	`, animeID, strings.TrimSpace(coverPath)); err != nil {
		return fmt.Errorf("sync legacy anime cover image %d: %w", animeID, err)
	}

	return nil
}

func (r *AnimeAssetRepository) AssignManualBanner(ctx context.Context, animeID int64, mediaID string) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.assignManualBannerV2(ctx, animeID, mediaID)
	}

	trimmedMediaID := strings.TrimSpace(mediaID)
	if trimmedMediaID == "" {
		return ErrNotFound
	}
	if err := r.ensureAnimeMediaAsset(ctx, animeID, trimmedMediaID); err != nil {
		return err
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			banner_asset_id = $2,
			banner_source = 'manual',
			banner_resolved_url = NULL,
			banner_provider_key = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, animeID, trimmedMediaID)
	if err != nil {
		return fmt.Errorf("assign manual anime banner %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) ClearBanner(ctx context.Context, animeID int64) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.clearBannerV2(ctx, animeID)
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			banner_asset_id = NULL,
			banner_source = NULL,
			banner_resolved_url = NULL,
			banner_provider_key = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, animeID)
	if err != nil {
		return fmt.Errorf("clear anime banner %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) AddManualBackground(ctx context.Context, animeID int64, mediaID string, providerKey *string) (*models.AnimeBackgroundAsset, error) {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return nil, err
	}
	if useV2Schema {
		return r.addManualBackgroundV2(ctx, animeID, mediaID, providerKey)
	}

	trimmedMediaID := strings.TrimSpace(mediaID)
	if trimmedMediaID == "" {
		return nil, ErrNotFound
	}
	if err := r.ensureAnimeMediaAsset(ctx, animeID, trimmedMediaID); err != nil {
		return nil, err
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin add anime background tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return nil, err
	}

	var nextSort int32
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(sort_order), -1) + 1
		FROM anime_background_assets
		WHERE anime_id = $1
	`, animeID).Scan(&nextSort); err != nil {
		return nil, fmt.Errorf("load next anime background sort for %d: %w", animeID, err)
	}

	source := "manual"
	trimmedProviderKey := trimOptionalStringPtr(providerKey)
	if trimmedProviderKey != nil {
		source = "provider"
	}

	var item models.AnimeBackgroundAsset
	var storedSource string
	if err := tx.QueryRow(ctx, `
		INSERT INTO anime_background_assets (
			anime_id,
			media_asset_id,
			source,
			resolved_url,
			provider_key,
			sort_order
		)
		VALUES ($1, $2, $3, NULL, $4, $5)
		RETURNING id, media_asset_id, source, sort_order, created_at, updated_at
	`, animeID, trimmedMediaID, source, trimmedProviderKey, nextSort).Scan(
		&item.ID,
		&item.MediaID,
		&storedSource,
		&item.SortOrder,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("insert anime background asset %d: %w", animeID, err)
	}

	var mediaPath *string
	if err := tx.QueryRow(ctx, `
		SELECT path
		FROM media_files
		WHERE media_id = $1 AND (variant = 'original' OR variant IS NULL)
		ORDER BY id ASC
		LIMIT 1
	`, trimmedMediaID).Scan(&mediaPath); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("load anime background media path %q: %w", trimmedMediaID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit add anime background tx: %w", err)
	}

	item.URL = resolveAnimeAssetURL(item.MediaID, nil, mediaPath)
	item.Ownership = models.AnimeAssetOwnership(storedSource)
	return &item, nil
}

func (r *AnimeAssetRepository) AssignManualLogo(ctx context.Context, animeID int64, mediaID string) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if !useV2Schema {
		hasAnimeMedia, err := r.hasAnimeMediaTable(ctx)
		if err != nil {
			return err
		}
		if !hasAnimeMedia {
			return ErrNotFound
		}
	}
	return r.assignManualSingularAssetV2(ctx, animeID, mediaID, "logo")
}

func (r *AnimeAssetRepository) ClearLogo(ctx context.Context, animeID int64) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if !useV2Schema {
		hasAnimeMedia, err := r.hasAnimeMediaTable(ctx)
		if err != nil {
			return err
		}
		if !hasAnimeMedia {
			return ErrNotFound
		}
	}
	return r.clearSingularAssetV2(ctx, animeID, "logo")
}

func (r *AnimeAssetRepository) AssignManualBackgroundVideo(ctx context.Context, animeID int64, mediaID string) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if !useV2Schema {
		hasAnimeMedia, err := r.hasAnimeMediaTable(ctx)
		if err != nil {
			return err
		}
		if !hasAnimeMedia {
			return ErrNotFound
		}
	}
	return r.assignManualSingularAssetV2(ctx, animeID, mediaID, "background_video")
}

func (r *AnimeAssetRepository) AddManualBackgroundVideo(ctx context.Context, animeID int64, mediaID string) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if !useV2Schema {
		return r.AssignManualBackgroundVideo(ctx, animeID, mediaID)
	}
	return r.addManualPluralAssetV2(ctx, animeID, mediaID, "background_video")
}

func (r *AnimeAssetRepository) ClearBackgroundVideo(ctx context.Context, animeID int64) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if !useV2Schema {
		hasAnimeMedia, err := r.hasAnimeMediaTable(ctx)
		if err != nil {
			return err
		}
		if !hasAnimeMedia {
			return ErrNotFound
		}
	}
	return r.clearSingularAssetV2(ctx, animeID, "background_video")
}

func (r *AnimeAssetRepository) RemoveBackground(ctx context.Context, animeID int64, backgroundID int64) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.removeBackgroundV2(ctx, animeID, backgroundID)
	}

	tag, err := r.db.Exec(ctx, `
		DELETE FROM anime_background_assets
		WHERE anime_id = $1 AND id = $2
	`, animeID, backgroundID)
	if err != nil {
		return fmt.Errorf("remove anime background %d/%d: %w", animeID, backgroundID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) ApplyProviderBanner(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.applyProviderBannerV2(ctx, animeID, input)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime banner provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentSource *string
	if err := tx.QueryRow(ctx, `
		SELECT banner_source
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&currentSource); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime banner row %d: %w", animeID, err)
	}

	if strings.TrimSpace(derefString(currentSource)) == string(models.AnimeAssetOwnershipManual) {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				banner_asset_id = NULL,
				banner_source = NULL,
				banner_resolved_url = NULL,
				banner_provider_key = NULL,
				updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return fmt.Errorf("clear provider anime banner %d: %w", animeID, err)
		}
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				banner_asset_id = NULL,
				banner_source = 'provider',
				banner_resolved_url = $2,
				banner_provider_key = $3,
				updated_at = NOW()
			WHERE id = $1
		`, animeID, strings.TrimSpace(input.URL), strings.TrimSpace(input.ProviderKey)); err != nil {
			return fmt.Errorf("apply provider anime banner %d: %w", animeID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime banner provider tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) ApplyProviderCover(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime cover provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentSource *string
	if err := tx.QueryRow(ctx, `
		SELECT cover_source
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&currentSource); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime cover row %d: %w", animeID, err)
	}

	if strings.TrimSpace(derefString(currentSource)) == string(models.AnimeAssetOwnershipManual) {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				cover_asset_id = NULL,
				cover_source = NULL,
				cover_resolved_url = NULL,
				cover_provider_key = NULL,
				cover_image = NULL,
				updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return fmt.Errorf("clear provider anime cover %d: %w", animeID, err)
		}
	} else {
		trimmedURL := strings.TrimSpace(input.URL)
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				cover_asset_id = NULL,
				cover_source = 'provider',
				cover_resolved_url = $2,
				cover_provider_key = $3,
				cover_image = $2,
				updated_at = NOW()
			WHERE id = $1
		`, animeID, trimmedURL, strings.TrimSpace(input.ProviderKey)); err != nil {
			return fmt.Errorf("apply provider anime cover %d: %w", animeID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime cover provider tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) ApplyProviderBackgrounds(
	ctx context.Context,
	animeID int64,
	incoming []models.AnimeProviderAssetInput,
) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.applyProviderBackgroundsV2(ctx, animeID, incoming)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime backgrounds provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, source, provider_key, sort_order
		FROM anime_background_assets
		WHERE anime_id = $1
		FOR UPDATE
	`, animeID)
	if err != nil {
		return fmt.Errorf("query anime background rows for update %d: %w", animeID, err)
	}
	defer rows.Close()

	existing := make([]storedAnimeBackgroundAsset, 0)
	for rows.Next() {
		var item storedAnimeBackgroundAsset
		if err := rows.Scan(&item.ID, &item.Source, &item.ProviderKey, &item.SortOrder); err != nil {
			return fmt.Errorf("scan anime background row %d: %w", animeID, err)
		}
		existing = append(existing, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate anime background rows %d: %w", animeID, err)
	}

	plan := reconcileAnimeProviderBackgrounds(existing, incoming)
	for _, update := range plan.Updates {
		if _, err := tx.Exec(ctx, `
			UPDATE anime_background_assets
			SET resolved_url = $2, updated_at = NOW()
			WHERE id = $1
		`, update.ID, update.URL); err != nil {
			return fmt.Errorf("update anime provider background %d: %w", update.ID, err)
		}
	}

	for _, insert := range plan.Inserts {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_background_assets (
				anime_id,
				media_asset_id,
				source,
				resolved_url,
				provider_key,
				sort_order
			)
			VALUES ($1, NULL, 'provider', $2, $3, $4)
		`, animeID, insert.URL, insert.ProviderKey, insert.SortOrder); err != nil {
			return fmt.Errorf("insert anime provider background %d: %w", animeID, err)
		}
	}

	for _, deleteID := range plan.DeleteIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM anime_background_assets
			WHERE id = $1
		`, deleteID); err != nil {
			return fmt.Errorf("delete anime provider background %d: %w", deleteID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime backgrounds provider tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) assignManualBannerV2(ctx context.Context, animeID int64, mediaRef string) error {
	return r.assignManualSingularAssetV2(ctx, animeID, mediaRef, "banner")
}

func (r *AnimeAssetRepository) clearBannerV2(ctx context.Context, animeID int64) error {
	return r.clearSingularAssetV2(ctx, animeID, "banner")
}

func (r *AnimeAssetRepository) addManualBackgroundV2(ctx context.Context, animeID int64, mediaRef string, providerKey *string) (*models.AnimeBackgroundAsset, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin add anime background v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return nil, err
	}

	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, strings.TrimSpace(mediaRef), "background")
	if err != nil {
		return nil, err
	}
	nextSort, err := loadNextAnimeMediaSortOrderByType(ctx, tx, animeID, "background")
	if err != nil {
		return nil, err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, nextSort); err != nil {
		return nil, err
	}

	trimmedProviderKey := trimOptionalStringPtr(providerKey)
	if trimmedProviderKey != nil {
		if err := upsertBackgroundMediaExternal(ctx, tx, mediaID, *trimmedProviderKey); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit add anime background v2 tx: %w", err)
	}

	resolved, err := r.getResolvedAssetsV2(ctx, animeID)
	if err != nil {
		return nil, err
	}
	mediaIDText := fmt.Sprintf("%d", mediaID)
	for _, item := range resolved.Backgrounds {
		if derefString(item.MediaID) == mediaIDText {
			copy := item
			return &copy, nil
		}
	}

	return nil, ErrNotFound
}

func (r *AnimeAssetRepository) removeBackgroundV2(ctx context.Context, animeID int64, backgroundID int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin remove anime background v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `
		DELETE FROM anime_media am
		USING media_assets ma, media_types mt
		WHERE am.media_id = ma.id
		  AND ma.media_type_id = mt.id
		  AND am.anime_id = $1
		  AND am.media_id = $2
		  AND mt.name = 'background'
	`, animeID, backgroundID)
	if err != nil {
		return fmt.Errorf("remove anime background v2 %d/%d: %w", animeID, backgroundID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit remove anime background v2 tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) applyProviderBannerV2(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime banner provider v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	if manual, err := hasManualAnimeMediaByType(ctx, tx, animeID, "banner"); err != nil {
		return err
	} else if manual {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if err := removeAnimeMediaLinksByType(ctx, tx, animeID, "banner"); err != nil {
			return err
		}
	} else {
		mediaID, err := ensureProviderAnimeMediaV2(ctx, tx, "banner", input)
		if err != nil {
			return err
		}
		if err := removeAnimeMediaLinksByType(ctx, tx, animeID, "banner"); err != nil {
			return err
		}
		if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime banner provider v2 tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) applyProviderBackgroundsV2(
	ctx context.Context,
	animeID int64,
	incoming []models.AnimeProviderAssetInput,
) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime backgrounds provider v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	rows, err := tx.Query(ctx, `
		SELECT am.media_id, COALESCE(me.provider, ''), me.external_id, am.sort_order
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN LATERAL (
			SELECT provider, external_id
			FROM media_external
			WHERE media_id = ma.id
			ORDER BY id ASC
			LIMIT 1
		) me ON true
		WHERE am.anime_id = $1
		  AND mt.name = 'background'
		ORDER BY am.sort_order ASC, am.media_id ASC
		FOR UPDATE
	`, animeID)
	if err != nil {
		return fmt.Errorf("query anime background rows for v2 update %d: %w", animeID, err)
	}
	defer rows.Close()

	existing := make([]storedAnimeBackgroundAsset, 0)
	for rows.Next() {
		var item storedAnimeBackgroundAsset
		var provider string
		if err := rows.Scan(&item.ID, &provider, &item.ProviderKey, &item.SortOrder); err != nil {
			return fmt.Errorf("scan anime background v2 row %d: %w", animeID, err)
		}
		if strings.TrimSpace(provider) == "" {
			item.Source = string(models.AnimeAssetOwnershipManual)
		} else {
			item.Source = string(models.AnimeAssetOwnershipProvider)
		}
		existing = append(existing, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate anime background v2 rows %d: %w", animeID, err)
	}

	plan := reconcileAnimeProviderBackgrounds(existing, incoming)
	for _, update := range plan.Updates {
		if _, err := tx.Exec(ctx, `
			UPDATE media_assets
			SET file_path = $2, modified_at = NOW()
			WHERE id = $1
		`, update.ID, update.URL); err != nil {
			return fmt.Errorf("update anime provider background v2 %d: %w", update.ID, err)
		}
	}
	for _, insert := range plan.Inserts {
		mediaID, err := ensureProviderAnimeMediaV2(ctx, tx, "background", &models.AnimeProviderAssetInput{
			URL:         insert.URL,
			ProviderKey: insert.ProviderKey,
		})
		if err != nil {
			return err
		}
		if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, insert.SortOrder); err != nil {
			return err
		}
	}
	for _, deleteID := range plan.DeleteIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM anime_media
			WHERE anime_id = $1 AND media_id = $2
		`, animeID, deleteID); err != nil {
			return fmt.Errorf("delete anime provider background v2 %d: %w", deleteID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime backgrounds provider v2 tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) assignManualSingularAssetV2(ctx context.Context, animeID int64, mediaRef string, mediaType string) error {
	spec, ok := lookupAnimeAssetLinkSpec(mediaType)
	if !ok || !spec.Singular {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin assign anime %s v2 tx: %w", mediaType, err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, strings.TrimSpace(mediaRef), spec.MediaType)
	if err != nil {
		return err
	}
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, spec.MediaType); err != nil {
		return err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit assign anime %s v2 tx: %w", mediaType, err)
	}
	return nil
}

func (r *AnimeAssetRepository) addManualPluralAssetV2(ctx context.Context, animeID int64, mediaRef string, mediaType string) error {
	spec, ok := lookupAnimeAssetLinkSpec(mediaType)
	if !ok {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin add anime %s v2 tx: %w", mediaType, err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, strings.TrimSpace(mediaRef), spec.MediaType)
	if err != nil {
		return err
	}
	nextSort, err := loadNextAnimeMediaSortOrderByType(ctx, tx, animeID, spec.MediaType)
	if err != nil {
		return err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, nextSort); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit add anime %s v2 tx: %w", mediaType, err)
	}
	return nil
}

func (r *AnimeAssetRepository) clearSingularAssetV2(ctx context.Context, animeID int64, mediaType string) error {
	spec, ok := lookupAnimeAssetLinkSpec(mediaType)
	if !ok || !spec.Singular {
		return ErrNotFound
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin clear anime %s v2 tx: %w", mediaType, err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, spec.MediaType); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit clear anime %s v2 tx: %w", mediaType, err)
	}
	return nil
}

func loadV2AnimeMediaIDByRef(ctx context.Context, tx pgx.Tx, mediaRef string, mediaType string) (int64, error) {
	trimmedMediaRef := strings.TrimSpace(mediaRef)
	if trimmedMediaRef == "" {
		return 0, ErrNotFound
	}

	var mediaID int64
	var actualMediaType string
	if err := tx.QueryRow(ctx, `
		SELECT ma.id, COALESCE(mt.name, '')
		FROM media_assets ma
		LEFT JOIN media_types mt ON mt.id = ma.media_type_id
		WHERE ma.id::text = $1
		LIMIT 1
	`, trimmedMediaRef).Scan(&mediaID, &actualMediaType); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	} else if err != nil {
		return 0, fmt.Errorf("load v2 anime %s media ref %q: %w", mediaType, trimmedMediaRef, err)
	}
	if err := validateAnimeAssetLinkMediaType(animeAssetLinkSpec{MediaType: mediaType}, actualMediaType); err != nil {
		return 0, err
	}

	return mediaID, nil
}

func loadNextAnimeMediaSortOrderByType(ctx context.Context, tx pgx.Tx, animeID int64, mediaType string) (int32, error) {
	var nextSort int32
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(am.sort_order), -1) + 1
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		WHERE am.anime_id = $1
		  AND mt.name = $2
	`, animeID, mediaType).Scan(&nextSort); err != nil {
		return 0, fmt.Errorf("load next anime %s sort for %d: %w", mediaType, animeID, err)
	}
	return nextSort, nil
}

func upsertAnimeMediaLink(ctx context.Context, tx pgx.Tx, animeID int64, mediaID int64, sortOrder int32) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO anime_media (anime_id, media_id, sort_order)
		VALUES ($1, $2, $3)
		ON CONFLICT (anime_id, media_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
	`, animeID, mediaID, sortOrder); err != nil {
		return fmt.Errorf("link anime media anime=%d media=%d: %w", animeID, mediaID, err)
	}
	return nil
}

func removeAnimeMediaLinksByType(ctx context.Context, tx pgx.Tx, animeID int64, mediaType string) error {
	if _, err := tx.Exec(ctx, `
		DELETE FROM anime_media am
		USING media_assets ma, media_types mt
		WHERE am.media_id = ma.id
		  AND ma.media_type_id = mt.id
		  AND am.anime_id = $1
		  AND mt.name = $2
	`, animeID, mediaType); err != nil {
		return fmt.Errorf("remove anime %s links %d: %w", mediaType, animeID, err)
	}
	return nil
}

func hasManualAnimeMediaByType(ctx context.Context, tx pgx.Tx, animeID int64, mediaType string) (bool, error) {
	var hasManual bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			LEFT JOIN media_external me ON me.media_id = ma.id
			WHERE am.anime_id = $1
			  AND mt.name = $2
			  AND me.id IS NULL
		)
	`, animeID, mediaType).Scan(&hasManual); err != nil {
		return false, fmt.Errorf("check anime %s manual ownership %d: %w", mediaType, animeID, err)
	}
	return hasManual, nil
}

func ensureProviderAnimeMediaV2(ctx context.Context, tx pgx.Tx, mediaType string, input *models.AnimeProviderAssetInput) (int64, error) {
	if input == nil || strings.TrimSpace(input.URL) == "" {
		return 0, ErrNotFound
	}

	external := buildJellyfinMediaExternal(input.URL)
	if external == nil {
		providerKey := strings.TrimSpace(input.ProviderKey)
		if providerKey == "" {
			providerKey = strings.TrimSpace(input.URL)
		}
		external = &mediaExternalRef{
			Provider:     "jellyfin",
			ExternalID:   providerKey,
			ExternalType: mediaType,
		}
	} else if strings.TrimSpace(input.ProviderKey) != "" {
		external.ExternalID = strings.TrimSpace(input.ProviderKey)
		external.ExternalType = mediaType
	}

	mediaTypeID, err := loadAnimeMediaTypeID(ctx, tx, mediaType)
	if err != nil {
		return 0, err
	}

	var mediaID int64
	if err := tx.QueryRow(ctx, `
		SELECT media_id
		FROM media_external
		WHERE provider = $1 AND external_id = $2 AND external_type = $3
		LIMIT 1
	`, external.Provider, external.ExternalID, external.ExternalType).Scan(&mediaID); errors.Is(err, pgx.ErrNoRows) {
		if err := tx.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, format)
			VALUES ($1, $2, 'image')
			RETURNING id
		`, mediaTypeID, strings.TrimSpace(input.URL)).Scan(&mediaID); err != nil {
			return 0, fmt.Errorf("create provider anime %s media: %w", mediaType, err)
		}
	} else if err != nil {
		return 0, fmt.Errorf("load provider anime %s media: %w", mediaType, err)
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE media_assets
			SET media_type_id = $2, file_path = $3, format = 'image', modified_at = NOW()
			WHERE id = $1
		`, mediaID, mediaTypeID, strings.TrimSpace(input.URL)); err != nil {
			return 0, fmt.Errorf("update provider anime %s media %d: %w", mediaType, mediaID, err)
		}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO media_external (media_id, provider, external_id, external_type, metadata)
		VALUES ($1, $2, $3, $4, NULL)
		ON CONFLICT (provider, external_id, external_type)
		DO UPDATE SET media_id = EXCLUDED.media_id
	`, mediaID, external.Provider, external.ExternalID, external.ExternalType); err != nil {
		return 0, fmt.Errorf("link provider anime %s media %d: %w", mediaType, mediaID, err)
	}

	return mediaID, nil
}

func loadAnimeMediaTypeID(ctx context.Context, tx pgx.Tx, mediaType string) (int64, error) {
	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM media_types
		WHERE name = $1
		LIMIT 1
	`, mediaType).Scan(&mediaTypeID); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	} else if err != nil {
		return 0, fmt.Errorf("load media type %q: %w", mediaType, err)
	}
	return mediaTypeID, nil
}

func (r *AnimeAssetRepository) ensureAnimeMediaAsset(ctx context.Context, animeID int64, mediaID string) error {
	var hasLegacyUploadColumns bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = 'media_assets'
			  AND column_name = 'entity_type'
		)
	`).Scan(&hasLegacyUploadColumns); err != nil {
		return fmt.Errorf("detect anime media asset schema: %w", err)
	}

	if hasLegacyUploadColumns {
		var id string
		err := r.db.QueryRow(ctx, `
			SELECT id
			FROM media_assets
			WHERE id = $1
			  AND entity_type = 'anime'
			  AND entity_id = $2
			  AND format = 'image'
		`, mediaID, animeID).Scan(&id)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load anime media asset %q: %w", mediaID, err)
		}
		return nil
	}

	parsedMediaID, err := strconv.ParseInt(strings.TrimSpace(mediaID), 10, 64)
	if err != nil {
		return fmt.Errorf("load anime media asset %q: invalid v2 media id: %w", mediaID, err)
	}

	var id int64
	err = r.db.QueryRow(ctx, `
		SELECT am.media_id
		FROM anime_media am
		WHERE am.media_id = $1
		  AND am.anime_id = $2
		LIMIT 1
	`, parsedMediaID, animeID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("load anime media asset %q: %w", mediaID, err)
	}
	return nil
}

func lockAnimeRow(ctx context.Context, tx pgx.Tx, animeID int64) error {
	var lockedID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&lockedID); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime row %d: %w", animeID, err)
	}
	return nil
}

func resolveAnimeBannerAsset(
	mediaID *string,
	source *string,
	resolvedURL *string,
	providerKey *string,
	mediaPath *string,
) *models.AnimeResolvedAsset {
	return resolveAnimeResolvedAsset(mediaID, source, resolvedURL, providerKey, mediaPath)
}

func resolveAnimeResolvedAsset(
	mediaID *string,
	source *string,
	resolvedURL *string,
	providerKey *string,
	mediaPath *string,
) *models.AnimeResolvedAsset {
	ownership := strings.TrimSpace(derefString(source))
	if ownership == "" {
		return nil
	}
	urlValue := resolveAnimeAssetURL(mediaID, resolvedURL, mediaPath)
	if urlValue == "" {
		return nil
	}

	return &models.AnimeResolvedAsset{
		MediaID:     mediaID,
		URL:         urlValue,
		Ownership:   models.AnimeAssetOwnership(ownership),
		ProviderKey: normalizeNullableTrimmedString(providerKey),
	}
}

func resolveAnimeAssetURL(mediaID *string, resolvedURL *string, mediaPath *string) string {
	if mediaID != nil && strings.TrimSpace(derefString(mediaPath)) != "" {
		return strings.TrimSpace(derefString(mediaPath))
	}
	return strings.TrimSpace(derefString(resolvedURL))
}

func normalizeNullableTrimmedString(value *string) *string {
	trimmed := strings.TrimSpace(derefString(value))
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (r *AnimeAssetRepository) hasV2AssetSchema(ctx context.Context) (bool, error) {
	hasAnimeMedia, err := r.hasAnimeMediaTable(ctx)
	if err != nil {
		return false, fmt.Errorf("detect v2 anime asset schema: %w", err)
	}
	if !hasAnimeMedia {
		return false, nil
	}

	var hasCoverSlot bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = 'anime'
			  AND column_name = 'cover_asset_id'
		)
	`).Scan(&hasCoverSlot); err != nil {
		return false, fmt.Errorf("detect legacy anime asset slots: %w", err)
	}

	return !hasCoverSlot, nil
}

func (r *AnimeAssetRepository) hasAnimeMediaTable(ctx context.Context) (bool, error) {
	var hasAnimeMedia bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = 'anime_media'
		)
	`).Scan(&hasAnimeMedia); err != nil {
		return false, fmt.Errorf("detect anime_media table: %w", err)
	}

	return hasAnimeMedia, nil
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func resolveV2AssetOwnership(provider *string, externalID *string) (models.AnimeAssetOwnership, *string) {
	if strings.TrimSpace(derefString(provider)) == "" {
		return models.AnimeAssetOwnershipManual, nil
	}

	return models.AnimeAssetOwnershipProvider, normalizeNullableTrimmedString(externalID)
}

type storedAnimeBackgroundAsset struct {
	ID          int64
	Source      string
	ProviderKey *string
	SortOrder   int32
}

type animeProviderBackgroundUpdate struct {
	ID  int64
	URL string
}

type animeProviderBackgroundInsert struct {
	URL         string
	ProviderKey string
	SortOrder   int32
}

type animeProviderBackgroundPlan struct {
	Updates   []animeProviderBackgroundUpdate
	Inserts   []animeProviderBackgroundInsert
	DeleteIDs []int64
}

func reconcileAnimeProviderBackgrounds(
	existing []storedAnimeBackgroundAsset,
	incoming []models.AnimeProviderAssetInput,
) animeProviderBackgroundPlan {
	plan := animeProviderBackgroundPlan{
		Updates:   make([]animeProviderBackgroundUpdate, 0),
		Inserts:   make([]animeProviderBackgroundInsert, 0),
		DeleteIDs: make([]int64, 0),
	}

	existingByKey := make(map[string]storedAnimeBackgroundAsset)
	maxSort := int32(-1)
	for _, item := range existing {
		if item.SortOrder > maxSort {
			maxSort = item.SortOrder
		}
		if strings.TrimSpace(item.Source) != string(models.AnimeAssetOwnershipProvider) {
			continue
		}
		key := strings.TrimSpace(derefString(item.ProviderKey))
		if key == "" {
			plan.DeleteIDs = append(plan.DeleteIDs, item.ID)
			continue
		}
		existingByKey[key] = item
	}

	seen := make(map[string]struct{})
	for _, candidate := range incoming {
		key := strings.TrimSpace(candidate.ProviderKey)
		urlValue := strings.TrimSpace(candidate.URL)
		if key == "" || urlValue == "" {
			continue
		}
		seen[key] = struct{}{}

		if existingItem, ok := existingByKey[key]; ok {
			plan.Updates = append(plan.Updates, animeProviderBackgroundUpdate{
				ID:  existingItem.ID,
				URL: urlValue,
			})
			continue
		}

		maxSort++
		plan.Inserts = append(plan.Inserts, animeProviderBackgroundInsert{
			URL:         urlValue,
			ProviderKey: key,
			SortOrder:   maxSort,
		})
	}

	for key, item := range existingByKey {
		if _, ok := seen[key]; ok {
			continue
		}
		plan.DeleteIDs = append(plan.DeleteIDs, item.ID)
	}

	return plan
}

// upsertBackgroundMediaExternal speichert die Provider-Herkunft eines Background-Assets
// in media_external. providerKey hat das Format "source:external_id" (z.B. "tmdb:12345").
// Wenn kein Doppelpunkt gefunden wird, wird der gesamte Wert als external_id mit
// provider="unknown" gespeichert.
func upsertBackgroundMediaExternal(ctx context.Context, tx pgx.Tx, mediaID int64, providerKey string) error {
	provider := "unknown"
	externalID := providerKey
	if idx := strings.Index(providerKey, ":"); idx > 0 {
		provider = providerKey[:idx]
		externalID = providerKey[idx+1:]
	}

	_, err := tx.Exec(ctx, `
		INSERT INTO media_external (media_id, provider, external_id, external_type, metadata)
		VALUES ($1, $2, $3, 'background', NULL)
		ON CONFLICT (provider, external_id, external_type)
		DO UPDATE SET media_id = EXCLUDED.media_id
	`, mediaID, provider, externalID)
	if err != nil {
		return fmt.Errorf("upsert background media external media=%d provider=%s: %w", mediaID, provider, err)
	}
	return nil
}
