package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// TestParseSegmentClockSeconds verifies the HH:MM:SS → seconds parser used by
// both the snapshot and the playback sync function.
func TestParseSegmentClockSeconds_VariousFormats(t *testing.T) {
	cases := []struct {
		input    string
		expected *int32
	}{
		{"00:00:30", int32ptr(30)},
		{"00:01:30", int32ptr(90)},
		{"01:30:00", int32ptr(5400)},
		{"1:30", int32ptr(90)},
		{"0:30", int32ptr(30)},
		{"0", int32ptr(0)},
		{"", nil},
		{"invalid", nil},
		{"1:2:3:4", nil},
		{"-1", nil},
	}

	for _, tc := range cases {
		var input *string
		if tc.input != "" {
			s := tc.input
			input = &s
		}
		got := parseSegmentClockSeconds(input)
		if tc.expected == nil && got != nil {
			t.Errorf("parseSegmentClockSeconds(%q): expected nil, got %d", tc.input, *got)
		} else if tc.expected != nil && got == nil {
			t.Errorf("parseSegmentClockSeconds(%q): expected %d, got nil", tc.input, *tc.expected)
		} else if tc.expected != nil && got != nil && *tc.expected != *got {
			t.Errorf("parseSegmentClockSeconds(%q): expected %d, got %d", tc.input, *tc.expected, *got)
		}
	}
}

// openSegmentPlaybackFixture provisions the real Phase-117 Postgres fixture (anime, a theme,
// episodes 1-5, release_variants/stream_sources/release_streams, and the real
// theme_segment_playback_sources table from migration 0054) needed to exercise
// loadThemeSegmentPlaybackSnapshotTx, syncThemeSegmentPlaybackSourceTx, and
// GetSegmentReleaseDuration against real persisted data instead of reading their SQL/Go
// source text.
func openSegmentPlaybackFixture(t *testing.T) (*pgxpool.Pool, *AdminContentRepository) {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `ALTER TABLE stream_sources ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'`)
	require.NoError(t, err)
	seedAutoAssignBaseFixture(t, pool, ctx, 1, 1, 1)
	seedAutoAssignFansubGroup(t, pool, ctx, 1)
	return pool, NewAdminContentRepository(pool)
}

// segmentPlaybackReleaseVersionWithVariant creates a fansub_releases+release_versions row for
// the given episode (1-5), assigns it to fansub group 1, and attaches a real release_variant
// (duration_seconds) with a Jellyfin-backed stream_source/release_stream (externalID) -- the
// exact join chain resolveThemeSegmentReleaseVariantTx/selectReleaseVariantSource walk.
func segmentPlaybackReleaseVersionWithVariant(
	t *testing.T, pool *pgxpool.Pool, ctx context.Context,
	episodeNumber int, variantID, streamSourceID, releaseStreamID int64,
	durationSeconds int32, externalID string,
) int64 {
	t.Helper()
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, int64(100+episodeNumber))
	_, err := pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, 1)`, releaseVersionID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_variants (id, release_version_id, duration_seconds) VALUES ($1, $2, $3)`,
		variantID, releaseVersionID, durationSeconds)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO stream_sources (id, provider_type, external_id, url) VALUES ($1, 'jellyfin', $2, 'https://jellyfin.example')`,
		streamSourceID, externalID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_streams (id, variant_id, stream_source_id) VALUES ($1, $2, $3)`,
		releaseStreamID, variantID, streamSourceID)
	require.NoError(t, err)
	return releaseVersionID
}

// segmentPlaybackReleaseVersionWithoutVariant creates a fansub_releases+release_versions row
// for the given episode with NO release_variant attached -- used to force
// resolveThemeSegmentReleaseVariantTx to resolve nothing, so the jellyfin_theme/uploaded_asset
// precedence branches (not episode_version) genuinely get exercised.
func segmentPlaybackReleaseVersionWithoutVariant(t *testing.T, pool *pgxpool.Pool, ctx context.Context, episodeNumber int) int64 {
	t.Helper()
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, int64(100+episodeNumber))
	_, err := pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, 1)`, releaseVersionID)
	require.NoError(t, err)
	return releaseVersionID
}

// TestLoadThemeSegmentPlaybackSnapshotTx_ResolvesRealReleaseVariant proves, by actually calling
// the real loadThemeSegmentPlaybackSnapshotTx against real Postgres data, that the snapshot's
// duration and variant are genuinely resolved from release_variants/stream_sources via
// resolveThemeSegmentReleaseVariantTx -- not a hardcoded NULL, and not an arbitrary/global pick
// (two distinct release versions of the SAME segment resolve to their OWN distinct
// variant/duration/external-stream-id).
func TestLoadThemeSegmentPlaybackSnapshotTx_ResolvesRealReleaseVariant(t *testing.T) {
	pool, _ := openSegmentPlaybackFixture(t)
	ctx := context.Background()
	const themeID = int64(1)

	segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, 1, 1, 5)

	releaseVersionA := segmentPlaybackReleaseVersionWithVariant(t, pool, ctx, 1, 100, 1000, 1, 1500, "ext-A")
	releaseVersionB := segmentPlaybackReleaseVersionWithVariant(t, pool, ctx, 2, 200, 2000, 2, 2600, "ext-B")

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	snapshotA, err := loadThemeSegmentPlaybackSnapshotTx(ctx, tx, segmentID, releaseVersionA)
	require.NoError(t, err)
	require.NotNil(t, snapshotA)
	require.NotNil(t, snapshotA.PlaybackDuration, "duration_seconds must be resolved from release_variants, not hardcoded NULL")
	require.EqualValues(t, 1500, *snapshotA.PlaybackDuration)
	require.NotNil(t, snapshotA.PlaybackVariantID)
	require.EqualValues(t, 100, *snapshotA.PlaybackVariantID)
	require.NotNil(t, snapshotA.ResolvedJellyfinItem)
	require.Equal(t, "ext-A", *snapshotA.ResolvedJellyfinItem)

	snapshotB, err := loadThemeSegmentPlaybackSnapshotTx(ctx, tx, segmentID, releaseVersionB)
	require.NoError(t, err)
	require.NotNil(t, snapshotB)
	require.NotNil(t, snapshotB.PlaybackDuration)
	require.EqualValues(t, 2600, *snapshotB.PlaybackDuration)
	require.NotNil(t, snapshotB.ResolvedJellyfinItem)
	require.Equal(t, "ext-B", *snapshotB.ResolvedJellyfinItem)

	require.NotEqual(t, *snapshotA.ResolvedJellyfinItem, *snapshotB.ResolvedJellyfinItem,
		"two different release versions of the same shared segment must resolve their OWN distinct variant, proving a real per-release-version join rather than a global/first-match shortcut")
}

// TestSyncThemeSegmentPlaybackSourceTx_PlaybackKindsAndColumns proves, by actually calling the
// real syncThemeSegmentPlaybackSourceTx against real Postgres data and reading back the real
// persisted theme_segment_playback_sources row, that all three documented playback kinds
// (episode_version, jellyfin_theme, uploaded_asset) are genuinely produced by their respective
// precedence scenarios, and that the upsert writes the real columns (release_variant_id,
// jellyfin_item_id, duration_seconds) for each -- not by grepping the Go source for the three
// string literals or the three column names.
func TestSyncThemeSegmentPlaybackSourceTx_PlaybackKindsAndColumns(t *testing.T) {
	const themeID = int64(1)

	t.Run("episode_version: a real release_variant resolves release_variant_id + duration_seconds", func(t *testing.T) {
		pool, repo := openSegmentPlaybackFixture(t)
		ctx := context.Background()

		segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, 1, 1, 5)
		releaseVersionID := segmentPlaybackReleaseVersionWithVariant(t, pool, ctx, 1, 100, 1000, 1, 1500, "ext-A")
		_, err := repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		require.NoError(t, repo.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID))
		require.NoError(t, tx.Commit(ctx))

		var sourceKind string
		var releaseVariantID *int64
		var jellyfinItemID *string
		var durationSeconds *int32
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT source_kind, release_variant_id, jellyfin_item_id, duration_seconds
			FROM theme_segment_playback_sources
			WHERE theme_segment_id = $1 AND release_version_id = $2
		`, segmentID, releaseVersionID).Scan(&sourceKind, &releaseVariantID, &jellyfinItemID, &durationSeconds))

		require.Equal(t, "episode_version", sourceKind)
		require.NotNil(t, releaseVariantID)
		require.EqualValues(t, 100, *releaseVariantID)
		require.Nil(t, jellyfinItemID, "episode_version rows must not carry a jellyfin_item_id")
		require.NotNil(t, durationSeconds)
		require.EqualValues(t, 1500, *durationSeconds)
	})

	t.Run("jellyfin_theme: an explicit jellyfin source_type+ref resolves jellyfin_item_id", func(t *testing.T) {
		pool, repo := openSegmentPlaybackFixture(t)
		ctx := context.Background()

		segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, 1, 1, 5)
		_, err := pool.Exec(ctx, `
			UPDATE theme_segments SET source_type = 'jellyfin_theme', source_ref = 'legacy-item-77' WHERE id = $1
		`, segmentID)
		require.NoError(t, err)
		// No release_variant attached: resolveThemeSegmentReleaseVariantTx resolves nothing, so
		// the jellyfin_theme precedence branch (not episode_version) is the one genuinely exercised.
		releaseVersionID := segmentPlaybackReleaseVersionWithoutVariant(t, pool, ctx, 1)
		_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		require.NoError(t, repo.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID))
		require.NoError(t, tx.Commit(ctx))

		var sourceKind string
		var releaseVariantID *int64
		var jellyfinItemID *string
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT source_kind, release_variant_id, jellyfin_item_id
			FROM theme_segment_playback_sources
			WHERE theme_segment_id = $1 AND release_version_id = $2
		`, segmentID, releaseVersionID).Scan(&sourceKind, &releaseVariantID, &jellyfinItemID))

		require.Equal(t, "jellyfin_theme", sourceKind)
		require.Nil(t, releaseVariantID, "jellyfin_theme rows must not carry a release_variant_id")
		require.NotNil(t, jellyfinItemID)
		require.Equal(t, "legacy-item-77", *jellyfinItemID)
	})

	t.Run("uploaded_asset: a release_asset source_ref matching a real media_assets row resolves the asset", func(t *testing.T) {
		pool, repo := openSegmentPlaybackFixture(t)
		ctx := context.Background()

		_, err := pool.Exec(ctx, `INSERT INTO media_assets (id, file_path) VALUES (5001, 'release-version/41/uploaded-op.mp4')`)
		require.NoError(t, err)

		segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, 1, 1, 5)
		_, err = pool.Exec(ctx, `
			UPDATE theme_segments SET source_type = 'release_asset', source_ref = 'release-version/41/uploaded-op.mp4' WHERE id = $1
		`, segmentID)
		require.NoError(t, err)
		releaseVersionID := segmentPlaybackReleaseVersionWithoutVariant(t, pool, ctx, 1)
		_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		require.NoError(t, repo.syncThemeSegmentPlaybackSourceTx(ctx, tx, segmentID))
		require.NoError(t, tx.Commit(ctx))

		var sourceKind string
		var mediaAssetID *int64
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT source_kind, media_asset_id
			FROM theme_segment_playback_sources
			WHERE theme_segment_id = $1 AND release_version_id = $2
		`, segmentID, releaseVersionID).Scan(&sourceKind, &mediaAssetID))

		require.Equal(t, "uploaded_asset", sourceKind)
		require.NotNil(t, mediaAssetID)
		require.EqualValues(t, 5001, *mediaAssetID)
	})
}

// TestGetSegmentReleaseDuration_ResolvesRealReleaseVariantDuration proves, by actually calling
// the real GetSegmentReleaseDuration repository method against a real seeded release_variant,
// that it genuinely exists AND returns the real persisted duration_seconds -- not by reading the
// Go source for the method's declaration.
func TestGetSegmentReleaseDuration_ResolvesRealReleaseVariantDuration(t *testing.T) {
	pool, repo := openSegmentPlaybackFixture(t)
	ctx := context.Background()

	segmentPlaybackReleaseVersionWithVariant(t, pool, ctx, 3, 300, 3000, 3, 1800, "ext-C")

	duration, err := repo.GetSegmentReleaseDuration(ctx, 1, 1, "v1", 0, 0)
	require.NoError(t, err)
	require.NotNil(t, duration, "GetSegmentReleaseDuration must resolve a real duration from release_variants")
	require.EqualValues(t, 1800, *duration)

	// Episode-range filtering (RESEARCH.md Risk 3): a filter that excludes episode 3 entirely
	// must find no variant, proving the method genuinely applies the range filter rather than
	// returning the first/any match regardless of the requested episode window.
	filteredOut, err := repo.GetSegmentReleaseDuration(ctx, 1, 1, "v1", 4, 5)
	require.NoError(t, err)
	require.Nil(t, filteredOut, "a range that excludes the seeded episode must resolve no duration")
}

func int32ptr(v int32) *int32 { return &v }
