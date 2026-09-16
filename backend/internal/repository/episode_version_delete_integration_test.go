package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// Executes the real deletion SQL, including orphan cleanup, against the guarded
// PostgreSQL fixture. A broken target query or Item-wide deletion must fail.
func TestEpisodeVersionDeletePreservesSiblingSource(t *testing.T) {
	pool := openEpisodeImportSourceFixture(t)
	ctx := context.Background()
	input := siblingSourceInput()
	result, err := NewEpisodeImportRepository(pool).Apply(ctx, input)
	require.NoError(t, err)
	require.EqualValues(t, 2, result.VersionsCreated)

	var firstVariant, secondVariant int64
	require.NoError(t, pool.QueryRow(ctx, "SELECT id FROM release_variants WHERE filename='a.mkv'").Scan(&firstVariant))
	require.NoError(t, pool.QueryRow(ctx, "SELECT id FROM release_variants WHERE filename='b.mp4'").Scan(&secondVariant))
	var siblingBefore string
	require.NoError(t, pool.QueryRow(ctx, `SELECT jsonb_build_object('variant',to_jsonb(rv),'version',to_jsonb(rev),
        'stream',to_jsonb(rs),'source',to_jsonb(ss))::text
        FROM release_variants rv JOIN release_versions rev ON rev.id=rv.release_version_id
        JOIN release_streams rs ON rs.variant_id=rv.id JOIN stream_sources ss ON ss.id=rs.stream_source_id
        WHERE rv.id=$1`, secondVariant).Scan(&siblingBefore))

	repo := NewEpisodeVersionRepository(pool)
	require.NoError(t, repo.Delete(ctx, firstVariant))
	var siblingAfter string
	require.NoError(t, pool.QueryRow(ctx, `SELECT jsonb_build_object('variant',to_jsonb(rv),'version',to_jsonb(rev),
        'stream',to_jsonb(rs),'source',to_jsonb(ss))::text
        FROM release_variants rv JOIN release_versions rev ON rev.id=rv.release_version_id
        JOIN release_streams rs ON rs.variant_id=rv.id JOIN stream_sources ss ON ss.id=rs.stream_source_id
        WHERE rv.id=$1`, secondVariant).Scan(&siblingAfter))
	require.Equal(t, siblingBefore, siblingAfter, "same-Item sibling must remain completely unchanged")
	for _, table := range []string{"release_variants", "release_versions", "release_streams", "stream_sources", "release_version_groups", "release_variant_episodes", "episodes"} {
		var count int
		require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM "+table).Scan(&count))
		require.Equal(t, 1, count, table)
	}
	var sourceID string
	require.NoError(t, pool.QueryRow(ctx, "SELECT metadata#>>'{jellyfin_source,media_source_id}' FROM stream_sources").Scan(&sourceID))
	require.Equal(t, "source-b", sourceID)
	require.ErrorIs(t, repo.Delete(ctx, firstVariant), ErrNotFound)

	// Removing the last remaining version cleans its graph, not the neutral episode.
	require.NoError(t, repo.Delete(ctx, secondVariant))
	for _, table := range []string{"release_variants", "release_versions", "fansub_releases", "release_streams", "stream_sources", "release_version_groups", "release_variant_episodes"} {
		var count int
		require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM "+table).Scan(&count))
		require.Zero(t, count, table)
	}
	var episodes int
	require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM episodes").Scan(&episodes))
	require.Equal(t, 1, episodes)
}

func TestEpisodeVersionDeleteKeepsReferencedStreamSource(t *testing.T) {
	pool := openEpisodeImportSourceFixture(t)
	ctx := context.Background()
	_, err := NewEpisodeImportRepository(pool).Apply(ctx, siblingSourceInput())
	require.NoError(t, err)
	var firstVariant, secondVariant, sharedSource int64
	require.NoError(t, pool.QueryRow(ctx, "SELECT id FROM release_variants WHERE filename='a.mkv'").Scan(&firstVariant))
	require.NoError(t, pool.QueryRow(ctx, "SELECT id FROM release_variants WHERE filename='b.mp4'").Scan(&secondVariant))
	require.NoError(t, pool.QueryRow(ctx, "SELECT stream_source_id FROM release_streams WHERE variant_id=$1", firstVariant).Scan(&sharedSource))
	_, err = pool.Exec(ctx, `INSERT INTO release_streams(variant_id,stream_source_id,jellyfin_item_id)
        VALUES($1,$2,'actual-item')`, secondVariant, sharedSource)
	require.NoError(t, err)

	require.NoError(t, NewEpisodeVersionRepository(pool).Delete(ctx, firstVariant))
	var count int
	require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM stream_sources WHERE id=$1", sharedSource).Scan(&count))
	require.Equal(t, 1, count, "a source still referenced by another variant must not be removed")
	require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM release_streams WHERE variant_id=$1", secondVariant).Scan(&count))
	require.Equal(t, 2, count, "both surviving stream links must remain")
}

func TestEpisodeVersionDeleteUnknownIsNotFound(t *testing.T) {
	pool := openEpisodeImportSourceFixture(t)
	ctx := context.Background()
	require.ErrorIs(t, NewEpisodeVersionRepository(pool).Delete(ctx, 12345), ErrNotFound)
}
