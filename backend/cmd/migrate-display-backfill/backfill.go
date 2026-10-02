package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// BackfillStats tracks aggregate backfill progress across ALL THREE phases (generic
// media_files-table backfill, story-image pointer-only backfill, fansub namespace migration) --
// one flat counter set, matching the Phase 172 precedent's shape, since every phase shares the
// same "candidate / processed-ok / failed" semantics and callers (main.go's summary printer,
// this package's idempotency tests) only ever need the combined totals.
type BackfillStats struct {
	TotalCandidates int
	ProcessedOK     int
	Failed          int
}

// add folds another phase's stats into the aggregate.
func (s *BackfillStats) add(other BackfillStats) {
	s.TotalCandidates += other.TotalCandidates
	s.ProcessedOK += other.ProcessedOK
	s.Failed += other.Failed
}

// runBackfill is the testable core of the Phase 173 backfill. It runs all three phases in order
// -- generic media_files-table display backfill first, then the story-image pointer-only
// special case (D-15), then the fansub namespace migration (D-09/D-17) -- and returns their
// combined stats. Each phase is independently idempotent; running runBackfill twice in a row is
// a true no-op.
func runBackfill(ctx context.Context, db *pgxpool.Pool, cfg Config) (*BackfillStats, error) {
	stats := &BackfillStats{}

	genericStats, err := runGenericDisplayBackfill(ctx, db, cfg)
	if err != nil {
		return nil, fmt.Errorf("generic display backfill: %w", err)
	}
	stats.add(*genericStats)

	storyImageStats, err := runStoryImageDisplayBackfill(ctx, db, cfg)
	if err != nil {
		return nil, fmt.Errorf("story image display backfill: %w", err)
	}
	stats.add(*storyImageStats)

	namespaceStats, err := runFansubNamespaceMigration(ctx, db, cfg)
	if err != nil {
		return nil, fmt.Errorf("fansub namespace migration: %w", err)
	}
	stats.add(*namespaceStats)

	return stats, nil
}

// removeFileQuietly deletes a file, logging but never failing on error -- used to clean up a
// just-written file whose database row insert lost a concurrency race or failed outright. Mirrors
// the handlers-package helper of the same name/purpose (not importable here: it is unexported in
// package handlers).
func removeFileQuietly(path string) {
	if path == "" {
		return
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		log.Printf("warning: failed to remove %s: %v\n", path, err)
	}
}
