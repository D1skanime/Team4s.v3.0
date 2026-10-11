package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// openFansubGroupMediaIDFixture seeds the real fansub_group_media column set (migrations
// 0026/0109: group_id, media_id, category, sort_order, uploaded_by_user_id, created_at) on top
// of OpenPhase106Postgres's shared fansub_groups/app_users/members/release_versions
// prerequisites, plus the users/media_assets tables CreateFansubGroupMediaAsset's own SQL
// references. Mirrors openFansubGroupMediaSoftDeleteFixture's shape (media_soft_delete_test.go)
// extended with the three columns CreateFansubGroupMediaAsset's INSERT actually writes.
func openFansubGroupMediaIDFixture(t *testing.T) *pgxpool.Pool {
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
			id BIGSERIAL PRIMARY KEY,
			group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
			category VARCHAR(40) NOT NULL DEFAULT 'other',
			sort_order INTEGER NOT NULL DEFAULT 0,
			uploaded_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ,
			deleted_at TIMESTAMPTZ,
			deleted_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
		);
	`)
	require.NoError(t, err)
	return pool
}

// TestCreateFansubGroupMediaAssetReturnsRealPersistedID proves (180-03 D-14) that
// CreateFansubGroupMediaAsset's returned int64 is the actual id Postgres assigned to the new
// fansub_group_media row -- not merely a non-zero placeholder -- by cross-checking it against a
// real follow-up SELECT, and that a real FK violation still returns (0, non-nil error) with no
// row persisted.
func TestCreateFansubGroupMediaAssetReturnsRealPersistedID(t *testing.T) {
	pool := openFansubGroupMediaIDFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	const fansubGroupID = int64(21)
	const mediaAssetID = int64(9001)
	uploaderUserID := int64(2001)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups(id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO users(id) VALUES ($1)`, uploaderUserID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO media_assets(id) VALUES ($1)`, mediaAssetID)
	require.NoError(t, err)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx)

	returnedID, err := repo.CreateFansubGroupMediaAsset(ctx, tx, FansubGroupMediaCreateInput{
		FansubGroupID:    fansubGroupID,
		MediaAssetID:     mediaAssetID,
		Category:         "gallery",
		SortOrder:        10,
		UploadedByUserID: &uploaderUserID,
	})
	require.NoError(t, err)
	assert.Greater(t, returnedID, int64(0))
	require.NoError(t, tx.Commit(ctx))

	var persistedID int64
	err = pool.QueryRow(ctx, `
		SELECT id FROM fansub_group_media WHERE group_id = $1 AND media_id = $2
	`, fansubGroupID, mediaAssetID).Scan(&persistedID)
	require.NoError(t, err)
	assert.Equal(t, persistedID, returnedID, "returned id must match the actual persisted row, not just be non-zero")

	// Second call with a nonexistent media_assets.id violates the FK -- must return (0, non-nil
	// error) and leave no row behind for this failed attempt.
	tx2, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx2.Rollback(ctx)

	const nonexistentMediaAssetID = int64(999999)
	failedID, err := repo.CreateFansubGroupMediaAsset(ctx, tx2, FansubGroupMediaCreateInput{
		FansubGroupID:    fansubGroupID,
		MediaAssetID:     nonexistentMediaAssetID,
		Category:         "gallery",
		SortOrder:        20,
		UploadedByUserID: &uploaderUserID,
	})
	require.Error(t, err)
	assert.Equal(t, int64(0), failedID)
	_ = tx2.Rollback(ctx)

	var count int
	err = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM fansub_group_media WHERE group_id = $1 AND media_id = $2
	`, fansubGroupID, nonexistentMediaAssetID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count, "no row must be left for the failed FK-violating attempt")
}
