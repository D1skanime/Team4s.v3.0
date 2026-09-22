package repository

import (
	"context"
	"errors"
	"testing"

	"team4s.v3/backend/internal/testsupport"
)

// TestPhase165Postgres_SyncAnimeSourceLinks_GlobalUniqueSourceConflictReturnsErrConflict is the
// real-Postgres GAP-06/D-30 (165-18) proof: syncAnimeSourceLinks's ON CONFLICT (anime_id, source)
// target does not match the table's SEPARATE, GLOBAL UNIQUE(source) constraint
// (database/migrations/0047_add_anime_source_links.up.sql:6). A second anime trying to claim an
// already-taken source must convert that unique-violation into repository.ErrConflict, not let it
// bubble up as an unhandled pgconn error.
func TestPhase165Postgres_SyncAnimeSourceLinks_GlobalUniqueSourceConflictReturnsErrConflict(t *testing.T) {
	pool := testsupport.OpenPhase165Postgres(t)
	ctx := context.Background()

	var animeA, animeB int64
	if err := pool.QueryRow(ctx, `INSERT INTO anime (title) VALUES ($1) RETURNING id`, "Anime A").Scan(&animeA); err != nil {
		t.Fatalf("seed animeA: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO anime (title) VALUES ($1) RETURNING id`, "Anime B").Scan(&animeB); err != nil {
		t.Fatalf("seed animeB: %v", err)
	}

	// First link: animeA claims anisearch:999, committed.
	txA, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin tx A: %v", err)
	}
	if err := syncAnimeSourceLinks(ctx, txA, animeA, nil, []string{"anisearch:999"}); err != nil {
		t.Fatalf("expected first link to succeed, got: %v", err)
	}
	if err := txA.Commit(ctx); err != nil {
		t.Fatalf("commit tx A: %v", err)
	}

	// Second link: animeB tries to claim the SAME source in a SEPARATE transaction -- must fail
	// with repository.ErrConflict, not a raw pgconn unique-violation.
	txB, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin tx B: %v", err)
	}
	defer func() { _ = txB.Rollback(ctx) }()

	syncErr := syncAnimeSourceLinks(ctx, txB, animeB, nil, []string{"anisearch:999"})
	if !errors.Is(syncErr, ErrConflict) {
		t.Fatalf("expected error satisfying errors.Is(err, repository.ErrConflict), got %v", syncErr)
	}
	_ = txB.Rollback(ctx)

	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM anime_source_links WHERE source = $1`, "anisearch:999").Scan(&count); err != nil {
		t.Fatalf("count anime_source_links rows: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly one anime_source_links row for anisearch:999, got %d", count)
	}

	var owner int64
	if err := pool.QueryRow(ctx, `SELECT anime_id FROM anime_source_links WHERE source = $1`, "anisearch:999").Scan(&owner); err != nil {
		t.Fatalf("query owner of anisearch:999: %v", err)
	}
	if owner != animeA {
		t.Fatalf("expected anisearch:999 to remain owned by animeA (%d), got %d", animeA, owner)
	}
}
