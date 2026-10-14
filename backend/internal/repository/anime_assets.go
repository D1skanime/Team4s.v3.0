package repository

import (
	"context"
	"errors"
	"fmt"
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
	return r.getResolvedAssetsV2(ctx, animeID)
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
