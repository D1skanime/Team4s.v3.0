package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

func TestReleaseStreamIdentityExplicitSourceAndLegacyCollision(t *testing.T) {
	pool, _ := openEpisodeVersionPublicFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	// A colliding foreign variant ID must never override a canonical release version.
	legacy, err := repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.EqualValues(t, 10, legacy.ID)
	require.Equal(t, "own", legacy.MediaItemID)
	explicit, ok := any(repo).(interface {
		GetReleaseStreamSource(context.Context, int64, ...int64) (*models.ReleaseStreamSource, error)
	})
	require.True(t, ok, "existing resolver must accept an explicit optional variant selector")
	own, err := explicit.GetReleaseStreamSource(ctx, 10, 100)
	require.NoError(t, err)
	require.EqualValues(t, 10, own.ID)
	require.Equal(t, "own", own.MediaItemID)
	_, err = explicit.GetReleaseStreamSource(ctx, 10, 10)
	require.ErrorIs(t, err, repository.ErrNotFound)
	foreign, err := explicit.GetReleaseStreamSource(ctx, 20, 10)
	require.NoError(t, err)
	require.EqualValues(t, 20, foreign.ID)
	_, err = explicit.GetReleaseStreamSource(ctx, 10, 999)
	require.ErrorIs(t, err, repository.ErrNotFound)
	_, err = explicit.GetReleaseStreamSource(ctx, 11, 101)
	require.ErrorIs(t, err, repository.ErrNotFound, "valid variant without stream")
	_, err = pool.Exec(ctx, `INSERT INTO release_streams (id,variant_id,stream_source_id) VALUES (20,101,2),(21,200,2)`)
	require.NoError(t, err)
	equal, err := explicit.GetReleaseStreamSource(ctx, 200, 200)
	require.NoError(t, err)
	require.EqualValues(t, 200, equal.ID)
	second, err := explicit.GetReleaseStreamSource(ctx, 11, 101)
	require.NoError(t, err)
	require.EqualValues(t, 11, second.ID)
	for _, selector := range []int64{0, -1} {
		_, err = explicit.GetReleaseStreamSource(ctx, 10, selector)
		require.ErrorIs(t, err, repository.ErrValidation)
	}
	_, err = explicit.GetReleaseStreamSource(ctx, 10, 100, 101)
	require.ErrorIs(t, err, repository.ErrValidation)
}

func TestReleaseStreamIdentitySnapshotSingleRead(t *testing.T) {
	pool, tr := openEpisodeVersionPublicFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	source, err := repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.Nil(t, source.JellyfinSource)
	require.Len(t, tr.queries, 1)
	_, err = pool.Exec(ctx, `UPDATE stream_sources SET metadata='{"jellyfin_source":{"version":1,"media_source_id":"B","source_path":"/library/B.mkv","streams_complete":true,"subtitle_tracks":[{"index":4},{"index":8}]}}' WHERE id=2`)
	require.NoError(t, err)
	tr.reset()
	source, err = repo.GetReleaseStreamSource(ctx, 10, 100)
	require.NoError(t, err)
	require.NotNil(t, source.JellyfinSource)
	require.Equal(t, "B", *source.MediaSourceID)
	require.Len(t, source.JellyfinSource.SubtitleTracks, 2)
	require.Len(t, tr.queries, 1, "one chosen source query, independent of tracks")
	_, err = pool.Exec(ctx, `INSERT INTO release_variants(id,release_version_id) VALUES (102,10); INSERT INTO release_streams(id,variant_id,stream_source_id) VALUES(0,102,1)`)
	require.NoError(t, err)
	source, err = repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.Equal(t, "own", source.MediaItemID, "variant order precedes stream order")
}
