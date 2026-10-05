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

func NewAnimeAssetRepository(db *pgxpool.Pool) *AnimeAssetRepository {
	return &AnimeAssetRepository{db: db}
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
		LEFT JOIN LATERAL (
			SELECT path, id
			FROM media_files
			WHERE media_id = a.cover_asset_id
			ORDER BY CASE WHEN variant = 'display' THEN 0 WHEN variant = 'original' OR variant IS NULL THEN 1 ELSE 2 END, id ASC
			LIMIT 1
		) cover_mf ON true
		LEFT JOIN LATERAL (
			SELECT path, id
			FROM media_files
			WHERE media_id = a.banner_asset_id
			ORDER BY CASE WHEN variant = 'display' THEN 0 WHEN variant = 'original' OR variant IS NULL THEN 1 ELSE 2 END, id ASC
			LIMIT 1
		) banner_mf ON true
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
		LEFT JOIN LATERAL (
			SELECT path, id
			FROM media_files
			WHERE media_id = aba.media_asset_id
			ORDER BY CASE WHEN variant = 'display' THEN 0 WHEN variant = 'original' OR variant IS NULL THEN 1 ELSE 2 END, id ASC
			LIMIT 1
		) mf ON true
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
				CASE WHEN variant = 'display' THEN 0 WHEN variant = 'original' THEN 1 ELSE 2 END,
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
			Provider:    normalizeNullableTrimmedString(provider),
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
				Provider:    asset.Provider,
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

func (r *AnimeAssetRepository) hasV2AssetSchema(ctx context.Context) (bool, error) {
	hasAnimeMedia, err := r.hasAnimeMediaTable(ctx)
	if err != nil {
		return false, fmt.Errorf("detect v2 anime asset schema: %w", err)
	}
	if !hasAnimeMedia {
		return false, nil
	}

	// V2 remains authoritative once anime_media exists, even if legacy slot columns
	// still coexist for compatibility and cover_image sync.
	return true, nil
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
