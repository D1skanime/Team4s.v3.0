package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestListPublicFansubMediaDisplayURLFallback proves Site 4's additive
// display_url field (173-08, D-05): listPublicFansubMedia's PublicFansubMediaItem
// carries a server-side display->original fallback. A media_asset with BOTH a
// display and an original media_files row serves display_url pointing at the
// display path; a media_asset with ONLY an original (pre-173-04 backfill state,
// no display row yet) still serves a non-nil display_url that falls back to the
// original path. Reuses the Phase-152 full-real-schema guarded fixture (same
// DSN/pattern as TestFansubPublicProfileQueryBudgetIsConstant, same package).
func TestListPublicFansubMediaDisplayURLFallback(t *testing.T) {
	pool, _ := openPhase152Postgres(t)

	const groupID int64 = 1520900
	const slug = "phase152-display-url-media"
	const withDisplayAssetID int64 = 1520901
	const withoutDisplayAssetID int64 = 1520902

	// The Phase-152 fixture database is NOT per-test schema-isolated (unlike
	// Phase-106/107) -- it carries the full real schema and persists rows
	// across test runs. Defensively clean up this test's own namespaced IDs
	// first so repeated local runs against the same long-lived DB stay safe.
	mustExecPhase152(t, pool, fmt.Sprintf(`
		DELETE FROM fansub_group_media WHERE group_id = %d;
		DELETE FROM media_files WHERE media_id IN (%d, %d);
		DELETE FROM media_assets WHERE id IN (%d, %d);
		DELETE FROM fansub_groups WHERE id = %d;
	`, groupID, withDisplayAssetID, withoutDisplayAssetID, withDisplayAssetID, withoutDisplayAssetID, groupID))

	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status)
			VALUES (%d, '%s', 'Phase152 Display-URL Group', 'active');
		INSERT INTO visibilities (id, name) VALUES (1, 'public') ON CONFLICT (id) DO NOTHING;
		INSERT INTO review_statuses (id, code, label_de) VALUES (2, 'approved', 'Phase152 Approved') ON CONFLICT (id) DO NOTHING;

		-- Asset WITH both a display and an original row.
		INSERT INTO media_assets (id, file_path, mime_type, status, visibility_id, review_status_id)
			VALUES (%d, '/phase152/display-%d-original.jpg', 'image/jpeg', 'ready', 1, 2);
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/display-%d-original.jpg', 'ready'),
			(%d, 'display', '/phase152/display-%d-display.jpg', 'ready');
		INSERT INTO fansub_group_media (group_id, media_id, category)
			VALUES (%d, %d, 'gallery');

		-- Asset with ONLY an original row (pre-173-04 backfill state, no display yet).
		INSERT INTO media_assets (id, file_path, mime_type, status, visibility_id, review_status_id)
			VALUES (%d, '/phase152/legacy-%d-original.jpg', 'image/jpeg', 'ready', 1, 2);
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/legacy-%d-original.jpg', 'ready');
		INSERT INTO fansub_group_media (group_id, media_id, category)
			VALUES (%d, %d, 'gallery');
	`,
		groupID, slug,
		withDisplayAssetID, withDisplayAssetID,
		withDisplayAssetID, withDisplayAssetID,
		withDisplayAssetID, withDisplayAssetID,
		groupID, withDisplayAssetID,
		withoutDisplayAssetID, withoutDisplayAssetID,
		withoutDisplayAssetID, withoutDisplayAssetID,
		groupID, withoutDisplayAssetID,
	))

	repo := NewFansubRepository(pool)
	items, err := repo.listPublicFansubMedia(context.Background(), groupID, nil, nil)
	require.NoError(t, err)
	require.Len(t, items, 2)

	byID := make(map[int64]int, len(items))
	for index, item := range items {
		byID[item.ID] = index
	}

	withDisplay := items[byID[withDisplayAssetID]]
	require.NotNil(t, withDisplay.DisplayURL, "display_url must never be nil when a display row exists")
	require.Contains(t, *withDisplay.DisplayURL, "display-"+fmt.Sprint(withDisplayAssetID)+"-display.jpg")

	withoutDisplay := items[byID[withoutDisplayAssetID]]
	require.NotNil(t, withoutDisplay.OriginalURL)
	require.NotNil(t, withoutDisplay.DisplayURL, "display_url must never be nil as long as an original exists, even pre-backfill")
	require.Equal(t, *withoutDisplay.OriginalURL, *withoutDisplay.DisplayURL,
		"no display row yet -> display_url must fall back to original_url")
}
