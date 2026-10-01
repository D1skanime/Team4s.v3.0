package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BackfillStats tracks backfill progress.
type BackfillStats struct {
	TotalCandidates int
	ProcessedOK     int
	Failed          int
}

// previewImageStore legt einen extrahierten Frame ueber den globalen Anime-Upload-Pfad ab
// (handlers.MediaUploadHandler.StoreGeneratedAnimeImage) -- derselbe Pfad wie Render-Worker
// und Video-Upload (Phase 172). Tests injizieren ueber Config.ImageStore eine Attrappe.
type previewImageStore interface {
	StoreGeneratedAnimeImage(ctx context.Context, sourcePath string, animeID int64, assetType string) (int64, error)
}

// backfillCandidate is one theme_segment that is missing an automatic preview but has a
// ready render to extract one from (D-07: the most recently completed one).
type backfillCandidate struct {
	SegmentID       int64
	AnimeID         int64
	OutputPath      string
	DurationSeconds int
}

// runBackfill is the testable core of the Phase 172 D-13 backfill. For every theme_segment
// without an automatic preview but with a ready render-cache entry, it extracts a frame at
// ~35% of the render's duration (services.MediaService.ExtractImageFrame, same as the render
// worker) and stores it through the global anime upload path
// (media/anime/<id>/segment_preview/<uuid>/), exactly like the live auto-preview path.
func runBackfill(ctx context.Context, db *pgxpool.Pool, cfg Config) (*BackfillStats, error) {
	stats := &BackfillStats{}

	candidates, err := fetchBackfillCandidates(ctx, db)
	if err != nil {
		return nil, fmt.Errorf("fetch backfill candidates: %w", err)
	}
	stats.TotalCandidates = len(candidates)
	log.Printf("Found %d segment(s) without an automatic preview but with a ready render\n", stats.TotalCandidates)

	mediaRepo := repository.NewMediaRepository(db, "", cfg.MediaStorageDir)
	mediaService := services.NewMediaService(cfg.MediaStorageDir, "", cfg.FFmpegPath)
	store := cfg.ImageStore
	if store == nil {
		store = handlers.NewMediaUploadHandler(repository.NewMediaUploadRepository(db), cfg.MediaStorageDir, "", cfg.FFmpegPath).
			WithLifecycleService(services.NewAssetLifecycleService(repository.NewAssetLifecycleRepository(db), cfg.MediaStorageDir))
	}

	for _, candidate := range candidates {
		if err := processBackfillCandidate(ctx, db, mediaRepo, mediaService, store, cfg, candidate); err != nil {
			log.Printf("FAILED segment %d: %v\n", candidate.SegmentID, err)
			stats.Failed++
			continue
		}
		stats.ProcessedOK++
		if cfg.DryRun {
			log.Printf("DRY RUN: would process segment %d\n", candidate.SegmentID)
		} else {
			log.Printf("OK: segment %d\n", candidate.SegmentID)
		}
	}

	return stats, nil
}

// fetchBackfillCandidates implements the D-07 "most recently completed render wins" ranking,
// scoped per segment. Segments that already have an automatic preview are excluded up front
// (primary idempotency guard); processBackfillCandidate's UPDATE carries a second, race-safe
// guard on top of this snapshot.
func fetchBackfillCandidates(ctx context.Context, db *pgxpool.Pool) ([]backfillCandidate, error) {
	rows, err := db.Query(ctx, `
		SELECT DISTINCT ON (ts.id) ts.id, t.anime_id, src.output_path, src.duration_seconds
		FROM theme_segments ts
		JOIN themes t ON t.id = ts.theme_id
		JOIN theme_segment_render_cache src ON src.theme_segment_id = ts.id
		WHERE ts.auto_preview_media_asset_id IS NULL
		  AND src.status = 'ready' AND src.invalidated_at IS NULL AND src.duration_seconds IS NOT NULL
		ORDER BY ts.id, src.completed_at DESC NULLS LAST, src.id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("query backfill candidates: %w", err)
	}
	defer rows.Close()

	var candidates []backfillCandidate
	for rows.Next() {
		var c backfillCandidate
		if err := rows.Scan(&c.SegmentID, &c.AnimeID, &c.OutputPath, &c.DurationSeconds); err != nil {
			return nil, fmt.Errorf("scan backfill candidate: %w", err)
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate backfill candidates: %w", err)
	}
	return candidates, nil
}

// processBackfillCandidate extracts the frame and registers it for exactly one segment.
// Errors are returned (never fatal) so a single broken render cannot abort the batch.
func processBackfillCandidate(ctx context.Context, db *pgxpool.Pool, mediaRepo *repository.MediaRepository, mediaService *services.MediaService, store previewImageStore, cfg Config, candidate backfillCandidate) error {
	if cfg.DryRun {
		return nil
	}

	videoPath := filepath.Join(cfg.SegmentRenderDir, candidate.OutputPath)
	offsetSeconds := float64(candidate.DurationSeconds) * 0.35
	framePath := filepath.Join(os.TempDir(), fmt.Sprintf("team4s-backfill-preview-%d-%s.jpg", candidate.SegmentID, uuid.New().String()))
	defer func() { _ = os.Remove(framePath) }()

	if err := mediaService.ExtractImageFrame(videoPath, offsetSeconds, framePath); err != nil {
		return fmt.Errorf("extract frame: %w", err)
	}

	assetID, err := store.StoreGeneratedAnimeImage(ctx, framePath, candidate.AnimeID, "segment_preview")
	if err != nil {
		return fmt.Errorf("store preview image: %w", err)
	}

	// Race-safe idempotent write: never clobber an auto preview set concurrently, never touch
	// preview_media_asset_id (D-08).
	tag, err := db.Exec(ctx, `
		UPDATE theme_segments SET auto_preview_media_asset_id = $1
		WHERE id = $2 AND auto_preview_media_asset_id IS NULL
	`, assetID, candidate.SegmentID)
	if err != nil {
		removeBackfillAsset(ctx, mediaRepo, assetID)
		return fmt.Errorf("update theme_segments: %w", err)
	}
	if tag.RowsAffected() == 0 {
		removeBackfillAsset(ctx, mediaRepo, assetID)
		return fmt.Errorf("segment %d already received an auto preview concurrently", candidate.SegmentID)
	}

	return nil
}

// removeBackfillAsset raeumt ein nicht mehr benoetigtes, gerade erzeugtes Asset auf.
func removeBackfillAsset(ctx context.Context, mediaRepo *repository.MediaRepository, assetID int64) {
	paths, _ := mediaRepo.ListMediaFilePaths(ctx, assetID)
	for _, p := range paths {
		_ = os.Remove(p)
		_ = os.Remove(filepath.Dir(p))
	}
	_ = mediaRepo.DeleteMediaAsset(ctx, assetID)
}
