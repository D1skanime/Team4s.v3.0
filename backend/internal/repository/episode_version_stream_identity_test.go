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
	// The old default deliberately remains ambiguous: the foreign variant has the smallest stream ID.
	legacy, err := repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.EqualValues(t, 20, legacy.ID)
	require.Equal(t, "foreign", legacy.MediaItemID)
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
