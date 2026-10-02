package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestGetPublicGroupBase_PrefersDisplayVariant proves Task 1 of 173-10 (D-02):
// getPublicGroupBase's logo_url/banner_url resolve to the group's own
// 'display' media_files row (keyed on the row's own logo_id/banner_id) when
// one exists, under the SAME field names (no new API field). A group with no
// display row yet (pre-backfill) keeps resolving to the unchanged stored
// logo_url/banner_url column value. Reuses the Phase-152 full-real-schema
// guarded fixture (same DSN/pattern as TestListPublicFansubMediaDisplayURLFallback).
func TestGetPublicGroupBase_PrefersDisplayVariant(t *testing.T) {
	pool, _ := openPhase152Postgres(t)

	const groupID int64 = 1521000
	const logoAssetID int64 = 1521001
	const bannerAssetID int64 = 1521002
	const slug = "phase152-public-group-display-url"

	// Defensive self-cleanup -- this fixture DB is not per-test schema-isolated.
	mustExecPhase152(t, pool, fmt.Sprintf(`
		DELETE FROM media_files WHERE media_id IN (%d, %d);
		DELETE FROM media_assets WHERE id IN (%d, %d);
		DELETE FROM fansub_groups WHERE id = %d;
	`, logoAssetID, bannerAssetID, logoAssetID, bannerAssetID, groupID))

	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO media_assets (id, file_path, mime_type, status, visibility_id, review_status_id)
			VALUES
				(%d, '/phase152/group-logo-%d-original.jpg', 'image/jpeg', 'ready', 1, 2),
				(%d, '/phase152/group-banner-%d-original.jpg', 'image/jpeg', 'ready', 1, 2);
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/group-logo-%d-original.jpg', 'ready'),
			(%d, 'display', '/phase152/group-logo-%d-display.jpg', 'ready');
		-- banner intentionally has NO display row yet (pre-backfill case).
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/group-banner-%d-original.jpg', 'ready');

		INSERT INTO fansub_groups (id, slug, name, status, logo_id, banner_id, logo_url, banner_url)
			VALUES (%d, '%s', 'Phase152 Public Group Display-URL', 'active', %d, %d,
				'/phase152/group-logo-%d-original.jpg', '/phase152/group-banner-%d-original.jpg');
	`,
		logoAssetID, logoAssetID,
		bannerAssetID, bannerAssetID,
		logoAssetID, logoAssetID,
		logoAssetID, logoAssetID,
		bannerAssetID, bannerAssetID,
		groupID, slug, logoAssetID, bannerAssetID,
		logoAssetID, bannerAssetID,
	))

	repo := NewFansubRepository(pool)
	group, err := repo.getPublicGroupBase(context.Background(), slug)
	require.NoError(t, err)
	require.NotNil(t, group)

	require.NotNil(t, group.LogoURL)
	require.Contains(t, *group.LogoURL, fmt.Sprintf("group-logo-%d-display.jpg", logoAssetID),
		"logo_url must prefer the display variant when a display row exists")

	require.NotNil(t, group.BannerURL)
	require.Contains(t, *group.BannerURL, fmt.Sprintf("group-banner-%d-original.jpg", bannerAssetID),
		"banner_url must fall back to the unchanged stored value when no display row exists yet")
}

// TestGetPublicGroupBase_SVGLogoKeepsStoredURL proves the SVG-logo exception
// degrades gracefully: an SVG logo (no display row ever generated for SVG,
// per 173-04) keeps resolving to its stored logo_url unchanged, never a
// broken/nil URL.
func TestGetPublicGroupBase_SVGLogoKeepsStoredURL(t *testing.T) {
	pool, _ := openPhase152Postgres(t)

	const groupID int64 = 1521010
	const logoAssetID int64 = 1521011
	const slug = "phase152-public-group-svg-logo"

	mustExecPhase152(t, pool, fmt.Sprintf(`
		DELETE FROM media_files WHERE media_id = %d;
		DELETE FROM media_assets WHERE id = %d;
		DELETE FROM fansub_groups WHERE id = %d;
	`, logoAssetID, logoAssetID, groupID))

	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO media_assets (id, file_path, mime_type, status, visibility_id, review_status_id)
			VALUES (%d, '/phase152/group-logo-%d.svg', 'image/svg+xml', 'ready', 1, 2);
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/group-logo-%d.svg', 'ready');

		INSERT INTO fansub_groups (id, slug, name, status, logo_id, logo_url)
			VALUES (%d, '%s', 'Phase152 Public Group SVG Logo', 'active', %d, '/phase152/group-logo-%d.svg');
	`,
		logoAssetID, logoAssetID,
		logoAssetID, logoAssetID,
		groupID, slug, logoAssetID, logoAssetID,
	))

	repo := NewFansubRepository(pool)
	group, err := repo.getPublicGroupBase(context.Background(), slug)
	require.NoError(t, err)
	require.NotNil(t, group)

	require.NotNil(t, group.LogoURL)
	require.Contains(t, *group.LogoURL, fmt.Sprintf("group-logo-%d.svg", logoAssetID),
		"SVG logo with no display row must keep resolving to its stored logo_url unchanged")
}
