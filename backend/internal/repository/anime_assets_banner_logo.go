package repository

import (
	"context"

	"team4s.v3/backend/internal/models"
)

func (r *AnimeAssetRepository) AssignManualBanner(ctx context.Context, animeID int64, mediaID string) error {
	return r.assignManualBannerV2(ctx, animeID, mediaID)
}

func (r *AnimeAssetRepository) ClearBanner(ctx context.Context, animeID int64) error {
	return r.clearBannerV2(ctx, animeID)
}

func (r *AnimeAssetRepository) AssignManualLogo(ctx context.Context, animeID int64, mediaID string) error {
	return r.assignManualSingularAssetV2(ctx, animeID, mediaID, "logo")
}

func (r *AnimeAssetRepository) ClearLogo(ctx context.Context, animeID int64) error {
	return r.clearSingularAssetV2(ctx, animeID, "logo")
}

func (r *AnimeAssetRepository) ApplyProviderBanner(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	return r.applyProviderBannerV2(ctx, animeID, input)
}

func (r *AnimeAssetRepository) ApplyProviderLogo(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	return r.applyProviderSingularAssetV2(ctx, animeID, "logo", input)
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
