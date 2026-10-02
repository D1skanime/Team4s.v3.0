package main

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// storyImageDisplayCandidate is one pre-existing story-image media_asset (owner_member_id set)
// that has NO media_files children at all -- the pre-173-06 shape, where the single stored file
// at ma.file_path was the only artifact and no true original ever existed for it (D-15).
type storyImageDisplayCandidate struct {
	MediaAssetID int64
	FilePath     string
}

// runStoryImageDisplayBackfill implements Task 2's first half (D-15): pre-existing story-image
// rows get a pointer-only 'display' media_files row that points at their EXISTING file -- no new
// file is written, and no 'original' row is invented for them, since D-15 explicitly documents
// that a true original does not exist for these rows anymore ("ein echtes Original existiert für
// sie nicht mehr... der Backfill erzeugt für sie nur die display-Variante aus dem vorhandenen
// Bild, überschreibt aber nichts").
func runStoryImageDisplayBackfill(ctx context.Context, db *pgxpool.Pool, cfg Config) (*BackfillStats, error) {
	stats := &BackfillStats{}

	candidates, err := fetchStoryImageDisplayCandidates(ctx, db)
	if err != nil {
		return nil, fmt.Errorf("fetch story image display candidates: %w", err)
	}
	stats.TotalCandidates = len(candidates)
	log.Printf("story image display backfill: found %d pointer-only candidate(s)\n", stats.TotalCandidates)

	for _, candidate := range candidates {
		if cfg.DryRun {
			stats.ProcessedOK++
			log.Printf("DRY RUN: would add pointer-only display row for media_asset %d\n", candidate.MediaAssetID)
			continue
		}
		if err := processStoryImageDisplayCandidate(ctx, db, candidate); err != nil {
			log.Printf("FAILED story image media_asset %d: %v\n", candidate.MediaAssetID, err)
			stats.Failed++
			continue
		}
		stats.ProcessedOK++
		log.Printf("OK: story image media_asset %d\n", candidate.MediaAssetID)
	}

	return stats, nil
}

// fetchStoryImageDisplayCandidates selects every owner_member_id-scoped media_asset that has no
// media_files rows at all yet -- the exact pre-173-06 story-image shape. Once a candidate has
// EITHER an 'original' or a 'display' row, it is excluded (already migrated, or a fresh 173-06
// upload that already carries its own true original + display pair).
func fetchStoryImageDisplayCandidates(ctx context.Context, db *pgxpool.Pool) ([]storyImageDisplayCandidate, error) {
	rows, err := db.Query(ctx, `
		SELECT ma.id, ma.file_path
		FROM media_assets ma
		WHERE ma.owner_member_id IS NOT NULL
		  AND NOT EXISTS (SELECT 1 FROM media_files mf WHERE mf.media_id = ma.id)
		ORDER BY ma.id
	`)
	if err != nil {
		return nil, fmt.Errorf("query story image display candidates: %w", err)
	}
	defer rows.Close()

	var candidates []storyImageDisplayCandidate
	for rows.Next() {
		var c storyImageDisplayCandidate
		if err := rows.Scan(&c.MediaAssetID, &c.FilePath); err != nil {
			return nil, fmt.Errorf("scan story image display candidate: %w", err)
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate story image display candidates: %w", err)
	}
	return candidates, nil
}

// processStoryImageDisplayCandidate probes the EXISTING file's dimensions (no decode-and-resize,
// no new write) and registers a pointer-only 'display' media_files row at the same path, with a
// race-safe INSERT guard identical in shape to the generic phase's.
func processStoryImageDisplayCandidate(ctx context.Context, db *pgxpool.Pool, candidate storyImageDisplayCandidate) error {
	info, statErr := os.Stat(candidate.FilePath)
	if statErr != nil {
		return fmt.Errorf("stat existing file: %w", statErr)
	}

	data, readErr := os.ReadFile(candidate.FilePath)
	if readErr != nil {
		return fmt.Errorf("read existing file: %w", readErr)
	}
	cfg, _, decErr := image.DecodeConfig(bytes.NewReader(data))
	if decErr != nil {
		return fmt.Errorf("decode existing file dimensions: %w", decErr)
	}

	tag, err := db.Exec(ctx, `
		INSERT INTO media_files (media_id, variant, path, width, height, size, status)
		SELECT $1, 'display', $2, $3, $4, $5, 'ready'
		WHERE NOT EXISTS (SELECT 1 FROM media_files WHERE media_id = $1 AND variant = 'display')
	`, candidate.MediaAssetID, candidate.FilePath, cfg.Width, cfg.Height, info.Size())
	if err != nil {
		return fmt.Errorf("insert pointer-only display media_files row: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("media_asset %d already received a display variant concurrently", candidate.MediaAssetID)
	}

	return nil
}
