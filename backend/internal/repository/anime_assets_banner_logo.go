package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

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

func (r *AnimeAssetRepository) ApplyProviderLogo(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.applyProviderSingularAssetV2(ctx, animeID, "logo", input)
	}
	return ErrNotFound
}

func (r *AnimeAssetRepository) assignManualBannerV2(ctx context.Context, animeID int64, mediaRef string) error {
	return r.assignManualSingularAssetV2(ctx, animeID, mediaRef, "banner")
}

func (r *AnimeAssetRepository) clearBannerV2(ctx context.Context, animeID int64) error {
	return r.clearSingularAssetV2(ctx, animeID, "banner")
}

func (r *AnimeAssetRepository) applyProviderBannerV2(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	return r.applyProviderSingularAssetV2(ctx, animeID, "banner", input)
}
