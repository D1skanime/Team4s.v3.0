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

// Phase 165 (Library Discovery, D-17/D-22): library_discovery_ignored_items stores a
// reversible "ignore" state for Jellyfin library items, keyed by (server_key,
// jellyfin_item_id), with server_key defaulting to 'default' at the DB level (D-22
// provision column for a future multi-server phase). These tests mirror the
// env-DSN-gated Postgres harness pattern of episode_classification_postgres_test.go --
// t.Skipf when the DSN env var is unset, hard database-name-regex guard, never
// team4s_v2.

const libraryDiscoveryTestDSNEnv = "TEAM4S_LIBRARY_DISCOVERY_TEST_DSN"

var libraryDiscoveryTestDatabasePattern = regexp.MustCompile(`^team4s_library_discovery_test(?:_[a-z0-9]+)?$`)

// openLibraryDiscoveryPostgres opens the disposable Phase-165 test database
// (TEAM4S_LIBRARY_DISCOVERY_TEST_DSN, skip-if-unset), with a query-counting
// pgx.QueryTracer wired onto the pool's ConnConfig BEFORE the pool opens, so every SQL
// round-trip issued through the returned pool is observed from the first connection
// onward (same wiring order as query_counter.go's documented usage).
func openLibraryDiscoveryPostgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(libraryDiscoveryTestDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping library discovery ignore Postgres test", libraryDiscoveryTestDSNEnv)
	}

	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", libraryDiscoveryTestDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, libraryDiscoveryTestDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", libraryDiscoveryTestDSNEnv, dbName, libraryDiscoveryTestDatabasePattern)

	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", libraryDiscoveryTestDSNEnv)
	t.Cleanup(pool.Close)
	return pool, counter
}

// cleanupLibraryDiscoveryIgnoreRows deletes any rows for the given item IDs, both
// before seeding (idempotent starting state) and after the test via t.Cleanup.
func cleanupLibraryDiscoveryIgnoreRows(t *testing.T, pool *pgxpool.Pool, itemIDs ...string) {
	t.Helper()
	del := func() {
		_, err := pool.Exec(context.Background(),
			`DELETE FROM library_discovery_ignored_items WHERE jellyfin_item_id = ANY($1::text[])`, itemIDs)
		require.NoError(t, err, "cleanup library_discovery_ignored_items rows")
	}
	del()
	t.Cleanup(del)
}

// seedLibraryDiscoveryTestAppUser inserts a minimal app_users fixture row (unique per
// keycloak_subject) and registers cleanup, returning the new row's id.
func seedLibraryDiscoveryTestAppUser(t *testing.T, pool *pgxpool.Pool, subject string) int64 {
	t.Helper()
	ctx := context.Background()
	var id int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO app_users (keycloak_subject, email, display_name, status)
		VALUES ($1, $1 || '@example.invalid', $1, 'active')
		ON CONFLICT (keycloak_subject) DO UPDATE SET display_name = EXCLUDED.display_name
		RETURNING id
	`, subject).Scan(&id))
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM app_users WHERE id = $1`, id)
	})
	return id
}

func TestLibraryDiscoveryIgnoredItems_DatabaseNameGuardRejectsTeam4sV2(t *testing.T) {
	unsafeNames := []string{"team4s_v2", "team4s_v2_replica", "team4s_library_discovery_test_v2_prod"}
	for _, name := range unsafeNames {
		require.Falsef(t, libraryDiscoveryTestDatabasePattern.MatchString(name),
			"database name %q must be rejected by the guard regex before any connection is attempted", name)
	}
	safeNames := []string{"team4s_library_discovery_test", "team4s_library_discovery_test_abc123"}
	for _, name := range safeNames {
		require.Truef(t, libraryDiscoveryTestDatabasePattern.MatchString(name), "database name %q should be accepted", name)
	}
}

func TestLibraryDiscoveryIgnoredItems_InsertIsIdempotent(t *testing.T) {
	pool, _ := openLibraryDiscoveryPostgres(t)
	ctx := context.Background()
	const itemID = "165-02-test-idempotent-item"
	cleanupLibraryDiscoveryIgnoreRows(t, pool, itemID)

	repo := NewLibraryDiscoveryIgnoreRepository(pool)

	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, itemID, nil))
	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, itemID, nil), "second insert of the same item must not error")

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM library_discovery_ignored_items WHERE jellyfin_item_id = $1`, itemID,
	).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "duplicate ignore must not create a second row")
}

func TestLibraryDiscoveryIgnoredItems_FindIssuesExactlyOneQueryAndReturnsIgnoredSubset(t *testing.T) {
	pool, counter := openLibraryDiscoveryPostgres(t)
	ctx := context.Background()
	ignoredA := "165-02-test-find-ignored-a"
	ignoredB := "165-02-test-find-ignored-b"
	notIgnored := "165-02-test-find-not-ignored"
	cleanupLibraryDiscoveryIgnoreRows(t, pool, ignoredA, ignoredB, notIgnored)

	repo := NewLibraryDiscoveryIgnoreRepository(pool)
	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, ignoredA, nil))
	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, ignoredB, nil))

	// Mix of ignored/not-ignored/duplicate/empty-string IDs.
	lookupIDs := []string{ignoredA, ignoredA, notIgnored, ignoredB, "", "  "}

	counter.reset()
	result, err := repo.FindIgnoredLibraryDiscoveryItems(ctx, lookupIDs)
	require.NoError(t, err)
	require.Equal(t, 1, counter.count(), "batch lookup must issue exactly one SQL query regardless of input size")

	require.True(t, result[ignoredA])
	require.True(t, result[ignoredB])
	require.False(t, result[notIgnored])
	require.Len(t, result, 2, "result must contain exactly the ignored subset")
}

func TestLibraryDiscoveryIgnoredItems_FindQueryCountStaysConstantAsInputGrows(t *testing.T) {
	pool, counter := openLibraryDiscoveryPostgres(t)
	ctx := context.Background()
	repo := NewLibraryDiscoveryIgnoreRepository(pool)

	few := []string{"165-02-test-scale-1", "165-02-test-scale-2"}
	many := make([]string, 0, 40)
	for i := 0; i < 40; i++ {
		many = append(many, "165-02-test-scale-many")
	}
	_ = few

	counter.reset()
	_, err := repo.FindIgnoredLibraryDiscoveryItems(ctx, few)
	require.NoError(t, err)
	fewCount := counter.count()

	counter.reset()
	_, err = repo.FindIgnoredLibraryDiscoveryItems(ctx, many)
	require.NoError(t, err)
	manyCount := counter.count()

	require.Equal(t, fewCount, manyCount, "query count must not scale with the number of IDs looked up")
	require.Equal(t, 1, manyCount)
}

func TestLibraryDiscoveryIgnoredItems_RemoveUnignores(t *testing.T) {
	pool, _ := openLibraryDiscoveryPostgres(t)
	ctx := context.Background()
	const itemID = "165-02-test-remove-item"
	cleanupLibraryDiscoveryIgnoreRows(t, pool, itemID)

	repo := NewLibraryDiscoveryIgnoreRepository(pool)
	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, itemID, nil))

	result, err := repo.FindIgnoredLibraryDiscoveryItems(ctx, []string{itemID})
	require.NoError(t, err)
	require.True(t, result[itemID], "item must be ignored before removal")

	require.NoError(t, repo.RemoveLibraryDiscoveryIgnore(ctx, itemID))

	result, err = repo.FindIgnoredLibraryDiscoveryItems(ctx, []string{itemID})
	require.NoError(t, err)
	require.False(t, result[itemID], "item must no longer be ignored after removal")

	// Removing an already-removed item must not error (reversible, idempotent).
	require.NoError(t, repo.RemoveLibraryDiscoveryIgnore(ctx, itemID))
}

func TestLibraryDiscoveryIgnoredItems_ServerKeyDefaultsToDefaultAtDBLevel(t *testing.T) {
	pool, _ := openLibraryDiscoveryPostgres(t)
	ctx := context.Background()
	const itemID = "165-02-test-server-key-default"
	cleanupLibraryDiscoveryIgnoreRows(t, pool, itemID)

	repo := NewLibraryDiscoveryIgnoreRepository(pool)
	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, itemID, nil))

	var serverKey string
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT server_key FROM library_discovery_ignored_items WHERE jellyfin_item_id = $1`, itemID,
	).Scan(&serverKey))
	require.Equal(t, "default", serverKey, "server_key must default to 'default' at the DB level, not via a Go-side default")
}

func TestLibraryDiscoveryIgnoredItems_ActorAppUserIDIsStoredVerbatim(t *testing.T) {
	pool, _ := openLibraryDiscoveryPostgres(t)
	ctx := context.Background()
	const itemID = "165-02-test-actor-item"
	cleanupLibraryDiscoveryIgnoreRows(t, pool, itemID)

	actorID := seedLibraryDiscoveryTestAppUser(t, pool, "165-02-test-actor")

	repo := NewLibraryDiscoveryIgnoreRepository(pool)
	require.NoError(t, repo.InsertLibraryDiscoveryIgnore(ctx, itemID, &actorID))

	var storedActorID *int64
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT ignored_by_app_user_id FROM library_discovery_ignored_items WHERE jellyfin_item_id = $1`, itemID,
	).Scan(&storedActorID))
	require.NotNil(t, storedActorID)
	require.Equal(t, actorID, *storedActorID)
}
