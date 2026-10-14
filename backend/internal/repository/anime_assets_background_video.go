package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// 174-19: split out of anime_assets_background.go to keep both files under the
// project's 450-line modularity ceiling (CLAUDE.md). background_video is a
// singular slot (unlike the plural background collection) that happens to share
// the plural-style AddManual naming/dispatch for historical reasons -- it is kept
// here, next to its own Assign/Add/Clear/ApplyProvider siblings, not split by
// legacy-vs-V2 (RESEARCH.md Pitfall 4).

func (r *AnimeAssetRepository) AssignManualBackgroundVideo(ctx context.Context, animeID int64, mediaID string) error {
	return r.assignManualSingularAssetV2(ctx, animeID, mediaID, "background_video")
}

func (r *AnimeAssetRepository) AddManualBackgroundVideo(ctx context.Context, animeID int64, mediaID string) error {
	return r.addManualPluralAssetV2(ctx, animeID, mediaID, "background_video")
}

func (r *AnimeAssetRepository) ClearBackgroundVideo(ctx context.Context, animeID int64) error {
	return r.clearSingularAssetV2(ctx, animeID, "background_video")
}

func (r *AnimeAssetRepository) ApplyProviderBackgroundVideo(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	return r.applyProviderSingularAssetV2(ctx, animeID, "video", input)
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
