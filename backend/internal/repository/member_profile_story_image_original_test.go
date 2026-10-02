package repository

// Phase 173-06 Task 2: proves that InsertStoryImageAsset inserts a variant='original'
// media_files row atomically alongside the media_assets row when a true original
// (OriginalFilePath) is supplied, omits it gracefully when not (back-compat with any
// future caller that does not populate it), and that pre-existing (pre-phase) story-image
// rows -- which never had a media_files child -- remain readable exactly as before via
// GetStoryImageAssetByID/GetStoryImageAssetsByMember (D-15: this plan adds a new optional
// write path, it never changes reads of old rows).
//
// Skips cleanly when TEAM4S_PHASE106_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createStoryImageMediaSchema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE media_assets (
	id BIGSERIAL PRIMARY KEY, file_path TEXT, mime_type TEXT, format TEXT, status TEXT,
	owner_member_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE media_files (
	id BIGSERIAL PRIMARY KEY, media_id BIGINT NOT NULL, variant TEXT, path TEXT,
	width INT, height INT, size BIGINT, status TEXT NOT NULL DEFAULT 'ready'
);
`)
	require.NoError(t, err)
}

// TestInsertStoryImageAsset_InsertsOriginalMediaFileRowWhenOriginalFilePathSet covers the
// write side: media_assets.file_path stays the display path, and a sibling media_files
// variant='original' row carries the true (pre-resize) dimensions/size.
func TestInsertStoryImageAsset_InsertsOriginalMediaFileRowWhenOriginalFilePathSet(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createStoryImageMediaSchema(t, pool)
	repo := NewMemberProfileRepository(pool, "http://localhost:8092")
	ctx := context.Background()

	id, err := repo.InsertStoryImageAsset(ctx, models.StoryImageUploadInput{
		FilePath:          "/media/profile/5/story/abc/display.jpg",
		MimeType:          "image/jpeg",
		SizeBytes:         500,
		Width:             1920,
		Height:            1080,
		OwnerMemberID:     5,
		OriginalFilePath:  "/media/profile/5/story/abc/original.png",
		OriginalWidth:     3000,
		OriginalHeight:    2000,
		OriginalSizeBytes: 9000,
	})
	require.NoError(t, err)
	require.NotZero(t, id)

	var assetFilePath string
	require.NoError(t, pool.QueryRow(ctx, `SELECT file_path FROM media_assets WHERE id = $1`, id).Scan(&assetFilePath))
	assert.Equal(t, "/media/profile/5/story/abc/display.jpg", assetFilePath,
		"media_assets.file_path muss die Anzeige-Datei bleiben, nicht das Original")

	var variant, path string
	var width, height int
	var size int64
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT variant, path, width, height, size FROM media_files WHERE media_id = $1
	`, id).Scan(&variant, &path, &width, &height, &size))
	assert.Equal(t, "original", variant)
	assert.Equal(t, "/media/profile/5/story/abc/original.png", path)
	assert.Equal(t, 3000, width)
	assert.Equal(t, 2000, height)
	assert.Equal(t, int64(9000), size)
}

// TestInsertStoryImageAsset_OmitsMediaFilesRowWhenOriginalFilePathEmpty proves the back-compat
// branch: no OriginalFilePath -> no media_files row at all (mirrors AttachUploadedAvatar's
// existing DisplayFilePath-optional pattern from 173-05).
func TestInsertStoryImageAsset_OmitsMediaFilesRowWhenOriginalFilePathEmpty(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createStoryImageMediaSchema(t, pool)
	repo := NewMemberProfileRepository(pool, "http://localhost:8092")
	ctx := context.Background()

	id, err := repo.InsertStoryImageAsset(ctx, models.StoryImageUploadInput{
		FilePath:      "/media/profile/5/story/abc/display.jpg",
		MimeType:      "image/jpeg",
		SizeBytes:     500,
		Width:         1920,
		Height:        1080,
		OwnerMemberID: 5,
	})
	require.NoError(t, err)

	var count int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_files WHERE media_id = $1`, id).Scan(&count))
	assert.Equal(t, int64(0), count, "ohne OriginalFilePath darf keine media_files-Zeile entstehen")
}

// TestGetStoryImageAssetByID_PreExistingRowWithoutMediaFilesStillReadable simulates a
// pre-phase-173-06 story-image row (inserted directly, no media_files child at all -- the
// exact shape every story image had before this plan) and proves both read paths this plan
// did not touch still resolve it unchanged.
func TestGetStoryImageAssetByID_PreExistingRowWithoutMediaFilesStillReadable(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createStoryImageMediaSchema(t, pool)
	repo := NewMemberProfileRepository(pool, "http://localhost:8092")
	ctx := context.Background()

	var preexistingID int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO media_assets (file_path, mime_type, format, status, owner_member_id, created_at)
		VALUES ('/media/profile/9/story/old/original.jpg', 'image/jpeg', 'image', 'ready', 9, NOW())
		RETURNING id
	`).Scan(&preexistingID))

	var mediaFilesCount int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_files WHERE media_id = $1`, preexistingID).Scan(&mediaFilesCount))
	require.Equal(t, int64(0), mediaFilesCount,
		"Testvoraussetzung: die simulierte Alt-Zeile hat kein media_files-Kind")

	ref, err := repo.GetStoryImageAssetByID(ctx, preexistingID)
	require.NoError(t, err)
	require.NotNil(t, ref)
	assert.Equal(t, "/media/profile/9/story/old/original.jpg", ref.FilePath)
	assert.Equal(t, int64(9), ref.OwnerMemberID)

	assets, err := repo.GetStoryImageAssetsByMember(ctx, 9)
	require.NoError(t, err)
	require.Len(t, assets, 1)
	assert.Equal(t, "/media/profile/9/story/old/original.jpg", assets[0].FilePath)
}
