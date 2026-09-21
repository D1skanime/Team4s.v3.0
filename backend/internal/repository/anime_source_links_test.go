package repository

import (
	"context"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Phase 165 Plan 07 (D-05 Pitfall-3 fix + D-18 folder management): anime_source_links stores the
// additive "which jellyfin: folders are connected to this anime" state. These tests mirror the
// env-DSN-gated Postgres harness pattern of episode_classification_postgres_test.go and 165-02's
// library_discovery_ignored_items_test.go -- t.Skipf when the DSN env var is unset, hard
// database-name-regex guard, never team4s_v2.

const animeSourceLinksDSNEnv = "TEAM4S_ANIME_SOURCE_LINKS_TEST_DSN"

var animeSourceLinksDatabasePattern = regexp.MustCompile(`^team4s_anime_source_links_test(?:_[a-z0-9]+)?$`)

func openAnimeSourceLinksPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(animeSourceLinksDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping anime source links Postgres test", animeSourceLinksDSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", animeSourceLinksDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, animeSourceLinksDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", animeSourceLinksDSNEnv, dbName, animeSourceLinksDatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", animeSourceLinksDSNEnv)
	t.Cleanup(pool.Close)
	return pool
}

const animeSourceLinksFixtureAnimeID int64 = 926_170_501

// seedAnimeSourceLinksFixture creates a minimal anime row for FK-constrained
// anime_source_links inserts, registering cleanup for both tables.
func seedAnimeSourceLinksFixture(t *testing.T, pool *pgxpool.Pool) int64 {
	t.Helper()
	ctx := context.Background()
	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM anime WHERE id = $1`, animeSourceLinksFixtureAnimeID)
	}
	cleanup()
	t.Cleanup(cleanup)

	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id, title, type, status) VALUES ($1, 'Anime Source Links Fixture', 'tv', 'done')
	`, animeSourceLinksFixtureAnimeID)
	require.NoError(t, err, "seed anime")

	return animeSourceLinksFixtureAnimeID
}

func TestAnimeSourceLinks_DatabaseNameGuardRejectsTeam4sV2(t *testing.T) {
	unsafeNames := []string{"team4s_v2", "team4s_v2_replica", "team4s_anime_source_links_test_v2_prod"}
	for _, name := range unsafeNames {
		require.Falsef(t, animeSourceLinksDatabasePattern.MatchString(name),
			"database name %q must be rejected by the guard regex before any connection is attempted", name)
	}
	safeNames := []string{"team4s_anime_source_links_test", "team4s_anime_source_links_test_abc123"}
	for _, name := range safeNames {
		require.Truef(t, animeSourceLinksDatabasePattern.MatchString(name), "database name %q should be accepted", name)
	}
}

func TestLinkAdditionalJellyfinSource_IsIdempotent(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	require.NoError(t, linkAdditionalJellyfinSource(ctx, tx, animeID, "jellyfin:xyz"))
	require.NoError(t, linkAdditionalJellyfinSource(ctx, tx, animeID, "jellyfin:xyz"), "second insert of the same (anime_id, source) pair must not error")

	var rowCount int
	require.NoError(t, tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "jellyfin:xyz",
	).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "duplicate additive link must not create a second row")
}

func TestRemoveAnimeSourceLink_DeletesExactlyOneRowAndReturnsErrNotFoundOnZeroMatch(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	require.NoError(t, linkAdditionalJellyfinSource(ctx, tx, animeID, "jellyfin:def"))

	require.NoError(t, removeAnimeSourceLink(ctx, tx, animeID, "jellyfin:def"))

	var rowCount int
	require.NoError(t, tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "jellyfin:def",
	).Scan(&rowCount))
	require.Equal(t, 0, rowCount, "row must be gone after removal")

	// Deleting a pair that no longer exists (already removed) must surface as ErrNotFound, not a
	// silent success -- a zero-row DELETE is never allowed to report false success (D-18 blocker fix).
	require.ErrorIs(t, removeAnimeSourceLink(ctx, tx, animeID, "jellyfin:def"), ErrNotFound)
}

func TestRemoveAnimeSourceLink_ReturnsErrNotFoundForMismatchedSource(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	require.NoError(t, linkAdditionalJellyfinSource(ctx, tx, animeID, "jellyfin:def"))

	// Regression guard for the exact D-18 blocker: an unprefixed source string (what the frontend
	// used to send verbatim before the handler-side fix) never matches the prefixed stored value,
	// and must surface as ErrNotFound rather than silently affecting 0 rows.
	require.ErrorIs(t, removeAnimeSourceLink(ctx, tx, animeID, "def"), ErrNotFound)

	var rowCount int
	require.NoError(t, tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "jellyfin:def",
	).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "mismatched-source delete attempt must not remove the real row")
}
