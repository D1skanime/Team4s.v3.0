package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestListReleaseVersionImagesCursorDisplayURLFallback proves 177-03-PLAN.md's
// D-19/D-24 fix: ListReleaseVersionImagesCursor (the cursor-paginated "load
// more" path backing ReleaseGallery.tsx's revealAll()) now carries the same
// display->original DisplayURL fallback that loadImages()/imagesQuery() (the
// SSR-initial sibling query) already had, and the pre-existing visibility/
// review-state/soft-delete predicate still excludes an item after the added
// mf_display JOIN (D-19 regression guard).
func TestListReleaseVersionImagesCursorDisplayURLFallback(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		ALTER TABLE members ADD COLUMN display_name TEXT, ADD COLUMN nickname TEXT;
		ALTER TABLE media_assets ADD COLUMN file_path TEXT;
		ALTER TABLE release_versions ADD COLUMN release_id BIGINT;
		CREATE TABLE anime (id BIGINT PRIMARY KEY);
		CREATE TABLE episodes (id BIGINT PRIMARY KEY, anime_id BIGINT);
		CREATE TABLE fansub_releases (id BIGINT PRIMARY KEY, episode_id BIGINT);
		INSERT INTO anime(id) VALUES (1);
		INSERT INTO episodes(id, anime_id) VALUES (2, 1);
		INSERT INTO fansub_releases(id, episode_id) VALUES (3, 2);
		UPDATE release_versions SET release_id = 3 WHERE id = 41;

		-- rvm 602 (media_asset 703) is already ready/public/approved in the base
		-- fixture. Give it BOTH an 'original' and a 'display' media_files row --
		-- the "has a display variant" case.
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(703, 'original', '/test/703-original.jpg', 'ready'),
			(703, 'display', '/test/703-display.jpg', 'ready');

		-- rvm 601 (media_asset 701) starts out processing/private in the base
		-- fixture. Promote it to ready/public/approved with ONLY an 'original'
		-- row (no display row yet, pre-generation state) -- the
		-- "falls back to original" case.
		UPDATE media_assets SET status = 'ready', visibility_id = 2, review_status_id = 2 WHERE id = 701;
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(701, 'original', '/test/701-original.jpg', 'ready');

		-- A third release_version_media row reusing the already ready/public/
		-- approved asset 703, but itself soft-deleted. Proves the unchanged
		-- rvm.deleted_at predicate still excludes it after the mf_display JOIN
		-- addition.
		INSERT INTO release_version_media (
			id, release_version_id, fansub_group_id, media_asset_id, category, sort_order, deleted_at
		) VALUES (603, 41, 21, 703, 'screenshot', 2, NOW());
	`)
	require.NoError(t, err)

	detail := NewReleaseDetailPublicRepository(pool, "")
	page, err := detail.ListReleaseVersionImagesCursor(ctx, 1, 21, 41, "screenshot", "", 20)
	require.NoError(t, err)

	byID := make(map[int64]int, len(page.Items))
	for index, item := range page.Items {
		byID[item.ID] = index
	}

	_, excluded := byID[603]
	require.False(t, excluded, "soft-deleted release_version_media row must stay excluded after the mf_display JOIN addition")

	withDisplayIndex, ok := byID[602]
	require.True(t, ok, "rvm 602 (ready/public/approved) must be present")
	withDisplay := page.Items[withDisplayIndex]
	require.NotNil(t, withDisplay.DisplayURL, "display_url must never be nil when a display row exists")
	require.Contains(t, *withDisplay.DisplayURL, "703-display.jpg")

	fallbackIndex, ok := byID[601]
	require.True(t, ok, "rvm 601 (promoted to ready/public/approved) must be present")
	fallback := page.Items[fallbackIndex]
	require.NotNil(t, fallback.OriginalURL)
	require.NotNil(t, fallback.DisplayURL, "display_url must never be nil as long as an original exists, even pre-backfill")
	require.Equal(t, *fallback.OriginalURL, *fallback.DisplayURL, "no display row yet -> display_url must fall back to original_url")
}
