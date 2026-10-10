package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// openFansubGroupMediaSoftDeleteFixture seeds a minimal fansub_group_media schema
// (the real column set from migrations 0026/0109: group_id, media_id, created_at,
// updated_at, deleted_at, deleted_by_user_id) on top of OpenPhase106Postgres's
// shared fansub_groups/app_users/members/release_versions prerequisites, plus the
// `users`/`media_assets` tables SoftDeleteFansubGroupMedia's own SQL references.
func openFansubGroupMediaSoftDeleteFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE media_assets (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE fansub_group_media (
			group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ,
			deleted_at TIMESTAMPTZ,
			deleted_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
			PRIMARY KEY (group_id, media_id)
		);
	`)
	require.NoError(t, err)
	return pool
}

// TestSoftDeleteReleaseVersionMediaExcludesRowAndOmitsUpdatedAt proves against real
// Postgres, through the new shared execSoftDelete helper, that
// SoftDeleteReleaseVersionMedia (1) marks the targeted relation deleted_at/deleted_by_user_id
// without touching updated_at -- the pre-existing release-media behavior D-14 requires to
// survive the unification unchanged -- and (2) returns ErrNotFound (not a silent no-op
// success) on a second call against the now-deleted relation.
func TestSoftDeleteReleaseVersionMediaExcludesRowAndOmitsUpdatedAt(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	// openReleaseVersionMediaReplaceFixture's hand-built release_version_media table
	// (unlike the real migration 0059 schema) does not include deleted_by_user_id --
	// add it here, scoped to this test only, so SoftDeleteReleaseVersionMedia's
	// unchanged SQL (which sets this column) has something to write to.
	_, err := pool.Exec(ctx, `
		ALTER TABLE release_version_media
			ADD COLUMN deleted_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
	`)
	require.NoError(t, err)

	const relationID int64 = 601
	const deletedByUserID int64 = 2001 // seeded by openReleaseVersionMediaReplaceFixture

	require.NoError(t, repo.SoftDeleteReleaseVersionMedia(ctx, relationID, deletedByUserID))

	var deletedAtIsNull, updatedAtIsNull bool
	var deletedByMatches bool
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT deleted_at IS NULL, updated_at IS NULL, deleted_by_user_id = $2
		FROM release_version_media
		WHERE id = $1
	`, relationID, deletedByUserID).Scan(&deletedAtIsNull, &updatedAtIsNull, &deletedByMatches))

	assert.False(t, deletedAtIsNull, "deleted_at must be set after SoftDeleteReleaseVersionMedia")
	assert.True(t, updatedAtIsNull, "release-version-media soft delete must NOT touch updated_at (D-14: behavior unchanged for this domain)")
	assert.True(t, deletedByMatches, "deleted_by_user_id must record the acting user")

	err = repo.SoftDeleteReleaseVersionMedia(ctx, relationID, deletedByUserID)
	assert.ErrorIs(t, err, ErrNotFound, "a second soft delete of the same relation must return ErrNotFound, not silently succeed")
}

// TestSoftDeleteFansubGroupMediaExcludesRowAndSetsUpdatedAt proves against real
// Postgres, through the shared execSoftDelete helper, that
// SoftDeleteFansubGroupMedia (1) marks the targeted relation deleted_at/deleted_by_user_id
// AND sets updated_at -- the opposite outcome from the release-media variant, proving the
// deliberate per-domain difference (D-14) survived the unification -- and (2) returns
// ErrNotFound on a second call against the now-deleted relation.
func TestSoftDeleteFansubGroupMediaExcludesRowAndSetsUpdatedAt(t *testing.T) {
	pool := openFansubGroupMediaSoftDeleteFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	const groupID int64 = 21
	const mediaID int64 = 701
	var deletedByUserID int64 = 9001

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups(id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO users(id) VALUES ($1)`, deletedByUserID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO media_assets(id) VALUES ($1)`, mediaID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_media(group_id, media_id) VALUES ($1, $2)`, groupID, mediaID)
	require.NoError(t, err)

	require.NoError(t, repo.SoftDeleteFansubGroupMedia(ctx, groupID, mediaID, &deletedByUserID))

	var deletedAtIsNull, updatedAtIsNull bool
	var deletedByMatches bool
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT deleted_at IS NULL, updated_at IS NULL, deleted_by_user_id = $3
		FROM fansub_group_media
		WHERE group_id = $1 AND media_id = $2
	`, groupID, mediaID, deletedByUserID).Scan(&deletedAtIsNull, &updatedAtIsNull, &deletedByMatches))

	assert.False(t, deletedAtIsNull, "deleted_at must be set after SoftDeleteFansubGroupMedia")
	assert.False(t, updatedAtIsNull, "fansub-group-media soft delete must set updated_at (D-14: behavior unchanged for this domain, opposite of release-version-media)")
	assert.True(t, deletedByMatches, "deleted_by_user_id must record the acting user")

	err = repo.SoftDeleteFansubGroupMedia(ctx, groupID, mediaID, &deletedByUserID)
	assert.ErrorIs(t, err, ErrNotFound, "a second soft delete of the same relation must return ErrNotFound, not silently succeed")
}
