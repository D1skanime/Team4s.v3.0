package main

import (
	"context"
	"fmt"
	"log"
	"path/filepath"

	"team4s.v3/backend/internal/models"
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

// backfillCandidate is one theme_segment that is missing an automatic preview but has a
// ready render to extract one from (D-07: the most recently completed one).
type backfillCandidate struct {
	SegmentID       int64
	OutputPath      string
	DurationSeconds int
}

// runBackfill is the testable core of the Phase 172 D-13 backfill (extracted out of main()
// per this plan's own must_haves artifact requirement -- cmd/migrate-covers/main.go left this
// untestable, a gap this plan deliberately closes). For every theme_segment without an
// automatic preview but with a ready render-cache entry, it extracts a frame at ~35% of the
// render's duration and registers it exactly like the live auto-preview write path
// (Plans 172-03/172-04): asset creation goes through the SAME repository.MediaRepository
// methods (CreateMediaAsset/InsertMediaFile) that registerSegmentAutoPreview uses, and frame
// extraction goes through the SAME services.MediaService.ExtractImageFrame used by the
// render-worker hook -- so this one-off command cannot drift from the live convention the way
// the pre-this-plan code review round had to fix twice.
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

	for _, candidate := range candidates {
		if err := processBackfillCandidate(ctx, db, mediaRepo, mediaService, cfg, candidate); err != nil {
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
// scoped per segment (not per release-version -- a segment's one auto-preview comes from
// whichever render most recently completed, regardless of which release version triggered
// it, mirroring 172-RESEARCH.md Pitfall 3's guidance for the live write path). Segments that
// already have an automatic preview (ts.auto_preview_media_asset_id IS NOT NULL) are excluded
// up front -- the primary idempotency guard; processBackfillCandidate's UPDATE carries a
// second, race-safe guard on top of this snapshot.
func fetchBackfillCandidates(ctx context.Context, db *pgxpool.Pool) ([]backfillCandidate, error) {
	rows, err := db.Query(ctx, `
		SELECT DISTINCT ON (ts.id) ts.id, src.output_path, src.duration_seconds
		FROM theme_segments ts
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
		if err := rows.Scan(&c.SegmentID, &c.OutputPath, &c.DurationSeconds); err != nil {
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
// Errors are returned (never panicked/fatal'd) so a single broken segment's render output
// cannot abort the rest of the batch -- runBackfill counts the failure and continues.
func processBackfillCandidate(ctx context.Context, db *pgxpool.Pool, mediaRepo *repository.MediaRepository, mediaService *services.MediaService, cfg Config, candidate backfillCandidate) error {
	if cfg.DryRun {
		// DRY_RUN=true performs no DB writes and no file writes, but the candidate is still
		// counted as "would be processed" in stats by the caller (runBackfill increments
		// ProcessedOK for every nil-error return).
		return nil
	}

	videoPath := filepath.Join(cfg.SegmentRenderDir, candidate.OutputPath)
	offsetSeconds := float64(candidate.DurationSeconds) * 0.35
	destRelPath := filepath.ToSlash(filepath.Join(
		"segments", "previews", fmt.Sprintf("segment_%d", candidate.SegmentID), uuid.New().String()+".jpg",
	))

	variant, err := mediaService.ExtractImageFrame(videoPath, offsetSeconds, destRelPath)
	if err != nil {
		return fmt.Errorf("extract frame: %w", err)
	}

	publicVisibility := "public"
	approvedReview := "approved"
	asset, err := mediaRepo.CreateMediaAsset(ctx, models.MediaAssetCreateInput{
		Kind:             models.MediaKindImage,
		Filename:         variant.Filename,
		StoragePath:      variant.StoragePath,
		MimeType:         variant.MimeType,
		SizeBytes:        variant.SizeBytes,
		Width:            variant.Width,
		Height:           variant.Height,
		VisibilityCode:   &publicVisibility,
		ReviewStatusCode: &approvedReview,
	})
	if err != nil {
		return fmt.Errorf("create media asset: %w", err)
	}

	if err := mediaRepo.InsertMediaFile(ctx, asset.ID, "original", variant.StoragePath, variant.SizeBytes); err != nil {
		_ = mediaRepo.DeleteMediaAsset(ctx, asset.ID)
		return fmt.Errorf("insert media file: %w", err)
	}

	// Race-safe idempotent write: the candidate list above is a snapshot taken before this
	// loop started, so a concurrent second backfill run (or a render completing in between)
	// must never clobber an auto preview that got set in the meantime. The extra
	// "AND auto_preview_media_asset_id IS NULL" guard makes the write itself safe even if the
	// snapshot is stale, on top of mirroring the shared single-column-write convention
	// (setThemeSegmentPreviewColumn/SetThemeSegmentAutoPreview, Plan 172-03) that this
	// statement otherwise matches exactly -- it never touches preview_media_asset_id (D-08).
	tag, err := db.Exec(ctx, `
		UPDATE theme_segments SET auto_preview_media_asset_id = $1
		WHERE id = $2 AND auto_preview_media_asset_id IS NULL
	`, asset.ID, candidate.SegmentID)
	if err != nil {
		_ = mediaRepo.DeleteMediaAsset(ctx, asset.ID)
		return fmt.Errorf("update theme_segments: %w", err)
	}
	if tag.RowsAffected() == 0 {
		// Someone else set the auto preview concurrently between the candidate snapshot and
		// this UPDATE -- clean up the now-redundant asset we just created instead of leaving
		// an orphaned media_assets row.
		_ = mediaRepo.DeleteMediaAsset(ctx, asset.ID)
		return fmt.Errorf("segment %d already received an auto preview concurrently", candidate.SegmentID)
	}

	return nil
}
