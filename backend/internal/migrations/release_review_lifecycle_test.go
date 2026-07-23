package migrations

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

const (
	releaseReviewLifecycleMigration = "0135_release_review_lifecycle"
	releaseReviewLifecycleUp        = releaseReviewLifecycleMigration + ".up.sql"
	releaseReviewLifecycleDown      = releaseReviewLifecycleMigration + ".down.sql"
)

var releaseReviewLifecycleTables = []string{
	"release_version_note_review_lifecycle",
	"release_version_media_review_lifecycle",
	"release_review_file_delete_jobs",
}

func TestReleaseReviewLifecycleMigrationContract(t *testing.T) {
	up := readReleaseReviewLifecycleMigration(t, releaseReviewLifecycleUp)

	requireSQLContains(t, up,
		"create table release_version_note_review_lifecycle",
		"release_version_note_id bigint not null unique references release_version_notes(id)",
		"create table release_version_media_review_lifecycle",
		"release_version_media_id bigint not null unique references release_version_media(id)",
		"create table release_review_file_delete_jobs",
		"create view release_review_lifecycle_sources",
		"source_revision bigint not null check (source_revision > 0)",
		"review_state text not null check (review_state in ('pending', 'confirmed', 'rejected', 'tombstoned'))",
		"submitter_app_user_id bigint not null references app_users(id)",
		"submitter_member_id bigint not null references members(id)",
		"submitted_at timestamptz not null",
		"last_activity_at timestamptz not null",
		"cleanup_due_at timestamptz null",
		"decided_at timestamptz null",
		"tombstoned_at timestamptz null",
		"category text not null check (category in ('screenshot', 'typesetting_karaoke', 'fun_outtake', 'other'))",
		"media_asset_id bigint not null",
		"media_file_id bigint not null",
		"attempt_count integer not null default 0 check (attempt_count >= 0)",
		"last_error_code text null",
		"next_attempt_at timestamptz null",
		"completed_at timestamptz null",
		"unique (media_file_id)",
		"create index idx_release_note_review_queue",
		"on release_version_note_review_lifecycle (review_state, submitted_at, id)",
		"create index idx_release_media_review_queue",
		"on release_version_media_review_lifecycle (review_state, submitted_at, id)",
		"create index idx_release_note_review_cleanup",
		"on release_version_note_review_lifecycle (review_state, cleanup_due_at, id)",
		"create index idx_release_media_review_cleanup",
		"on release_version_media_review_lifecycle (review_state, cleanup_due_at, id)",
	)

	lower := strings.ToLower(up)
	for _, forbidden := range []string{
		"release_media",
		"episode_id",
		"body_html",
		"body_markdown",
		"caption text",
		"storage_path",
		"file_path",
		"path text",
		"blob",
		"bytea",
	} {
		require.NotContains(t, lower, forbidden, "migration copies content/path or crosses release-version ownership: %s", forbidden)
	}
	for _, phase107Table := range []string{
		"create table review_decisions",
		"create table review_audit_events",
		"create table review_reason_texts",
		"create table review_credit_slots",
	} {
		require.NotContains(t, lower, phase107Table, "Phase-107 review core must be reused")
	}

	down := readReleaseReviewLifecycleMigration(t, releaseReviewLifecycleDown)
	requireSQLContains(t, down,
		"raise exception",
		"release_version_note_review_lifecycle",
		"release_version_media_review_lifecycle",
		"release_review_file_delete_jobs",
		"drop view if exists release_review_lifecycle_sources",
		"drop table if exists release_review_file_delete_jobs",
		"drop table if exists release_version_media_review_lifecycle",
		"drop table if exists release_version_note_review_lifecycle",
	)
	requireOrder(t, down, "raise exception", "drop view")
	requireOrder(t, down, "drop view", "drop table if exists release_review_file_delete_jobs")
	require.NotContains(t, down, "cascade")
}

func TestReleaseReviewLifecycleNoteIdentityAndTombstoneScrubbing(t *testing.T) {
	pool := openReleaseReviewLifecyclePool(t)
	seedReleaseReviewLifecycleSources(t, pool)

	_, err := pool.Exec(context.Background(), `
INSERT INTO release_version_note_review_lifecycle (
    release_version_note_id, source_revision, review_state,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (1001, 1, 'pending', 11, 21, '2026-01-01T10:00:00Z', '2026-01-01T10:00:00Z')`)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_version_note_review_lifecycle (
    release_version_note_id, source_revision, review_state,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (1001, 2, 'pending', 11, 21, NOW(), NOW())`)
	require.Error(t, err, "one note source has exactly one lifecycle identity")

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_version_note_review_lifecycle (
    release_version_note_id, source_revision, review_state,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (9999, 1, 'pending', 11, 21, NOW(), NOW())`)
	require.Error(t, err, "note identity must be a real release_version_notes.id")

	for name, mutation := range map[string]string{
		"zero revision":  "source_revision = 0",
		"client state":   "review_state = 'published'",
		"blank activity": "last_activity_at = NULL",
	} {
		t.Run(name, func(t *testing.T) {
			_, err := pool.Exec(context.Background(), `
UPDATE release_version_note_review_lifecycle SET `+mutation+` WHERE release_version_note_id = 1001`)
			require.Error(t, err)
		})
	}

	_, err = pool.Exec(context.Background(), `
UPDATE release_version_note_review_lifecycle
SET source_revision = 2,
    review_state = 'tombstoned',
    last_activity_at = '2026-01-02T10:00:00Z',
    cleanup_due_at = '2026-04-02T10:00:00Z',
    decided_at = '2026-01-01T11:00:00Z',
    tombstoned_at = '2026-04-02T10:00:00Z'
WHERE release_version_note_id = 1001`)
	require.NoError(t, err, "same source identity supports edit/resubmit revision and scrubbed tombstone")

	assertReleaseReviewLifecycleHasNoPayloadColumns(t, pool, "release_version_note_review_lifecycle")
}

func TestReleaseReviewLifecycleMediaIdentityCategoryAndOwnership(t *testing.T) {
	pool := openReleaseReviewLifecyclePool(t)
	seedReleaseReviewLifecycleSources(t, pool)

	_, err := pool.Exec(context.Background(), `
INSERT INTO release_version_media_review_lifecycle (
    release_version_media_id, source_revision, review_state, category,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (2001, 1, 'pending', 'screenshot', 11, 21, NOW(), NOW())`)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_version_media_review_lifecycle (
    release_version_media_id, source_revision, review_state, category,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (2001, 2, 'pending', 'other', 11, 21, NOW(), NOW())`)
	require.Error(t, err, "one release_version_media relation has exactly one lifecycle identity")

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_version_media_review_lifecycle (
    release_version_media_id, source_revision, review_state, category,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (9999, 1, 'pending', 'screenshot', 11, 21, NOW(), NOW())`)
	require.Error(t, err, "media identity must be a real release_version_media.id")

	_, err = pool.Exec(context.Background(), `
UPDATE release_version_media_review_lifecycle SET category = 'release_media' WHERE release_version_media_id = 2001`)
	require.Error(t, err, "only the four release_version_media categories are valid")

	var releaseVersionID, mediaAssetID, mediaFileID int64
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT rvm.release_version_id, rvm.media_asset_id, mf.id
FROM release_version_media rvm
JOIN media_files mf ON mf.media_id = rvm.media_asset_id
WHERE rvm.id = 2001`).Scan(&releaseVersionID, &mediaAssetID, &mediaFileID))
	require.Equal(t, int64(31), releaseVersionID)
	require.Equal(t, int64(41), mediaAssetID)
	require.Equal(t, int64(51), mediaFileID)

	assertReleaseReviewLifecycleHasNoPayloadColumns(t, pool, "release_version_media_review_lifecycle")
}

func TestReleaseReviewLifecycleRetryIdempotencySurvivesLogicalCleanup(t *testing.T) {
	pool := openReleaseReviewLifecyclePool(t)
	seedReleaseReviewLifecycleSources(t, pool)

	_, err := pool.Exec(context.Background(), `
INSERT INTO release_review_file_delete_jobs (
    release_version_media_id, media_asset_id, media_file_id,
    attempt_count, last_error_code, next_attempt_at
) VALUES (2001, 41, 51, 2, 'storage_unavailable', '2026-01-01T12:00:00Z')`)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_review_file_delete_jobs (
    release_version_media_id, media_asset_id, media_file_id
) VALUES (2002, 41, 51)`)
	require.Error(t, err, "physical file identity has one persistent idempotent job")

	_, err = pool.Exec(context.Background(), `
DELETE FROM release_version_media_review_lifecycle WHERE release_version_media_id = 2001`)
	require.NoError(t, err, "logical lifecycle cleanup is independent from physical-delete retry")

	var relationID, assetID, fileID int64
	var attempts int
	var errorCode string
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT release_version_media_id, media_asset_id, media_file_id, attempt_count, last_error_code
FROM release_review_file_delete_jobs
WHERE media_file_id = 51`).Scan(&relationID, &assetID, &fileID, &attempts, &errorCode))
	require.Equal(t, int64(2001), relationID)
	require.Equal(t, int64(41), assetID)
	require.Equal(t, int64(51), fileID)
	require.Equal(t, 2, attempts)
	require.Equal(t, "storage_unavailable", errorCode)
}

func TestReleaseReviewLifecycleDownSafety(t *testing.T) {
	t.Run("populated down refuses before mutation", func(t *testing.T) {
		pool := openReleaseReviewLifecyclePool(t)
		seedReleaseReviewLifecycleSources(t, pool)
		_, err := pool.Exec(context.Background(), `
INSERT INTO release_version_note_review_lifecycle (
    release_version_note_id, source_revision, review_state,
    submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
) VALUES (1001, 1, 'pending', 11, 21, NOW(), NOW())`)
		require.NoError(t, err)

		_, err = pool.Exec(context.Background(), readReleaseReviewLifecycleMigration(t, releaseReviewLifecycleDown))
		require.Error(t, err)
		for _, table := range releaseReviewLifecycleTables {
			assertPhase106TableExists(t, pool, table)
		}
		assertReleaseReviewLifecycleViewExists(t, pool, true)
	})

	t.Run("empty up down up", func(t *testing.T) {
		pool := openReleaseReviewLifecyclePool(t)
		testsupport.ApplySQLFile(t, pool, releaseReviewLifecycleMigrationPath(t, releaseReviewLifecycleDown))
		for _, table := range releaseReviewLifecycleTables {
			assertReleaseReviewLifecycleTableExists(t, pool, table, false)
		}
		assertReleaseReviewLifecycleViewExists(t, pool, false)

		testsupport.ApplySQLFile(t, pool, releaseReviewLifecycleMigrationPath(t, releaseReviewLifecycleUp))
		for _, table := range releaseReviewLifecycleTables {
			assertReleaseReviewLifecycleTableExists(t, pool, table, true)
		}
		assertReleaseReviewLifecycleViewExists(t, pool, true)
	})
}

func openReleaseReviewLifecyclePool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	createReleaseReviewLifecyclePrerequisites(t, pool)
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107UpFile))
	testsupport.ApplySQLFile(t, pool, releaseReviewLifecycleMigrationPath(t, releaseReviewLifecycleUp))
	return pool
}

func createReleaseReviewLifecyclePrerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE users (id BIGINT PRIMARY KEY);
CREATE TABLE contributor_roles (id BIGINT PRIMARY KEY);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY);
CREATE TABLE media_files (
    id BIGINT PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id)
);
CREATE TABLE release_version_notes (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    member_id BIGINT NOT NULL REFERENCES members(id),
    role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
    body_markdown TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT ''
);
CREATE TABLE release_version_media (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
    category TEXT NOT NULL CHECK (
        category IN ('screenshot', 'typesetting_karaoke', 'fun_outtake', 'other')
    )
);`)
	require.NoError(t, err)
}

func seedReleaseReviewLifecycleSources(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO app_users (id, status) VALUES (11, 'active');
INSERT INTO members (id) VALUES (21);
INSERT INTO users (id) VALUES (61);
INSERT INTO contributor_roles (id) VALUES (71);
INSERT INTO release_versions (id) VALUES (31);
INSERT INTO media_assets (id) VALUES (41);
INSERT INTO media_files (id, media_id) VALUES (51, 41);
INSERT INTO release_version_notes (
    id, release_version_id, member_id, role_id, body_markdown, body_html
) VALUES (1001, 31, 21, 71, 'secret markdown', '<p>secret html</p>');
INSERT INTO release_version_media (
    id, release_version_id, media_asset_id, category
) VALUES (2001, 31, 41, 'screenshot');`)
	require.NoError(t, err)
}

func assertReleaseReviewLifecycleHasNoPayloadColumns(t testing.TB, pool *pgxpool.Pool, table string) {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
SELECT column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = $1
ORDER BY ordinal_position`, table)
	require.NoError(t, err)
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var column string
		require.NoError(t, rows.Scan(&column))
		columns = append(columns, column)
	}
	require.NoError(t, rows.Err())
	for _, forbidden := range []string{
		"body", "body_html", "body_markdown", "caption", "file_path",
		"storage_path", "path", "blob", "reason_text",
	} {
		require.NotContains(t, columns, forbidden)
	}
}

func assertReleaseReviewLifecycleTableExists(t testing.TB, pool *pgxpool.Pool, table string, expected bool) {
	t.Helper()
	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regclass($1) IS NOT NULL`, table).Scan(&exists))
	require.Equal(t, expected, exists, table)
}

func assertReleaseReviewLifecycleViewExists(t testing.TB, pool *pgxpool.Pool, expected bool) {
	t.Helper()
	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = current_schema()
      AND table_name = 'release_review_lifecycle_sources'
)`).Scan(&exists))
	require.Equal(t, expected, exists)
}

func readReleaseReviewLifecycleMigration(t testing.TB, name string) string {
	t.Helper()
	content, err := os.ReadFile(releaseReviewLifecycleMigrationPath(t, name))
	require.NoError(t, err, "Release-review lifecycle artifact missing: %s", name)
	return strings.Join(strings.Fields(strings.ToLower(string(content))), " ")
}

func releaseReviewLifecycleMigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
